/* eslint-disable @typescript-eslint/no-explicit-any, prefer-rest-params */
/**
 * One-off: remind Telegram users who have NOT joined the prize tournament to
 * come and join. Recipients = users with a telegram_id that are absent from
 * tournament_members.
 *
 * Defaults to DRY-RUN (prints recipients + the message, sends nothing).
 * Pass --send to actually deliver. Always dry-run first.
 *
 *   npx tsx scripts/remind-join-tournament.ts          # dry-run
 *   npx tsx scripts/remind-join-tournament.ts --send   # really send
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
    "سلام 👋",
    "",
    "تورنومنت ویژهٔ جام جهانی ۲۰۲۶ در ۱ای‌بت آمادهٔ شروع است — اما هنوز به ما نپیوسته‌ای!",
    "",
    "🏆 ورودی هر نفر ۱۰۰٬۰۰۰ تومان است و کل جایزه (مجموع ورودی همهٔ شرکت‌کننده‌ها) به نفر اول می‌رسد.",
    "⚽️ شروع رسمی از بازی بلژیک–ایران؛ فقط پیش‌بینی‌های همین بازی به بعد در جدول تورنومنت حساب می‌شود.",
    "",
    "همین حالا بیا و ثبت‌نام کن تا جا نمونی:",
    `👉 ${appUrl}/tournament`,
    "",
    "❓ هر سوالی دربارهٔ برنامه داشتی، از ربات پشتیبانی ما بپرس:",
    "@WCC2026bettfaqbot",
  ].join("\n");
}

async function main() {
  const { db } = await import("../lib/db/index");
  const { users, tournamentMembers } = await import("../lib/db/schema");
  const { sendTelegramMessage } = await import("../lib/telegram");
  const { APP_URL } = await import("../lib/config");
  const { isNotNull, notInArray } = await import("drizzle-orm");

  // tournament_members.userId is the PK = the set of joined users.
  const memberRows = await db
    .select({ userId: tournamentMembers.userId })
    .from(tournamentMembers);
  const memberIds = memberRows.map((r) => r.userId);

  const recipients = await db
    .select({ id: users.id, name: users.displayName, tg: users.telegramId })
    .from(users)
    .where(
      memberIds.length
        ? (notInArray(users.id, memberIds) as any) && isNotNull(users.telegramId)
        : isNotNull(users.telegramId),
    );

  // Belt-and-suspenders filter (the && above only keeps the last clause).
  const memberSet = new Set(memberIds);
  const targets = recipients.filter((u) => u.tg && !memberSet.has(u.id));

  const message = buildMessage(APP_URL);

  console.log(`Mode: ${SEND ? "SEND (live)" : "DRY-RUN (nothing sent)"}`);
  console.log(`Recipients (telegram users not in tournament): ${targets.length}`);
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
