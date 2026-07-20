/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
/**
 * Ask tournament members to self-report their entry-fee payment status.
 *
 * Arash is intentionally excluded. Defaults to a dry run; pass --send only
 * after the exact recipients and message have been approved.
 */
import fs from "fs";
import path from "path";
import Module from "module";

const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (this: any, id: string) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments as any);
};

const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsAt = trimmed.indexOf("=");
    if (equalsAt !== -1) {
      process.env[trimmed.slice(0, equalsAt).trim()] = trimmed.slice(equalsAt + 1).trim();
    }
  }
}

const SEND = process.argv.includes("--send");
const EXCLUDED_NAMES = new Set(["arash", "arashkind92"]);

function normalize(value: string | null): string {
  return value?.trim().toLocaleLowerCase("en-US").replace(/^@/, "") ?? "";
}

function buildMessage(name: string | null): string {
  const greeting = name ? `سلام ${name} عزیز 👋` : "سلام 👋";
  return [
    greeting,
    "",
    "برای نهایی‌کردن حساب ورودی تورنومنت، لطفاً وضعیت پرداخت ۱۰۰٬۰۰۰ تومان را مشخص کن:",
    "",
    "آیا مبلغ را به کارت برنده واریز کرده‌ای؟",
    "",
    "فقط یکی از دکمه‌های زیر را بزن؛ جوابت در لیست مدیریت ثبت می‌شود. اگر بعداً پرداخت کردی، می‌توانی دوباره همین‌جا گزینهٔ پرداخت کردم را بزنی.",
  ].join("\n");
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured");

  const { db } = await import("../lib/db/index");
  const { tournamentMembers, users } = await import("../lib/db/schema");
  const { sendTelegramMessage } = await import("../lib/telegram");
  const { buildPaymentCallbackData } = await import("../lib/tournament-payment");
  const { eq } = await import("drizzle-orm");

  const members = await db
    .select({
      id: users.id,
      name: users.displayName,
      telegramId: users.telegramId,
      telegramUsername: users.telegramUsername,
    })
    .from(tournamentMembers)
    .innerJoin(users, eq(users.id, tournamentMembers.userId));

  const excluded = members.filter((member) =>
    EXCLUDED_NAMES.has(normalize(member.name)) || EXCLUDED_NAMES.has(normalize(member.telegramUsername)),
  );
  const unreachable = members.filter((member) => !member.telegramId && !excluded.includes(member));
  const recipients = members.filter(
    (member) => member.telegramId && !excluded.includes(member),
  );

  console.log(`Mode: ${SEND ? "SEND (live)" : "DRY-RUN (nothing sent)"}`);
  console.log(`Tournament members: ${members.length}`);
  console.log(`Recipients: ${recipients.length}`);
  console.log(`Excluded by request: ${excluded.map((member) => `${member.name} (@${member.telegramUsername})`).join(", ") || "none"}`);
  console.log(`No Telegram connection: ${unreachable.map((member) => member.name).join(", ") || "none"}`);
  console.log("Recipients list:");
  for (const member of recipients) {
    console.log(`- ${member.name ?? "بدون نام"}${member.telegramUsername ? ` (@${member.telegramUsername})` : ""}`);
  }
  console.log("------------------------------------------------------------");
  console.log("Message preview:\n");
  console.log(buildMessage("نام کاربر"));
  console.log("\nButtons: [✅ بله، پرداخت کردم] [❌ نه، هنوز پرداخت نکردم]");
  console.log("------------------------------------------------------------");

  if (!SEND) {
    console.log("Dry-run only. Re-run with --send after explicit approval.");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const member of recipients) {
    const telegramId = member.telegramId!;
    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: "✅ بله، پرداخت کردم",
            callback_data: buildPaymentCallbackData(telegramId, "PAID", token),
          },
        ],
        [
          {
            text: "❌ نه، هنوز پرداخت نکردم",
            callback_data: buildPaymentCallbackData(telegramId, "UNPAID", token),
          },
        ],
      ],
    };
    const ok = await sendTelegramMessage(telegramId, buildMessage(member.name), replyMarkup);
    if (ok) sent++;
    else failed++;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(`Done. Sent: ${sent}, failed: ${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
