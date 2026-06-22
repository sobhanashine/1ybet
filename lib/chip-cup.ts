import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "./db";
import { chipStacks, chipWagers, matches } from "./db/schema";
import { getMatchPredictionStats } from "./match-stats";
import { POINTS, outcome, scorePrediction, type Outcome } from "./scoring";
import { isLocked } from "./time";

// Everyone starts level; minimum bet keeps players in the action.
export const STARTING_STACK = 1000;
export const MIN_WAGER = 50;
// How many upcoming matches the wager board shows at once.
const OPEN_LIMIT = 12;
const HISTORY_LIMIT = 15;

// Net profit per chip for a winning bet, before the odds multiplier. Backing the
// favourite still pays; nailing the exact score pays the most.
const PROFIT_BY_TIER: Record<number, number> = {
  [POINTS.EXACT]: 2.0,
  [POINTS.DIFF]: 1.2,
  [POINTS.WINNER]: 0.6,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Odds multiplier from the crowd: backing a contrarian outcome (few others
 * picked it) pays more, the favourite less. Centred so an even split pays ~1×.
 * No crowd data → neutral 1×.
 */
export function oddsMultiplier(
  predOutcome: Outcome,
  crowd: { total: number; home: { pct: number }; draw: { pct: number }; away: { pct: number } },
): number {
  if (crowd.total === 0) return 1;
  const pct =
    predOutcome === "HOME"
      ? crowd.home.pct
      : predOutcome === "DRAW"
        ? crowd.draw.pct
        : crowd.away.pct;
  const p = clamp(pct / 100, 0.2, 1);
  return clamp(0.5 / p, 0.6, 2.0);
}

/**
 * Settle one wager. Returns the gross chips returned to the stack (0 on a loss —
 * the stake was already deducted when the bet was placed) and the net delta.
 */
function settleOne(
  amount: number,
  predHome: number,
  predAway: number,
  actualHome: number,
  actualAway: number,
  oddsMult: number,
): { gross: number; delta: number } {
  const tier = scorePrediction(predHome, predAway, actualHome, actualAway);
  const profit = PROFIT_BY_TIER[tier];
  if (!profit) return { gross: 0, delta: -amount }; // wrong outcome — lose the stake
  const gross = Math.round(amount * (1 + profit * oddsMult));
  return { gross, delta: gross - amount };
}

export async function isChipMember(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ userId: chipStacks.userId })
    .from(chipStacks)
    .where(eq(chipStacks.userId, userId))
    .limit(1);
  return !!row;
}

export type ChipStack = { chips: number; atStake: number; total: number };

/** Available chips + chips committed to open wagers. null when not a member. */
export async function getChipStack(userId: number): Promise<ChipStack | null> {
  const [stack] = await db
    .select({ chips: chipStacks.chips })
    .from(chipStacks)
    .where(eq(chipStacks.userId, userId))
    .limit(1);
  if (!stack) return null;

  const [open] = await db
    .select({ atStake: sql<number>`coalesce(sum(${chipWagers.amount}), 0)::int` })
    .from(chipWagers)
    .where(and(eq(chipWagers.userId, userId), eq(chipWagers.settled, false)));

  const atStake = open?.atStake ?? 0;
  return { chips: stack.chips, atStake, total: stack.chips + atStake };
}

/** Opt the user into the Chip Cup with the starting stack. Idempotent. */
export async function joinChipCup(userId: number): Promise<void> {
  await db
    .insert(chipStacks)
    .values({ userId, chips: STARTING_STACK })
    .onConflictDoNothing();
}

export type ChipOpenMatch = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: Date;
  groupName: string | null;
  stage: string;
  wager: { amount: number; predHome: number; predAway: number } | null;
};

/** Upcoming, still-open matches the user can bet on, with any existing wager. */
export async function getOpenMatches(userId: number): Promise<ChipOpenMatch[]> {
  const rows = await db
    .select({
      id: matches.id,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      homeFlag: matches.homeFlag,
      awayFlag: matches.awayFlag,
      kickoffAt: matches.kickoffAt,
      groupName: matches.groupName,
      stage: matches.stage,
      wagerAmount: chipWagers.amount,
      wagerHome: chipWagers.predHome,
      wagerAway: chipWagers.predAway,
    })
    .from(matches)
    .leftJoin(
      chipWagers,
      and(eq(chipWagers.matchId, matches.id), eq(chipWagers.userId, userId)),
    )
    .where(sql`${matches.status} <> 'FINISHED'`)
    .orderBy(matches.kickoffAt);

  return rows
    .filter((r) => !isLocked(r.kickoffAt))
    .slice(0, OPEN_LIMIT)
    .map((r) => ({
      id: r.id,
      homeTeam: r.homeTeam,
      awayTeam: r.awayTeam,
      homeFlag: r.homeFlag,
      awayFlag: r.awayFlag,
      kickoffAt: r.kickoffAt,
      groupName: r.groupName,
      stage: r.stage,
      wager:
        r.wagerAmount != null
          ? { amount: r.wagerAmount, predHome: r.wagerHome!, predAway: r.wagerAway! }
          : null,
    }));
}

export type ChipSettledWager = {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  predHome: number;
  predAway: number;
  amount: number;
  delta: number;
};

/** A user's most recently settled wagers (for the results feed). */
export async function getSettledWagers(userId: number): Promise<ChipSettledWager[]> {
  const rows = await db
    .select({
      matchId: chipWagers.matchId,
      homeTeam: matches.homeTeam,
      awayTeam: matches.awayTeam,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
      predHome: chipWagers.predHome,
      predAway: chipWagers.predAway,
      amount: chipWagers.amount,
      delta: chipWagers.delta,
    })
    .from(chipWagers)
    .innerJoin(matches, eq(matches.id, chipWagers.matchId))
    .where(and(eq(chipWagers.userId, userId), eq(chipWagers.settled, true)))
    .orderBy(desc(matches.kickoffAt))
    .limit(HISTORY_LIMIT);
  return rows;
}

