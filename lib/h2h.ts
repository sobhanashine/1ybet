import "server-only";
import { sql, eq, and, inArray, desc } from "drizzle-orm";
import { db } from "./db";
import { users, predictions, matches } from "./db/schema";
import { getUserTotalPoints } from "./profile";

export type CompareStats = {
  userId: number;
  displayName: string | null;
  country: string | null;
  total: number;
  predicted: number;
  exactCount: number;
  accuracy: number; // 0..100
  bestStreak: number;
  perStage: Record<string, number>;
};

export async function getCompareStats(
  userId: number,
): Promise<CompareStats | null> {
  const [u] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!u) return null;

  const [agg] = await db
    .select({
      predicted: sql<number>`count(*) filter (where ${predictions.scored})::int`,
      exactCount: sql<number>`count(*) filter (where ${predictions.points} = 10)::int`,
      good: sql<number>`count(*) filter (where ${predictions.scored} and ${predictions.points} >= 5)::int`,
    })
    .from(predictions)
    .where(eq(predictions.userId, userId));

  const stageRows = await db
    .select({
      stage: matches.stage,
      points: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(and(eq(predictions.userId, userId), eq(predictions.scored, true)))
    .groupBy(matches.stage);

  const perStage: Record<string, number> = {};
  for (const r of stageRows) perStage[r.stage] = r.points;

  const predicted = agg?.predicted ?? 0;
  const good = agg?.good ?? 0;

  return {
    userId,
    displayName: u.displayName,
    country: u.country,
    total: await getUserTotalPoints(userId),
    predicted,
    exactCount: agg?.exactCount ?? 0,
    accuracy: predicted ? Math.round((good / predicted) * 100) : 0,
    bestStreak: u.bestStreak,
    perStage,
  };
}

export type Pick = {
  predHome: number;
  predAway: number;
  points: number;
  scored: boolean;
};

export type MatchComparisonRow = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  stage: string;
  status: string;
  kickoffAt: Date;
  homeScore: number | null;
  awayScore: number | null;
  a: Pick | null;
  b: Pick | null;
};

/**
 * Per-match comparison of two players: every match that at least one of them
 * predicted, with both picks (or null) and the actual result. Most recent
 * kickoff first so finished, scored matches lead.
 */
export async function getMatchComparison(
  aId: number,
  bId: number,
): Promise<MatchComparisonRow[]> {
  const rows = await db
    .select({
      matchId: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      homeFlag: matches.homeFlag,
      awayFlag: matches.awayFlag,
      stage: matches.stage,
      status: matches.status,
      kickoffAt: matches.kickoffAt,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      userId: predictions.userId,
      predHome: predictions.predHome,
      predAway: predictions.predAway,
      points: predictions.points,
      scored: predictions.scored,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(inArray(predictions.userId, [aId, bId]))
    .orderBy(desc(matches.kickoffAt));

  const byMatch = new Map<number, MatchComparisonRow>();
  for (const r of rows) {
    let m = byMatch.get(r.matchId);
    if (!m) {
      m = {
        matchId: r.matchId,
        homeTeam: r.homeTeam,
        awayTeam: r.awayTeam,
        homeFlag: r.homeFlag,
        awayFlag: r.awayFlag,
        stage: r.stage,
        status: r.status,
        kickoffAt: r.kickoffAt,
        homeScore: r.homeScore,
        awayScore: r.awayScore,
        a: null,
        b: null,
      };
      byMatch.set(r.matchId, m);
    }
    const pick: Pick = {
      predHome: r.predHome,
      predAway: r.predAway,
      points: r.points,
      scored: r.scored,
    };
    if (r.userId === aId) m.a = pick;
    else m.b = pick;
  }
  return [...byMatch.values()];
}
