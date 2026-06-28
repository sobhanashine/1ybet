/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
/**
 * One-off: tell Telegram users about the knockout stage updates —
 * live bracket page, tournament roadmap, and doubled points for KO matches.
 *
 * Defaults to DRY-RUN (prints recipients + message, sends nothing).
 *   npx tsx scripts/announce-knockout.ts          # dry-run
 *   npx tsx scripts/announce-knockout.ts --send   # really send
 */
import fs from "fs";
import path from "path";
import Module from "module";

// Mock 'server-only' for Node.js scripts run directly via tsx.
const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (this: any, id: string) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments as any);
};

// Load env from .env.local.
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq !== -1) process.env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
}

const SEND = process.argv.includes("--send");

function buildMessage(appUrl: string): string {
  return [
    "🏆 آپدیت مرحله حذفی جام جهانی اومد!",
    "",
    "سه تا چیز جدید برات اضافه کردیم:",
    "",
    "1️⃣ جدول حذفی زنده 🗂",
    "حالا می‌تونی نتایج زندهٔ تمام بازی‌های مرحله حذفی رو — از یک‌شانزدهم تا فینال — داخل برنامه ببینی.",
    `👉 ${appUrl}/knockout`,
    "",
    "2️⃣ مسیر مرحله حذفی در تورنمنت 🗺",
    "صفحهٔ تورنمنت حالا یه بخش جدید داره که نشون می‌ده الان کجای مرحله حذفی هستیم و بازی‌های مرحلهٔ جاری چیه.",
    `👉 ${appUrl}/tournament`,
    "",
    "3️⃣ امتیاز دوبل برای مرحله حذفی 🔥",
    "از این به بعد پیش‌بینی بازی‌های حذفی دو برابر امتیاز داره:",
    "• نتیجه دقیق: ۲۰ امتیاز",
    "• تفاضل گل درست: ۱۴ امتیاز",
    "• برنده درست: ۱۰ امتیاز",
    "• شرکت: ۴ امتیاز",
    "",
    "جدول تورنمنت هم آپدیت می‌شه 👇",
    `👉 ${appUrl}/leaderboard`,
  ].join("\n");
}

async function main() {
  const { db } = await import("../lib/db/index");
  const { users } = await import("../lib/db/schema");
  const { sendTelegramMessage } = await import("../lib/telegram");
  const { APP_URL } = await import("../lib/config");
  const { isNotNull } = await import("drizzle-orm");

  const recipients = await db
    .select({ id: users.id, name: users.displayName, tg: users.telegramId })
    .from(users)
    .where(isNotNull(users.telegramId));

  const targets = recipients.filter((u) => u.tg);
  const message = buildMessage(APP_URL);

  console.log(`Mode: ${SEND ? "SEND (live)" : "DRY-RUN (nothing sent)"}`);
  console.log(`Recipients (all telegram users): ${targets.length}`);
  console.log("------------------------------------------------------------");
  for (const u of targets) console.log(`- #${u.id} ${u.name ?? "(no name)"}  tg:${u.tg}`);
  console.log("------------------------------------------------------------");
  console.log("Message:\n");
  console.log(message);
  console.log("------------------------------------------------------------");

  if (!SEND) {
    console.log("Dry-run only. Re-run with --send to deliver.");
    process.exit(0);
  }

  let ok = 0;
  let fail = 0;
  for (const u of targets) {
    const sent = await sendTelegramMessage(u.tg!, message);
    if (sent) {
      ok++;
      console.log(`✓ sent to #${u.id} (${u.name ?? "?"})`);
    } else {
      fail++;
      console.log(`✗ FAILED #${u.id} (${u.name ?? "?"})`);
    }
    await new Promise((r) => setTimeout(r, 250)); // gentle on Telegram rate limits
  }
  console.log(`\nDone. Sent: ${ok}, Failed: ${fail}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
