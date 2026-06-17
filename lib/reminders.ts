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

const WINDOW_MIN = 60;

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

    const title = "⏰ یادآوری پیش‌بینی";
    const body = `${teamFa(m.homeTeam)} - ${teamFa(m.awayTeam)} ساعت ${formatTime(
      m.kickoffAt,
    )}`;

    for (const [userId, c] of candidates) {
      if (predicted.has(userId)) continue;

      if (c.push && (await claim(userId, m.id, "push"))) {
        await sendPushToUser(userId, { title, body, url: "/" });
        reminders++;
      }
      if (c.email && (await claim(userId, m.id, "email"))) {
        await sendEmail(
          c.email,
          title,
          `<div dir="rtl" style="font-family:Tahoma,sans-serif">${body}</div>`,
        );
        reminders++;
      }
    }
  }

  return { reminders };
}
