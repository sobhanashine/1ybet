"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { tournamentMembers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { t } from "@/lib/i18n";

export type JoinResult = { ok: true } | { ok: false; error: string };

/** Opt the current user into the 100k-toman tournament. Idempotent. */
export async function joinTournament(): Promise<JoinResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  await db
    .insert(tournamentMembers)
    .values({ userId: session.uid })
    .onConflictDoNothing();

  revalidatePath("/tournament");
  return { ok: true };
}
