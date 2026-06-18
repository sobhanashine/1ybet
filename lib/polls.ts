import "server-only";
import { eq, and, asc, sql } from "drizzle-orm";
import { db } from "./db";
import { pollVotes, users } from "./db/schema";
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

export type PollVoter = {
  userId: number;
  name: string;
  phone: string;
  choice: PollChoice;
  votedAt: Date;
};

export type PollBreakdown = {
  yes: PollVoter[];
  no: PollVoter[];
  total: number;
};

/** Admin-only: full per-user breakdown of who voted yes vs no. */
export async function getPollBreakdown(pollKey: string): Promise<PollBreakdown> {
  const rows = await db
    .select({
      userId: users.id,
      name: users.displayName,
      phone: users.phone,
      choice: pollVotes.choice,
      votedAt: pollVotes.createdAt,
    })
    .from(pollVotes)
    .innerJoin(users, eq(pollVotes.userId, users.id))
    .where(eq(pollVotes.pollKey, pollKey))
    .orderBy(asc(pollVotes.createdAt));

  const yes: PollVoter[] = [];
  const no: PollVoter[] = [];
  for (const r of rows) {
    const voter: PollVoter = {
      userId: r.userId,
      name: r.name ?? r.phone,
      phone: r.phone,
      choice: r.choice as PollChoice,
      votedAt: r.votedAt,
    };
    (voter.choice === "yes" ? yes : no).push(voter);
  }

  return { yes, no, total: yes.length + no.length };
}
