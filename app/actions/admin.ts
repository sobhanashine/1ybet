"use server";

import { revalidatePath } from "next/cache";
import { eq, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, users, pushSubscriptions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { runSync, rescoreMatch } from "@/lib/sync";
import { runReminders } from "@/lib/reminders";
import { sendPushToUser } from "@/lib/push";
import { sendEmail } from "@/lib/email";

export type AdminResult = { ok: boolean; error?: string; info?: string };

async function requireAdmin(): Promise<number | null> {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) return null;
  return user.id;
}

export async function triggerSync(): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  try {
    const s = await runSync();
    revalidatePath("/admin");
    revalidatePath("/leaderboard");
    return {
      ok: true,
      info: `دریافت ${s.fetched}، امتیازدهی ${s.predictionsScored} پیش‌بینی`,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function triggerReminders(): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  try {
    const r = await runReminders();
    return { ok: true, info: `${r.reminders} یادآوری ارسال شد` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function saveMatchResult(
  matchId: number,
  status: "SCHEDULED" | "LIVE" | "FINISHED",
  homeScore: number | null,
  awayScore: number | null,
): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };

  // derive advancing team from regulation score for knockout convenience
  let winnerTeam: string | null = null;
  if (status === "FINISHED" && homeScore != null && awayScore != null) {
    const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
    if (m) {
      if (homeScore > awayScore) winnerTeam = m.homeTeam;
      else if (awayScore > homeScore) winnerTeam = m.awayTeam;
    }
  }

  await db
    .update(matches)
    .set({
      status,
      homeScore: status === "FINISHED" ? homeScore : null,
      awayScore: status === "FINISHED" ? awayScore : null,
      winnerTeam,
      scoredAt: null, // allow re-scoring
    })
    .where(eq(matches.id, matchId));

  if (status === "FINISHED") await rescoreMatch(matchId);

  revalidatePath("/admin");
  revalidatePath("/fixtures");
  revalidatePath("/leaderboard");
  return { ok: true, info: "ذخیره شد" };
}

export async function broadcast(
  title: string,
  body: string,
): Promise<AdminResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Unauthorized" };
  if (title.trim().length < 2) return { ok: false, error: "عنوان کوتاه است" };

  let count = 0;
  const pushUsers = await db
    .selectDistinct({ id: pushSubscriptions.userId })
    .from(pushSubscriptions);
  for (const u of pushUsers) {
    count += await sendPushToUser(u.id, { title, body, url: "/" });
  }

  const emailUsers = await db
    .select({ email: users.email })
    .from(users)
    .where(isNotNull(users.email));
  for (const u of emailUsers) {
    if (u.email)
      await sendEmail(
        u.email,
        title,
        `<div dir="rtl" style="font-family:Tahoma,sans-serif">${body}</div>`,
      );
  }

  return { ok: true, info: `ارسال شد (${count} پوش)` };
}
