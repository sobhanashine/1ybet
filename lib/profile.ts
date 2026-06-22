import "server-only";
import { sql, eq, and } from "drizzle-orm";
import { db } from "./db";
import { predictions, bracketPicks, badges, userBadges, matches } from "./db/schema";
import { POINTS } from "./scoring";

export async function getUserTotalPoints(userId: number): Promise<number> {
  const [pred] = await db
    .select({ total: sql<number>`coalesce(sum(${predictions.points}), 0)::int` })
    .from(predictions)
    .where(eq(predictions.userId, userId));
  const [brk] = await db
    .select({ total: sql<number>`coalesce(sum(${bracketPicks.points}), 0)::int` })
    .from(bracketPicks)
    .where(eq(bracketPicks.userId, userId));
  return (pred?.total ?? 0) + (brk?.total ?? 0);
}

export type UserTournamentBreakdown = {
  total: number; // tournament points — prediction points from the start match onward
  scored: number; // predictions scored within the tournament window
  exact: number; // count of exact-score hits (POINTS.EXACT)
  diff: number; // correct outcome + goal difference (POINTS.DIFF)
  winner: number; // correct winner, wrong margin (POINTS.WINNER)
  miss: number; // submitted but wrong outcome (POINTS.FLOOR)
  correct: number; // exact + diff + winner (outcome called correctly)
};

const EMPTY_BREAKDOWN: UserTournamentBreakdown = {
  total: 0,
  scored: 0,
  exact: 0,
  diff: 0,
  winner: 0,
  miss: 0,
  correct: 0,
};

/**
 * Tournament-scoped points breakdown: buckets the user's scored predictions for
 * matches kicking off at/after the tournament start, by point tier (`scoring.ts`).
 * `total` equals the user's tournament-leaderboard points, so the profile and
 * the standings always agree. Match-only — the tournament has no bracket bonus.
 */
export async function getUserTournamentBreakdown(
  userId: number,
  startIso: string,
): Promise<UserTournamentBreakdown> {
  const [p] = await db
    .select({
      total: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
      scored: sql<number>`count(*) filter (where ${predictions.scored})::int`,
      exact: sql<number>`count(*) filter (where ${predictions.scored} and ${predictions.points} = ${POINTS.EXACT})::int`,
      diff: sql<number>`count(*) filter (where ${predictions.scored} and ${predictions.points} = ${POINTS.DIFF})::int`,
      winner: sql<number>`count(*) filter (where ${predictions.scored} and ${predictions.points} = ${POINTS.WINNER})::int`,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    // postgres-js won't serialize a JS Date in a raw param, so bind the ISO
    // string (same window comparison as getTournamentLeaderboard).
    .where(
      and(eq(predictions.userId, userId), sql`${matches.kickoffAt} >= ${startIso}`),
    );

  if (!p) return EMPTY_BREAKDOWN;

  const correct = p.exact + p.diff + p.winner;
  // Anything scored that didn't call the outcome lands on the participation
  // floor; derive it so stray values can't desync the buckets.
  const miss = Math.max(0, p.scored - correct);

  return {
    total: p.total,
    scored: p.scored,
    exact: p.exact,
    diff: p.diff,
    winner: p.winner,
    miss,
    correct,
  };
}

export type EarnedBadge = {
  code: string;
  titleFa: string;
  descFa: string;
  icon: string | null;
};

export async function getUserBadges(userId: number): Promise<EarnedBadge[]> {
  return db
    .select({
      code: badges.code,
      titleFa: badges.titleFa,
      descFa: badges.descFa,
      icon: badges.icon,
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(userBadges.earnedAt);
}
