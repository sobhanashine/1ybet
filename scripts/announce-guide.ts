/**
 * One-off broadcast: tell users the tournament registration-guide video now
 * pops up when they open the app.
 *
 * Reaches BOTH channels — a user with a Telegram chat AND a valid email gets
 * both:
 *   - Telegram: everyone with a `telegram_id`.
 *   - Email: everyone whose `email` looks real (contains "@"; some rows store
 *     the literal string "NULL").
 *
 *   Dry run (default — sends NOTHING, prints recipients + previews):
 *     npx tsx scripts/announce-guide.ts
 *   Live test to admins only (both channels):
 *     npx tsx scripts/announce-guide.ts --send --admins
 *   Live test to one Telegram chat:
 *     npx tsx scripts/announce-guide.ts --send --only <telegramId>
 *   Restrict channels:
 *     npx tsx scripts/announce-guide.ts --send --telegram-only
 *     npx tsx scripts/announce-guide.ts --send --email-only
 *   Send to everyone on both channels:
 *     npx tsx scripts/announce-guide.ts --send
 *
 * Telegram is sent via the Bot API directly and email via Resend directly,
 * because lib/telegram and lib/email import "server-only" (can't be statically
 * imported from a tsx script). DB access mirrors scripts/announce-video.ts.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { Resend } from "resend";

const APP_URL =
  process.env.APP_URL ??
  process.env.NEXT_PUBLIC_APP_URL ??
  "https://1ybet.vercel.app";
const TOURNAMENT_URL = `${APP_URL}/tournament`;

// ── Telegram message ─────────────────────────────────────────────────────────
function telegramText(name: string | null): string {
  const hi = name ? `${name} عزیز، ` : "";
  return (
    `🎬 <b>ویدیوی راهنمای تورنمنت</b>\n\n` +
    `${hi}حالا وقتی اپ رو باز می‌کنی، یه ویدیوی کوتاه راهنما برات نشون داده می‌شه ` +
    `که توضیح می‌ده چطور توی تورنمنت ثبت‌نام کنی و شرایطش چیه.\n\n` +
    `می‌تونی همون‌جا ببینیش یا ببندیش — انتخاب با خودته.\n\n` +
    `🏆 ورودی هر نفر ۱۰۰٬۰۰۰ تومان — کل مبلغ ورودی‌ها به نفر اول می‌رسه!\n\n` +
    `👇 برای دیدن ویدیو روی دکمه بزن.`
  );
}

// Inline button opens the tournament page inside Telegram as a Mini App (keeps
// the user auto-logged-in via initData).
const replyMarkup = {
  inline_keyboard: [
    [{ text: "🎬 دیدن ویدیوی راهنما", web_app: { url: TOURNAMENT_URL } }],
  ],
};

async function sendTelegram(
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

// ── Email message ────────────────────────────────────────────────────────────
const EMAIL_SUBJECT = "🎬 ویدیوی راهنمای تورنمنت اضافه شد";

function emailHtml(name: string | null): string {
  const hi = name ? `${name} عزیز، ` : "";
  return `
  <div dir="rtl" style="background:#0b1410;padding:24px;font-family:Tahoma,Arial,sans-serif;text-align:right;">
    <div style="max-width:480px;margin:0 auto;background:#11201a;border-radius:16px;padding:28px;color:#e7f5ee;border:1px solid rgba(22,224,127,0.15);">
      <h1 style="margin:0 0 8px;font-size:20px;color:#16e07f;text-align:center;">🎬 ویدیوی راهنمای تورنمنت</h1>
      <p style="margin:0 0 18px;color:#9fb4a8;font-size:14px;line-height:1.9;text-align:center;">
        ${hi}حالا وقتی اپ را باز می‌کنی، یک ویدیوی کوتاه راهنما نشانت داده می‌شود که
        توضیح می‌دهد چطور در تورنمنت ثبت‌نام کنی و شرایطش چیست. می‌توانی همان‌جا ببینی یا ببندی.
      </p>

      <div style="background:rgba(22,224,127,0.08);border:1px dashed #16e07f;border-radius:12px;padding:18px;text-align:center;margin-bottom:22px">
        <div style="font-size:15px;font-weight:bold;color:#16e07f;margin-bottom:6px;">🏆 تورنمنت جایزه‌دار</div>
        <div style="color:#e7f5ee;font-size:13px;line-height:1.7;">
          ورودی هر نفر ۱۰۰٬۰۰۰ تومان — کل مبلغ ورودی‌ها به نفر اول می‌رسد!
        </div>
      </div>

      <a href="${TOURNAMENT_URL}" style="display:block;background:#16e07f;color:#08140e;text-decoration:none;text-align:center;padding:13px;border-radius:10px;font-weight:bold;font-size:15px">
        دیدن ویدیوی راهنما
      </a>

      <p style="margin:22px 0 0;color:#6b8078;font-size:11px;text-align:center">
        ۱ای‌بت · بازی پیش‌بینی جام جهانی ۲۰۲۶
      </p>
    </div>
  </div>`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const send = args.includes("--send");
  const adminsOnly = args.includes("--admins");
  const telegramOnly = args.includes("--telegram-only");
  const emailOnly = args.includes("--email-only");
  const onlyIdx = args.indexOf("--only");
  const onlyId = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

  const doTelegram = !emailOnly;
  const doEmail = !telegramOnly;

  const { db } = await import("@/lib/db");
  const { users } = await import("@/lib/db/schema");

  const all = await db
    .select({
      telegramId: users.telegramId,
      email: users.email,
      displayName: users.displayName,
      isAdmin: users.isAdmin,
    })
    .from(users);

  let pool = all;
  if (adminsOnly) pool = pool.filter((r) => r.isAdmin);

  // Telegram recipients: a real chat id.
  let tgRecipients = pool.filter((r) => !!r.telegramId);
  if (onlyId) tgRecipients = tgRecipients.filter((r) => r.telegramId === onlyId);

  // Email recipients: an address that actually looks like one.
  const emailRecipients = pool.filter(
    (r) => typeof r.email === "string" && r.email.includes("@"),
  );

  console.log(`Telegram recipients: ${doTelegram ? tgRecipients.length : 0}`);
  console.log(`Email recipients:    ${doEmail ? emailRecipients.length : 0}`);
  console.log("─".repeat(60));
  if (doTelegram) {
    console.log("Telegram preview (HTML):\n");
    console.log(telegramText("«نام کاربر»"));
    console.log(`\nButton → web_app: ${TOURNAMENT_URL}`);
    console.log("─".repeat(60));
  }
  if (doEmail) {
    console.log(`Email subject: ${EMAIL_SUBJECT}`);
    console.log(`Email link → ${TOURNAMENT_URL}`);
    console.log("─".repeat(60));
  }

  if (!send) {
    console.log(
      "\nDRY RUN — nothing was sent. Re-run with --send to deliver.\n" +
        "  --admins         restrict to admins only (good for a live test)\n" +
        "  --only <id>      single Telegram chat id\n" +
        "  --telegram-only  skip email\n" +
        "  --email-only     skip Telegram",
    );
    process.exit(0);
  }

  // ── Telegram delivery ──────────────────────────────────────────────────────
  let tgSent = 0;
  let tgFailed = 0;
  if (doTelegram) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    for (const r of tgRecipients) {
      const chatId = r.telegramId!;
      let result = await sendTelegram(token, chatId, telegramText(r.displayName));
      if (!result.ok && result.retryAfter) {
        console.log(`  rate-limited, waiting ${result.retryAfter}s…`);
        await sleep((result.retryAfter + 1) * 1000);
        result = await sendTelegram(token, chatId, telegramText(r.displayName));
      }
      if (result.ok) {
        tgSent++;
      } else {
        tgFailed++;
        console.error(`  ✗ tg ${chatId}: ${result.error ?? "rate limit"}`);
      }
      await sleep(60); // ~16 msg/s, under Telegram's limit
    }
  }

  // ── Email delivery ─────────────────────────────────────────────────────────
  let emSent = 0;
  let emFailed = 0;
  if (doEmail) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("Missing RESEND_API_KEY");
    const resend = new Resend(key);
    const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
    for (const r of emailRecipients) {
      try {
        const { data, error } = await resend.emails.send({
          from,
          to: r.email!,
          subject: EMAIL_SUBJECT,
          html: emailHtml(r.displayName),
        });
        if (error) {
          emFailed++;
          console.error(`  ✗ email ${r.email}: ${error.name} - ${error.message}`);
        } else {
          emSent++;
          if (data?.id) console.log(`  ✓ email ${r.email} (${data.id})`);
        }
      } catch (e) {
        emFailed++;
        console.error(
          `  ✗ email ${r.email}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      await sleep(550); // Resend free tier ~2 req/s
    }
  }

  console.log("─".repeat(60));
  console.log(`Telegram — sent: ${tgSent}, failed: ${tgFailed}`);
  console.log(`Email    — sent: ${emSent}, failed: ${emFailed}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
