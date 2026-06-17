import "server-only";
import { eq, and, sql } from "drizzle-orm";
import { db } from "./db";
import { pollVotes } from "./db/schema";
import type { PollChoice, PollResults } from "./polls-shared";

export { PRIZE_POOL_POLL } from "./polls-shared";
export type { PollChoice, PollResults } from "./polls-shared";

export async function getPollResults(
  pollKey: string,
  userId: number,
): Promise<PollResults> {
  const [agg] = await db
    .select({
      yes: sql<number>`count(*) filter (where ${pollVotes.choice} = 'yes')::int`,
      no: sql<number>`count(*) filter (where ${pollVotes.choice} = 'no')::int`,
    })
    .from(pollVotes)
    .where(eq(pollVotes.pollKey, pollKey));

  const [mine] = await db
    .select({ choice: pollVotes.choice })
    .from(pollVotes)
    .where(and(eq(pollVotes.pollKey, pollKey), eq(pollVotes.userId, userId)))
    .limit(1);

  const yes = agg?.yes ?? 0;
  const no = agg?.no ?? 0;
  const total = yes + no;
  return {
    yes,
    no,
    total,
    yesPct: total ? Math.round((yes / total) * 100) : 0,
    noPct: total ? Math.round((no / total) * 100) : 0,
    myChoice: (mine?.choice as PollChoice) ?? null,
  };
}
