"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { joinChipCup, placeChipWager, type PlaceWagerResult } from "@/lib/chip-cup";
import { t } from "@/lib/i18n";

export type JoinResult = { ok: true } | { ok: false; error: string };

/** Opt the current user into the Chip Cup with the starting stack. Idempotent. */
export async function joinChipCupAction(): Promise<JoinResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  await joinChipCup(session.uid);
  revalidatePath("/chip-cup");
  revalidatePath("/");
  return { ok: true };
}

/** Place or update a chip wager on an open match. */
export async function placeWagerAction(
  matchId: number,
  predHome: number,
  predAway: number,
  amount: number,
): Promise<PlaceWagerResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  const res = await placeChipWager(session.uid, matchId, predHome, predAway, amount);
  if (res.ok) revalidatePath("/chip-cup");
  return res;
}
