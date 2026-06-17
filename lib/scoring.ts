// Scoring is fully config-driven so point values can be tuned in one place.
export const POINTS = {
  EXACT: 10, // exact score
  DIFF: 7, // correct outcome + correct goal difference (a correct draw lands here)
  WINNER: 5, // correct winner, wrong margin
  FLOOR: 2, // any submitted-but-wrong prediction (there is no zero)
} as const;

export type Outcome = "HOME" | "DRAW" | "AWAY";

export function outcome(home: number, away: number): Outcome {
  if (home > away) return "HOME";
  if (home < away) return "AWAY";
  return "DRAW";
}

/**
 * Score a single prediction against the actual REGULATION (90-minute) result.
 * Every submitted prediction earns at least POINTS.FLOOR.
 */
export function scorePrediction(
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
): number {
  if (predHome === actualHome && predAway === actualAway) return POINTS.EXACT;

  const predOutcome = outcome(predHome, predAway);
  const actualOutcome = outcome(actualHome, actualAway);

  if (predOutcome === actualOutcome) {
    // correct outcome — is the goal difference also correct?
    if (predHome - predAway === actualHome - actualAway) return POINTS.DIFF;
    return POINTS.WINNER;
  }

  // wrong outcome — participation floor
  return POINTS.FLOOR;
}
