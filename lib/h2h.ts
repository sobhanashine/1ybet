import "server-only";
import { sql, eq, and } from "drizzle-orm";
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
