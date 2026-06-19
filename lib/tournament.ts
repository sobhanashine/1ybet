import "server-only";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  matches,
  predictions,
  tournamentMembers,
  users,
} from "./db/schema";
import type { TournamentMatch } from "./tournament-shared";

export { TOURNAMENT_ENTRY_FEE_TOMAN } from "./tournament-shared";
export type { TournamentMatch } from "./tournament-shared";

/**
 * The match that kicks off the tournament: Belgium vs Iran (group stage).
 * Everything from this kickoff onward counts toward the prize; earlier matches
 * do not. Looked up by team codes so we never hard-code an id.
 */
export async function getStartMatch(): Promise<TournamentMatch | null> {
  const [m] = await db
    .select({
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      homeFlag: matches.homeFlag,
      awayFlag: matches.awayFlag,
      kickoffAt: matches.kickoffAt,
    })
    .from(matches)
    .where(
      or(
        and(eq(matches.homeCode, "BEL"), eq(matches.awayCode, "IRN")),
        and(eq(matches.homeCode, "IRN"), eq(matches.awayCode, "BEL")),
      ),
    )
    .orderBy(asc(matches.kickoffAt))
    .limit(1);

  if (!m) return null;
  return {
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    homeFlag: m.homeFlag,
    awayFlag: m.awayFlag,
    kickoffAt: m.kickoffAt.toISOString(),
  };
}

/** Has the given user joined the tournament? */
export async function isMember(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ userId: tournamentMembers.userId })
    .from(tournamentMembers)
    .where(eq(tournamentMembers.userId, userId))
    .limit(1);
  return !!row;
}

/** Number of users who have joined the tournament. */
export async function getMemberCount(): Promise<number> {
  const [agg] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(tournamentMembers);
  return agg?.n ?? 0;
}

export type TournamentRow = {
  userId: number;
  displayName: string | null;
  points: number;
  predicted: number;
};

/**
 * Tournament standings: members only, summing prediction points for matches
 * that kick off at/after the tournament start. The regular leaderboard is
 * untouched — this is a parallel, prize-eligible ranking.
 */
export async function getTournamentLeaderboard(
  startIso: string,
): Promise<TournamentRow[]> {
  const rows = await db
    .select({
      userId: users.id,
      displayName: users.displayName,
      points: sql<number>`coalesce(sum(case when ${matches.kickoffAt} >= ${startIso} then ${predictions.points} else 0 end), 0)::int`,
      predicted: sql<number>`count(${predictions.id}) filter (where ${predictions.scored} and ${matches.kickoffAt} >= ${startIso})::int`,
    })
    .from(tournamentMembers)
    .innerJoin(users, eq(users.id, tournamentMembers.userId))
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .leftJoin(matches, eq(matches.id, predictions.matchId))
    .groupBy(users.id);

  return rows
    .filter((r) => r.displayName)
    .sort((a, b) => b.points - a.points || b.predicted - a.predicted);
}
