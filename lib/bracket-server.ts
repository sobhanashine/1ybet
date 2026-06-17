import "server-only";
import { and, eq, ne, asc, isNotNull } from "drizzle-orm";
import { db } from "./db";
import { matches, bracketPicks, bracketResults } from "./db/schema";
import {
  BRACKET_ROUNDS,
  ROUND_BONUS,
  bonusForSlot,
  roundOfSlot,
  slotFor,
  type BracketRound,
} from "./bracket";

const ROUND_TO_STAGE: Partial<Record<BracketRound, (typeof matches.stage.enumValues)[number]>> = {
  LAST_16: "LAST_16",
  QUARTER_FINAL: "QUARTER_FINAL",
  SEMI_FINAL: "SEMI_FINAL",
  FINAL: "FINAL",
};

/** Earliest knockout kickoff; the bracket locks at this time. */
export async function getBracketLockTime(): Promise<Date | null> {
  const [row] = await db
    .select({ kickoff: matches.kickoffAt })
    .from(matches)
    .where(ne(matches.stage, "GROUP"))
    .orderBy(asc(matches.kickoffAt))
    .limit(1);
  return row?.kickoff ?? null;
}

export async function isBracketLocked(): Promise<boolean> {
  const lock = await getBracketLockTime();
  return !!lock && lock.getTime() <= Date.now();
}

/**
 * Team pool for filling the bracket. Prefer the knockout teams once known;
 * fall back to all teams seen so far so users can fill early.
 */
export async function getTeamPool(): Promise<string[]> {
  const knockout = await db
    .selectDistinct({ team: matches.homeTeam })
    .from(matches)
    .where(ne(matches.stage, "GROUP"));
  const knockoutAway = await db
    .selectDistinct({ team: matches.awayTeam })
    .from(matches)
    .where(ne(matches.stage, "GROUP"));
  const set = new Set<string>([
    ...knockout.map((r) => r.team),
    ...knockoutAway.map((r) => r.team),
  ]);
  if (set.size === 0) {
    const all = await db.selectDistinct({ team: matches.homeTeam }).from(matches);
    const allAway = await db.selectDistinct({ team: matches.awayTeam }).from(matches);
    for (const r of [...all, ...allAway]) set.add(r.team);
  }
  return [...set].sort();
}

export type UserBracket = Record<BracketRound, string[]>;

export async function getUserBracket(userId: number): Promise<UserBracket> {
  const rows = await db
    .select({ slot: bracketPicks.slot })
    .from(bracketPicks)
    .where(eq(bracketPicks.userId, userId));
  const out = Object.fromEntries(
    BRACKET_ROUNDS.map((r) => [r, [] as string[]]),
  ) as UserBracket;
  for (const r of rows) {
    const round = roundOfSlot(r.slot);
    if (out[round]) out[round].push(r.slot.slice(r.slot.indexOf("#") + 1));
  }
  return out;
}

/** Distinct teams that appear in matches of a given stage. */
async function teamsInStage(
  stage: (typeof matches.stage.enumValues)[number],
): Promise<string[]> {
  const home = await db
    .selectDistinct({ team: matches.homeTeam })
    .from(matches)
    .where(eq(matches.stage, stage));
  const away = await db
    .selectDistinct({ team: matches.awayTeam })
    .from(matches)
    .where(eq(matches.stage, stage));
  return [...new Set([...home.map((r) => r.team), ...away.map((r) => r.team)])];
}

/** Fill bracket_results from actual fixtures/results. */
export async function resolveBracketResults(): Promise<number> {
  let written = 0;
  for (const round of BRACKET_ROUNDS) {
    if (round === "CHAMPION") continue;
    const stage = ROUND_TO_STAGE[round]!;
    for (const team of await teamsInStage(stage)) {
      await db
        .insert(bracketResults)
        .values({ slot: slotFor(round, team), teamCode: team })
        .onConflictDoNothing();
      written++;
    }
  }

  // Champion = winner of the final (incl. ET/penalties).
  const [final] = await db
    .select()
    .from(matches)
    .where(and(eq(matches.stage, "FINAL"), isNotNull(matches.winnerTeam)))
    .limit(1);
  if (final?.winnerTeam) {
    await db
      .insert(bracketResults)
      .values({
        slot: slotFor("CHAMPION", final.winnerTeam),
        teamCode: final.winnerTeam,
      })
      .onConflictDoNothing();
    written++;
  }
  return written;
}

/** Score every bracket pick against the resolved results. */
export async function scoreBracket(): Promise<number> {
  const results = await db
    .select({ slot: bracketResults.slot })
    .from(bracketResults);
  const won = new Set(results.map((r) => r.slot));

  const picks = await db
    .select({ id: bracketPicks.id, slot: bracketPicks.slot })
    .from(bracketPicks);

  let scored = 0;
  for (const p of picks) {
    const pts = won.has(p.slot) ? bonusForSlot(p.slot) : 0;
    await db
      .update(bracketPicks)
      .set({ points: pts })
      .where(eq(bracketPicks.id, p.id));
    scored++;
  }
  return scored;
}

export { ROUND_BONUS };
