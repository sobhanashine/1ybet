import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { predictions } from "./db/schema";
import { outcome } from "./scoring";

export type ScoreShare = { label: string; count: number; pct: number };

export type MatchStats = {
  total: number;
  home: { count: number; pct: number };
  draw: { count: number; pct: number };
  away: { count: number; pct: number };
  topScores: ScoreShare[];
  avgHome: number;
  avgAway: number;
};

const pct = (n: number, total: number) =>
  total ? Math.round((n / total) * 100) : 0;

/**
 * Crowd prediction distribution for a single match — computed entirely from our
 * own predictions table (no external/paid data). How many people backed a home
 * win / draw / away win, the most common scorelines, and the average predicted
 * goals.
 */
export async function getMatchPredictionStats(
  matchId: number,
): Promise<MatchStats> {
  const rows = await db
    .select({ predHome: predictions.predHome, predAway: predictions.predAway })
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  const total = rows.length;
  let home = 0;
  let draw = 0;
  let away = 0;
  let sumHome = 0;
  let sumAway = 0;
  const scoreCounts = new Map<string, number>();

  for (const r of rows) {
    const o = outcome(r.predHome, r.predAway);
    if (o === "HOME") home++;
    else if (o === "AWAY") away++;
    else draw++;
    sumHome += r.predHome;
    sumAway += r.predAway;
    const key = `${r.predHome}-${r.predAway}`;
    scoreCounts.set(key, (scoreCounts.get(key) ?? 0) + 1);
  }

  const topScores: ScoreShare[] = [...scoreCounts.entries()]
    .map(([label, count]) => ({ label, count, pct: pct(count, total) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return {
    total,
    home: { count: home, pct: pct(home, total) },
    draw: { count: draw, pct: pct(draw, total) },
    away: { count: away, pct: pct(away, total) },
    topScores,
    avgHome: total ? Math.round((sumHome / total) * 10) / 10 : 0,
    avgAway: total ? Math.round((sumAway / total) * 10) / 10 : 0,
  };
}
