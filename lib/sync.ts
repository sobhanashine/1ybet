import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./db";
import { matches, predictions } from "./db/schema";
import { fetchWorldCupMatches } from "./football-api";
import { scorePrediction } from "./scoring";
import { resolveBracketResults, scoreBracket } from "./bracket-server";
import { updateStreaksAndBadges } from "./badges-server";

export type SyncSummary = {
  fetched: number;
  upserted: number;
  matchesScored: number;
  predictionsScored: number;
  bracketScored: number;
  badgesAwarded: number;
};

/** Pull fixtures + results from football-data.org and upsert into `matches`. */
async function upsertFromApi(): Promise<{ fetched: number; upserted: number }> {
  const normalized = await fetchWorldCupMatches();
  let upserted = 0;
  for (const m of normalized) {
    await db
      .insert(matches)
      .values(m)
      .onConflictDoUpdate({
        target: matches.extId,
        set: {
          stage: m.stage,
          groupName: m.groupName,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          homeFlag: m.homeFlag,
          awayFlag: m.awayFlag,
          kickoffAt: m.kickoffAt,
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          winnerTeam: m.winnerTeam,
        },
      });
    upserted++;
  }
  return { fetched: normalized.length, upserted };
}

/**
 * Score predictions for FINISHED matches that have a regulation score and
 * unscored predictions. Returns how many matches/predictions were scored.
 */
export async function scoreFinishedMatches(): Promise<{
  matchesScored: number;
  predictionsScored: number;
}> {
  const finished = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "FINISHED"),
        isNotNull(matches.homeScore),
        isNotNull(matches.awayScore),
        isNull(matches.scoredAt),
      ),
    );

  let matchesScored = 0;
  let predictionsScored = 0;

  for (const m of finished) {
    const unscored = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.matchId, m.id), eq(predictions.scored, false)));

    if (unscored.length === 0) {
      if (!m.scoredAt) {
        await db
          .update(matches)
          .set({ scoredAt: new Date() })
          .where(eq(matches.id, m.id));
      }
      continue;
    }

    for (const p of unscored) {
      const pts = scorePrediction(
        p.predHome,
        p.predAway,
        m.homeScore!,
        m.awayScore!,
      );
      await db
        .update(predictions)
        .set({ points: pts, scored: true })
        .where(eq(predictions.id, p.id));
      predictionsScored++;
    }

    await db
      .update(matches)
      .set({ scoredAt: new Date() })
      .where(eq(matches.id, m.id));
    matchesScored++;
  }

  return { matchesScored, predictionsScored };
}

/** Re-score every prediction for one match (used by admin score overrides). */
export async function rescoreMatch(matchId: number): Promise<number> {
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m || m.homeScore == null || m.awayScore == null) return 0;

  const preds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  for (const p of preds) {
    const pts = scorePrediction(p.predHome, p.predAway, m.homeScore, m.awayScore);
    await db
      .update(predictions)
      .set({ points: pts, scored: true })
      .where(eq(predictions.id, p.id));
  }
  await db.update(matches).set({ scoredAt: new Date() }).where(eq(matches.id, matchId));
  return preds.length;
}

/** Full sync: pull from API, score matches, then resolve & score the bracket. */
export async function runSync(): Promise<SyncSummary> {
  const { fetched, upserted } = await upsertFromApi();
  const { matchesScored, predictionsScored } = await scoreFinishedMatches();

  // Bracket and badge scoring are best-effort: a failure here must NOT abort the
  // request or mask the match predictions we already scored and committed above
  // (otherwise the sync reports failure and the latest results look unscored).
  let bracketScored = 0;
  let badgesAwarded = 0;
  try {
    await resolveBracketResults();
    bracketScored = await scoreBracket();
  } catch (e) {
    console.error("Bracket scoring failed:", e instanceof Error ? e.message : e);
  }
  try {
    ({ badgesAwarded } = await updateStreaksAndBadges());
  } catch (e) {
    console.error("Badge update failed:", e instanceof Error ? e.message : e);
  }

  return {
    fetched,
    upserted,
    matchesScored,
    predictionsScored,
    bracketScored,
    badgesAwarded,
  };
}
