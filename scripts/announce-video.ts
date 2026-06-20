/**
 * One-off broadcast: tell every user who has a Telegram chat that the
 * tournament registration-guide video is available.
 *
 *   Dry run (default — sends NOTHING, just prints recipients + message):
 *     npx tsx scripts/announce-video.ts
 *   Live test to admins only:
 *     npx tsx scripts/announce-video.ts --send --admins
 *   Live test to one chat:
 *     npx tsx scripts/announce-video.ts --send --only <telegramId>
 *   Send to everyone with a Telegram id:
 *     npx tsx scripts/announce-video.ts --send
 *
 * Telegram is sent by calling the Bot API directly (lib/telegram imports
 * "server-only" and can't be imported from a tsx script). The DB access mirrors
 * scripts/resync.ts (dynamic import after loading env).
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { isNotNull } from "drizzle-orm";

const APP_URL =
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://1ybet.vercel.app";
const TOURNAMENT_URL = `${APP_URL}/tournament`;

function messageText(name: string | null): string {
  const hi = name ? `${name} عزیز، ` : "";
  return (
    `🎬 <b>ویدیوی راهنمای تورنمنت اضافه شد!</b>\n\n` +
    `${hi}حالا توی صفحه‌ی تورنمنت یه ویدیوی کوتاه گذاشتیم که نشون می‌ده ` +
    `چطور ثبت‌نام کنی و شرایط تورنمنت چیه.\n\n` +
    `🏆 ورودی هر نفر ۱۰۰٬۰۰۰ تومان — کل مبلغ ورودی‌ها به نفر اول می‌رسه!\n\n` +
    `👇 برای دیدن ویدیو روی دکمه بزن.`
  );
}

// Inline button that opens the tournament page inside Telegram as a Mini App
// (so the user stays auto-logged-in via initData).
const replyMarkup = {
  inline_keyboard: [
    [{ text: "🎬 دیدن ویدیوی راهنما", web_app: { url: TOURNAMENT_URL } }],
  ],
};

async function sendOne(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; retryAfter?: number; error?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      reply_markup: replyMarkup,
      disable_web_page_preview: true,
    }),
  });
  if (res.ok) return { ok: true };
  const body = await res.text();
  if (res.status === 429) {
    try {
      const j = JSON.parse(body);
      return { ok: false, retryAfter: j.parameters?.retry_after ?? 2 };
    } catch {
      return { ok: false, retryAfter: 2 };
    }
  }
  return { ok: false, error: `${res.status} ${body}` };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const adminsOnly = args.includes("--admins");
  const onlyIdx = args.indexOf("--only");
  const onlyId = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  let recipients = await db
    .select({
      telegramId: users.telegramId,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
    })
    .from(users)
    .where(isNotNull(users.telegramId));

  if (adminsOnly) recipients = recipients.filter((r) => r.isAdmin);
  if (onlyId) recipients = recipients.filter((r) => r.telegramId === onlyId);

  console.log(`Telegram recipients: ${recipients.length}`);
  console.log("─".repeat(50));
  console.log("Message preview (HTML):\n");
  console.log(messageText("«نام کاربر»"));
  console.log(`\nButton → web_app: ${TOURNAMENT_URL}`);
  console.log("─".repeat(50));

  if (!send) {
    console.log(
      "\nDRY RUN — nothing was sent. Re-run with --send to deliver.\n" +
        "  --admins        send to admins only (good for a live test)\n" +
        "  --only <id>     send to a single Telegram chat id",
    );
    process.exit(0);
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");

  let sent = 0;
  let failed = 0;
  for (const r of recipients) {
    const chatId = r.telegramId!;
    let result = await sendOne(token, chatId, messageText(r.displayName));
    if (!result.ok && result.retryAfter) {
      console.log(`  rate-limited, waiting ${result.retryAfter}s…`);
      await sleep((result.retryAfter + 1) * 1000);
      result = await sendOne(token, chatId, messageText(r.displayName));
    }
    if (result.ok) {
      sent++;
    } else {
      failed++;
      console.error(`  ✗ ${chatId}: ${result.error ?? "rate limit"}`);
    }
    await sleep(60); // ~16 msg/s, well under Telegram's limit
  }

  console.log("─".repeat(50));
  console.log(`Done. Sent: ${sent}, Failed: ${failed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
