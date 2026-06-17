"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { pollVotes } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { getPollResults, type PollChoice, type PollResults } from "@/lib/polls";
import { t } from "@/lib/i18n";

export type VoteResult =
  | { ok: true; results: PollResults }
  | { ok: false; error: string };

export async function votePoll(
  pollKey: string,
  choice: PollChoice,
): Promise<VoteResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };
  if (choice !== "yes" && choice !== "no") {
    return { ok: false, error: t.common.error };
  }

  await db
    .insert(pollVotes)
    .values({ pollKey, userId: session.uid, choice })
    .onConflictDoUpdate({
      target: [pollVotes.pollKey, pollVotes.userId],
      set: { choice },
    });

  revalidatePath("/");
  return { ok: true, results: await getPollResults(pollKey, session.uid) };
}
