/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
import fs from "fs";
import path from "path";
import Module from "module";

// Mock 'server-only' for Node.js scripts run directly via tsx
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (this: any, id: string) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments as any);
};

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, "utf-8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const firstEq = trimmed.indexOf("=");
      if (firstEq !== -1) {
        const key = trimmed.slice(0, firstEq).trim();
        process.env[key] = trimmed.slice(firstEq + 1).trim();
      }
    }
  }
}

// Send a sample prediction-reminder email to verify the email pipeline works.
// Usage: npx tsx scripts/test-reminder-email.ts [recipient@example.com]
async function main() {
  const to = process.argv[2] || "sobhan.ashineh1@gmail.com";

  if (!process.env.RESEND_API_KEY) {
    console.error(
      "✗ RESEND_API_KEY is not set in .env.local — email cannot be sent.\n" +
        "  Create a free key at https://resend.com/api-keys and add it to .env.local.\n" +
        "  Note: with the default onboarding@resend.dev sender, Resend only delivers\n" +
        "  to the email address that owns your Resend account.",
    );
    process.exit(1);
  }

  const { sendEmail } = await import("../lib/email");
  const { reminderEmailHtml } = await import("../lib/reminders");

  const html = reminderEmailHtml({
    home: "ایران",
    away: "آمریکا",
    time: "۲۲:۳۰",
  });

  console.log(`Sending sample reminder email to: ${to} ...`);
  console.log(`From: ${process.env.RESEND_FROM ?? "onboarding@resend.dev"}`);

  const ok = await sendEmail(to, "⏰ یادآوری پیش‌بینی", html);

  if (ok) {
    console.log("✓ Sent. Check the inbox (and spam folder).");
  } else {
    console.error(
      "✗ sendEmail returned false. Likely causes:\n" +
        "  - The recipient is not allowed for the onboarding@resend.dev sender\n" +
        "    (verify a domain in Resend, or send to your Resend account email).\n" +
        "  - Invalid RESEND_API_KEY.",
    );
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error sending test reminder email:", err);
  process.exit(1);
});
