import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null; // email is optional — silently skip if unconfigured
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const resend = getClient();
  if (!resend) return false;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  try {
    // The Resend SDK does NOT throw on API errors (e.g. recipient not allowed on
    // the free sender) — it returns them in `error`. Check it explicitly.
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("Resend send error:", error.name, "-", error.message);
      return false;
    }
    if (data?.id) console.log("Resend accepted message id:", data.id);
    return true;
  } catch (e) {
    console.error("Resend threw:", e instanceof Error ? e.message : String(e));
    return false;
  }
}

import { APP_URL } from "./config";
import { teamFa } from "./teams-fa";

export function predictionResultEmailHtml(opts: {
  displayName: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  predHome: number;
  predAway: number;
  points: number;
}): string {
  const home = teamFa(opts.homeTeam);
  const away = teamFa(opts.awayTeam);
  
  let message = "";
  if (opts.points === 10) {
    message = "🔥 فوق‌العاده بود! نتیجه دقیق را حدس زدی و ۱۰ امتیاز کامل گرفتی!";
  } else if (opts.points === 7) {
    message = "👏 آفرین! تفاضل گل و نتیجه بازی را درست حدس زدی و ۷ امتیاز گرفتی!";
  } else if (opts.points === 5) {
    message = "👍 خوب بود! برنده بازی را درست حدس زدی و ۵ امتیاز گرفتی!";
  } else {
    message = "پیش‌بینی‌ات درست نبود ولی ۲ امتیاز مشارکت را گرفتی. برای بازی بعدی بیشتر تلاش کن! ⚽";
  }

  return `
  <div dir="rtl" style="background:#0b1410;padding:24px;font-family:Tahoma,Arial,sans-serif;text-align:right;">
    <div style="max-width:480px;margin:0 auto;background:#11201a;border-radius:16px;padding:28px;color:#e7f5ee;border:1px solid rgba(22,224,127,0.15);">
      <h1 style="margin:0 0 8px;font-size:20px;color:#16e07f;text-align:center;">🏆 نتیجه پیش‌بینی مسابقه</h1>
      <p style="margin:0 0 20px;color:#9fb4a8;font-size:14px;line-height:1.9;text-align:center;">
        سلام ${opts.displayName} عزیز، بازی مورد نظر به پایان رسید و امتیاز شما محاسبه شد.
      </p>
      
      <div style="background:#0b1410;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;text-align:center;margin-bottom:22px">
        <div style="font-size:13px;color:#9fb4a8;margin-bottom:8px;">نتیجه واقعی مسابقه</div>
        <div style="font-size:20px;font-weight:black;color:#fff;letter-spacing:1px;">
          ${home} ${opts.homeScore} - ${opts.awayScore} ${away}
        </div>
      </div>

      <div style="background:#0b1410;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;text-align:center;margin-bottom:22px">
        <div style="font-size:13px;color:#9fb4a8;margin-bottom:6px;">پیش‌بینی شما</div>
        <div style="font-size:18px;font-weight:bold;color:#16e07f;letter-spacing:1px;">
          ${opts.predHome} - ${opts.predAway}
        </div>
      </div>

      <div style="background:rgba(22,224,127,0.08);border:1px dashed #16e07f;border-radius:12px;padding:18px;text-align:center;margin-bottom:22px">
        <div style="font-size:13px;color:#9fb4a8;margin-bottom:6px;">امتیاز کسب شده</div>
        <div style="font-size:28px;font-weight:black;color:#16e07f;margin-bottom:4px;">
          ${opts.points} امتیاز
        </div>
        <div style="color:#e7f5ee;font-size:13px;line-height:1.6;">
          ${message}
        </div>
      </div>

      <a href="${APP_URL}" style="display:block;background:#16e07f;color:#08140e;text-decoration:none;text-align:center;padding:13px;border-radius:10px;font-weight:bold;font-size:15px">
        مشاهده جدول امتیازات
      </a>
      
      <p style="margin:22px 0 0;color:#6b8078;font-size:11px;text-align:center">
        ۱ای‌بت · بازی پیش‌بینی جام جهانی ۲۰۲۶
      </p>
    </div>
  </div>`;
}

