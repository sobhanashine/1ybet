/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
/**
 * One-off Telegram announcement for the final tournament results.
 *
 * Defaults to a dry run: it prints the final recipient count and message but
 * sends nothing. Pass --send only after the message and count are approved.
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
const WINNER_CARD = "۵۰۴۷-۰۶۱۱-۱۴۱۶-۳۷۲۴";

function buildMessage(name: string | null, winnerName: string, appUrl: string): string {
  const greeting = name ? `سلام ${name} عزیز 👋` : "سلام 👋";
  return [
    greeting,
    "",
    "🏆 نتایج نهایی تورنمنت جام جهانی ۱ای‌بت اعلام شد!",
    `🥇 برنده نهایی: ${winnerName}`,
    "",
    "برای دیدن رتبه و امتیاز نهایی‌ات، روی دکمهٔ زیر بزن.",
    "",
    "💳 پرداخت ورودی تورنمنت",
    "اگر در تورنمنت شرکت کرده‌ای و هنوز ورودی ۱۰۰٬۰۰۰ تومانی خودت را پرداخت نکرده‌ای، آن را به کارت برنده واریز کن:",
    WINNER_CARD,
    "",
    "شماره کارت داخل پاپ‌آپ برنامه هم در دسترس است.",
  ].join("\n");
}

async function main() {
  const { db } = await import("../lib/db/index");
  const { users } = await import("../lib/db/schema");
  const { sendTelegramMessage } = await import("../lib/telegram");
  const { APP_URL } = await import("../lib/config");
  const { getStartMatch, getTournamentLeaderboard } = await import("../lib/tournament");
  const { isNotNull } = await import("drizzle-orm");

  const startMatch = await getStartMatch();
  const winner = startMatch
    ? (await getTournamentLeaderboard(startMatch.kickoffAt))[0]?.displayName
    : null;
  const winnerName = winner ?? "برنده نهایی تورنمنت";

  const usersWithTelegram = await db
    .select({ id: users.id, name: users.displayName, telegramId: users.telegramId })
    .from(users)
    .where(isNotNull(users.telegramId));
  const recipients = usersWithTelegram.filter((user) => user.telegramId);
  const replyMarkup = {
    inline_keyboard: [[{ text: "🏆 دیدن نتایج نهایی", web_app: { url: `${APP_URL}/leaderboard` } }]],
  };

  console.log(`Mode: ${SEND ? "SEND (live)" : "DRY-RUN (nothing sent)"}`);
  console.log(`Recipients (all Telegram users): ${recipients.length}`);
  console.log("------------------------------------------------------------");
  console.log("Message preview:\n");
  console.log(buildMessage("نام کاربر", winnerName, APP_URL));
  console.log("------------------------------------------------------------");

  if (!SEND) {
    console.log("Dry-run only. Re-run with --send to deliver.");
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const user of recipients) {
    const ok = await sendTelegramMessage(
      user.telegramId!,
      buildMessage(user.name, winnerName, APP_URL),
      replyMarkup,
    );
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
