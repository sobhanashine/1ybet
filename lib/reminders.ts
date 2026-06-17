import "server-only";
import { and, eq, gt, lte, isNotNull } from "drizzle-orm";
import { db } from "./db";
import {
  matches,
  predictions,
  users,
  pushSubscriptions,
  reminderLog,
} from "./db/schema";
import { sendPushToUser } from "./push";
import { sendEmail } from "./email";
import { teamFa } from "./teams-fa";
import { formatTime } from "./format";
import { APP_URL } from "./config";

const WINDOW_MIN = 60;

/** Branded RTL HTML body for the "you haven't predicted yet" reminder email. */
export function reminderEmailHtml(opts: {
  home: string;
  away: string;
  time: string;
  url?: string;
}): string {
  const url = opts.url ?? APP_URL;
  return `
  <div dir="rtl" style="background:#0b1410;padding:24px;font-family:Tahoma,Arial,sans-serif">
    <div style="max-width:480px;margin:0 auto;background:#11201a;border-radius:16px;padding:28px;color:#e7f5ee">
      <h1 style="margin:0 0 8px;font-size:20px;color:#16e07f">⏰ یادآوری پیش‌بینی</h1>
      <p style="margin:0 0 20px;color:#9fb4a8;font-size:14px;line-height:1.9">
        هنوز این بازی را پیش‌بینی نکرده‌ای! کمتر از یک ساعت تا شروع مسابقه باقی مانده — قبل از سوت آغاز، نتیجه را ثبت کن.
      </p>
      <div style="background:#0b1410;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;text-align:center;margin-bottom:22px">
        <div style="font-size:18px;font-weight:bold">${opts.home} 🆚 ${opts.away}</div>
        <div style="margin-top:6px;color:#9fb4a8;font-size:13px">ساعت ${opts.time}</div>
      </div>
      <a href="${url}" style="display:block;background:#16e07f;color:#08140e;text-decoration:none;text-align:center;padding:13px;border-radius:10px;font-weight:bold;font-size:15px">
        ثبت پیش‌بینی
      </a>
      <p style="margin:22px 0 0;color:#6b8078;font-size:11px;text-align:center">
        ۱ای‌بت · بازی پیش‌بینی جام جهانی ۲۰۲۶
      </p>
    </div>
  </div>`;
}

async function claim(
  userId: number,
  matchId: number,
  channel: "push" | "email",
): Promise<boolean> {
  const res = await db
    .insert(reminderLog)
    .values({ userId, matchId, channel })
    .onConflictDoNothing()
    .returning({ userId: reminderLog.userId });
  return res.length > 0;
}

/** Notify opted-in users about matches kicking off soon they haven't predicted. */
export async function runReminders(): Promise<{ reminders: number }> {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + WINDOW_MIN * 60_000);

  const upcoming = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "SCHEDULED"),
        gt(matches.kickoffAt, now),
        lte(matches.kickoffAt, windowEnd),
      ),
    );
  if (upcoming.length === 0) return { reminders: 0 };

  // candidate users: have an email or a push subscription
  const emailUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(isNotNull(users.email));
  const pushUsers = await db
    .selectDistinct({ id: pushSubscriptions.userId })
    .from(pushSubscriptions);

  const candidates = new Map<number, { email: string | null; push: boolean }>();
  for (const u of emailUsers)
    candidates.set(u.id, { email: u.email, push: false });
  for (const u of pushUsers) {
    const c = candidates.get(u.id) ?? { email: null, push: false };
    c.push = true;
    candidates.set(u.id, c);
  }
  if (candidates.size === 0) return { reminders: 0 };

  let reminders = 0;

  for (const m of upcoming) {
    const predicted = new Set(
      (
        await db
          .select({ userId: predictions.userId })
          .from(predictions)
          .where(eq(predictions.matchId, m.id))
      ).map((r) => r.userId),
    );

    const home = teamFa(m.homeTeam);
    const away = teamFa(m.awayTeam);
    const time = formatTime(m.kickoffAt);
    const title = "⏰ یادآوری پیش‌بینی";
    const body = `${home} - ${away} ساعت ${time}`;

    for (const [userId, c] of candidates) {
      if (predicted.has(userId)) continue;

      if (c.push && (await claim(userId, m.id, "push"))) {
        await sendPushToUser(userId, { title, body, url: "/" });
        reminders++;
      }
      if (c.email && (await claim(userId, m.id, "email"))) {
        await sendEmail(c.email, title, reminderEmailHtml({ home, away, time }));
        reminders++;
      }
    }
  }

  return { reminders };
}
