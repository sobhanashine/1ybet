"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, predictions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { isLocked } from "@/lib/time";
import { t } from "@/lib/i18n";

export type PredictResult = { ok: boolean; error?: string };

export async function submitPrediction(
  matchId: number,
  predHome: number,
  predAway: number,
): Promise<PredictResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  if (
    !Number.isInteger(predHome) ||
    !Number.isInteger(predAway) ||
    predHome < 0 ||
    predAway < 0 ||
    predHome > 99 ||
    predAway > 99
  ) {
    return { ok: false, error: t.common.error };
  }

  const [match] = await db
    .select()
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match) return { ok: false, error: t.common.error };
  if (isLocked(match.kickoffAt)) return { ok: false, error: t.match.locked };

  await db
    .insert(predictions)
    .values({ userId: session.uid, matchId, predHome, predAway })
    .onConflictDoUpdate({
      target: [predictions.userId, predictions.matchId],
      set: { predHome, predAway, updatedAt: new Date() },
    });

  revalidatePath("/");
  revalidatePath("/fixtures");
  return { ok: true };
}