export type PlaceWagerResult = { ok: true } | { ok: false; error: string };

/**
 * Place or update a wager on an open match. The stake is committed immediately
 * (deducted from the available stack); editing an open wager refunds the old
 * stake first, so the available balance is always real.
 */
export async function placeChipWager(
  userId: number,
  matchId: number,
  predHome: number,
  predAway: number,
  amount: number,
): Promise<PlaceWagerResult> {
  if (
    ![predHome, predAway, amount].every(Number.isInteger) ||
    predHome < 0 ||
    predAway < 0 ||
    predHome > 99 ||
    predAway > 99
  ) {
    return { ok: false, error: "ورودی نامعتبر است" };
  }
  if (amount < MIN_WAGER) {
    return { ok: false, error: `حداقل شرط ${MIN_WAGER} چیپ است` };
  }

  const [match] = await db
    .select({ kickoffAt: matches.kickoffAt, status: matches.status })
    .from(matches)
    .where(eq(matches.id, matchId))
    .limit(1);
  if (!match || match.status === "FINISHED" || isLocked(match.kickoffAt)) {
    return { ok: false, error: "این بازی برای شرط‌بندی بسته است" };
  }

  return db.transaction(async (tx) => {
    const [stack] = await tx
      .select({ chips: chipStacks.chips })
      .from(chipStacks)
      .where(eq(chipStacks.userId, userId))
      .limit(1)
      .for("update");
    if (!stack) return { ok: false, error: "اول وارد جام چیپ شو" };

    const [existing] = await tx
      .select({ amount: chipWagers.amount })
      .from(chipWagers)
      .where(
        and(
          eq(chipWagers.userId, userId),
          eq(chipWagers.matchId, matchId),
          eq(chipWagers.settled, false),
        ),
      )
      .limit(1);

    // Editing refunds the previous stake, so available = chips + old stake.
    const available = stack.chips + (existing?.amount ?? 0);
    if (amount > available) {
      return { ok: false, error: "چیپ کافی نداری" };
    }

    await tx
      .update(chipStacks)
      .set({ chips: available - amount })
      .where(eq(chipStacks.userId, userId));

    await tx
      .insert(chipWagers)
      .values({ userId, matchId, predHome, predAway, amount })
      .onConflictDoUpdate({
        target: [chipWagers.userId, chipWagers.matchId],
        set: { predHome, predAway, amount, updatedAt: new Date() },
      });

    return { ok: true };
  });
}

/**
 * Settle every open wager whose match has finished. Idempotent: the wager flips
 * to settled in the same statement that reads it (guarded by settled = false),
 * so a stake can never be paid out twice. Returns how many were settled.
 */
export async function settlePendingWagers(): Promise<number> {
  const pending = await db
    .select({
      id: chipWagers.id,
      userId: chipWagers.userId,
      matchId: chipWagers.matchId,
      predHome: chipWagers.predHome,
      predAway: chipWagers.predAway,
      amount: chipWagers.amount,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(chipWagers)
    .innerJoin(matches, eq(matches.id, chipWagers.matchId))
    .where(
      and(
        eq(chipWagers.settled, false),
        sql`${matches.status} = 'FINISHED'`,
        sql`${matches.homeScore} is not null`,
        sql`${matches.awayScore} is not null`,
      ),
    );
  if (pending.length === 0) return 0;

  // Crowd odds per match (cached so each match is fetched once).
  const oddsCache = new Map<number, number>();
  const oddsFor = async (matchId: number, predOutcome: Outcome): Promise<number> => {
    const key = matchId;
    if (!oddsCache.has(key)) {
      const crowd = await getMatchPredictionStats(matchId);
      oddsCache.set(key, oddsMultiplier(predOutcome, crowd));
    }
    return oddsCache.get(key)!;
  };

  let settled = 0;
  for (const w of pending) {
    const predOutcome = outcome(w.predHome, w.predAway);
    const oddsMult = await oddsFor(w.matchId, predOutcome);
    const { gross, delta } = settleOne(
      w.amount,
      w.predHome,
      w.predAway,
      w.homeScore!,
      w.awayScore!,
      oddsMult,
    );

    const done = await db.transaction(async (tx) => {
      const flipped = await tx
        .update(chipWagers)
        .set({ settled: true, delta })
        .where(and(eq(chipWagers.id, w.id), eq(chipWagers.settled, false)))
        .returning({ id: chipWagers.id });
      if (flipped.length === 0) return false; // already settled elsewhere
      if (gross > 0) {
        await tx
          .update(chipStacks)
          .set({ chips: sql`${chipStacks.chips} + ${gross}` })
          .where(eq(chipStacks.userId, w.userId));
      }
      return true;
    });
    if (done) settled++;
  }
  return settled;
}

export type ChipLeaderRow = {
  userId: number;
  displayName: string | null;
  total: number; // available chips + chips at stake
};

/** Chip leaderboard, ranked by total holdings (available + at stake). */
export async function getChipLeaderboard(): Promise<ChipLeaderRow[]> {
  const rows = await db
    .select({
      userId: chipStacks.userId,
      displayName: sql<string | null>`(select display_name from users where users.id = ${chipStacks.userId})`,
      total: sql<number>`(${chipStacks.chips} + coalesce((select sum(amount) from chip_wagers w where w.user_id = ${chipStacks.userId} and w.settled = false), 0))::int`,
    })
    .from(chipStacks);

  return rows
    .filter((r) => r.displayName)
    .sort((a, b) => b.total - a.total);
}
