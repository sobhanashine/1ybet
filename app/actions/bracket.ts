"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { bracketPicks } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { isBracketLocked } from "@/lib/bracket-server";
import {
  BRACKET_ROUNDS,
  ROUND_PICKS,
  slotFor,
  type BracketRound,
} from "@/lib/bracket";
import { t } from "@/lib/i18n";

export type BracketSaveResult = { ok: boolean; error?: string };

export async function saveBracket(
  picks: Record<BracketRound, string[]>,
): Promise<BracketSaveResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  if (await isBracketLocked()) {
    return { ok: false, error: t.bracket.locked };
  }

  // Build the rows, capping each round to its allowed number of picks.
  const rows: { userId: number; slot: string; teamCode: string }[] = [];
  for (const round of BRACKET_ROUNDS) {
    const teams = (picks[round] ?? []).slice(0, ROUND_PICKS[round]);
    for (const team of teams) {
      rows.push({ userId: session.uid, slot: slotFor(round, team), teamCode: team });
    }
  }

  // Replace the user's existing bracket.
  await db.delete(bracketPicks).where(eq(bracketPicks.userId, session.uid));
  if (rows.length) await db.insert(bracketPicks).values(rows);

  revalidatePath("/bracket");
  return { ok: true };
}
