import "server-only";
import { eq, asc, and, gte, lte } from "drizzle-orm";
import { db } from "./db";
import { matches, predictions, type Match } from "./db/schema";

export { isLocked } from "./time";

export type MatchWithPrediction = Match & {
  predHome: number | null;
  predAway: number | null;
  points: number | null;
  predScored: boolean | null;
};

/** All matches with the given user's prediction (if any), ordered by kickoff. */
export async function getMatchesWithPredictions(
  userId: number,
): Promise<MatchWithPrediction[]> {
  const rows = await db
    .select({
      match: matches,
      predHome: predictions.predHome,
      predAway: predictions.predAway,
      points: predictions.points,
      predScored: predictions.scored,
    })
    .from(matches)
    .leftJoin(
      predictions,
      and(eq(predictions.matchId, matches.id), eq(predictions.userId, userId)),
    )
    .orderBy(asc(matches.kickoffAt));

  return rows.map((r) => ({
    ...r.match,
    predHome: r.predHome,
    predAway: r.predAway,
    points: r.points,
    predScored: r.predScored,
  }));
}

/** A single match with the given user's prediction (if any). */
export async function getMatchWithPrediction(
  matchId: number,
  userId: number,
): Promise<MatchWithPrediction | null> {
  const [row] = await db
    .select({
      match: matches,
      predHome: predictions.predHome,
      predAway: predictions.predAway,
      points: predictions.points,
      predScored: predictions.scored,
    })
    .from(matches)
    .leftJoin(
      predictions,
      and(eq(predictions.matchId, matches.id), eq(predictions.userId, userId)),
    )
    .where(eq(matches.id, matchId))
    .limit(1);

  if (!row) return null;
  return {
    ...row.match,
    predHome: row.predHome,
    predAway: row.predAway,
    points: row.points,
    predScored: row.predScored,
  };
}

/** Matches kicking off within [from, to], with the user's prediction. */
export async function getMatchesInWindow(
  userId: number,
  from: Date,
  to: Date,
): Promise<MatchWithPrediction[]> {
  const rows = await db
    .select({
      match: matches,
      predHome: predictions.predHome,
      predAway: predictions.predAway,
      points: predictions.points,
      predScored: predictions.scored,
    })
    .from(matches)
    .leftJoin(
      predictions,
      and(eq(predictions.matchId, matches.id), eq(predictions.userId, userId)),
    )
    .where(and(gte(matches.kickoffAt, from), lte(matches.kickoffAt, to)))
    .orderBy(asc(matches.kickoffAt));

  return rows.map((r) => ({
    ...r.match,
    predHome: r.predHome,
    predAway: r.predAway,
    points: r.points,
    predScored: r.predScored,
  }));
}
