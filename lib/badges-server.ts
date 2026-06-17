import "server-only";
import { asc, eq, like, and, gt } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  predictions,
  matches,
  badges,
  userBadges,
  bracketPicks,
} from "./db/schema";
import { tehranDayKey } from "./format";
import { POINTS } from "./scoring";

const FLOOR_BEATEN = POINTS.WINNER; // points >= 5 counts as a "good" prediction

async function badgeIdByCode(): Promise<Map<string, number>> {
  const rows = await db.select({ id: badges.id, code: badges.code }).from(badges);
  return new Map(rows.map((r) => [r.code, r.id]));
}

/**
 * Recompute best streaks and award badges. Idempotent: badges are inserted
 * with onConflictDoNothing, streaks overwrite. Called at the end of a sync.
 */
export async function updateStreaksAndBadges(): Promise<{
  streaksUpdated: number;
  badgesAwarded: number;
}> {
  const ids = await badgeIdByCode();
  const award: { userId: number; badgeId: number }[] = [];
  const wantBadge = (userId: number, code: string) => {
    const badgeId = ids.get(code);
    if (badgeId) award.push({ userId, badgeId });
  };

  // All scored predictions in (user, kickoff) order — one pass.
  const rows = await db
    .select({
      userId: predictions.userId,
      points: predictions.points,
      kickoffAt: matches.kickoffAt,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(eq(predictions.scored, true))
    .orderBy(asc(predictions.userId), asc(matches.kickoffAt));

  // group by user
  const byUser = new Map<number, { points: number; kickoffAt: Date }[]>();
  for (const r of rows) {
    (byUser.get(r.userId) ?? byUser.set(r.userId, []).get(r.userId)!).push({
      points: r.points,
      kickoffAt: r.kickoffAt,
    });
  }

  let streaksUpdated = 0;
  for (const [userId, preds] of byUser) {
    // best streak of consecutive good predictions
    let cur = 0;
    let best = 0;
    let anyExact = false;
    const perDay = new Map<string, { total: number; good: number }>();

    for (const p of preds) {
      if (p.points >= FLOOR_BEATEN) cur++;
      else cur = 0;
      if (cur > best) best = cur;
      if (p.points >= POINTS.EXACT) anyExact = true;

      const day = tehranDayKey(p.kickoffAt);
      const d = perDay.get(day) ?? { total: 0, good: 0 };
      d.total++;
      if (p.points >= FLOOR_BEATEN) d.good++;
      perDay.set(day, d);
    }

    await db.update(users).set({ bestStreak: best }).where(eq(users.id, userId));
    streaksUpdated++;

    if (anyExact) wantBadge(userId, "first_exact");
    if (best >= 3) wantBadge(userId, "streak_3");
    if (best >= 5) wantBadge(userId, "streak_5");
    if (best >= 10) wantBadge(userId, "streak_10");
    // perfect day: a day with >=2 predictions, all good
    for (const d of perDay.values()) {
      if (d.total >= 2 && d.total === d.good) {
        wantBadge(userId, "perfect_day");
        break;
      }
    }
  }

  // bracket_master: a correctly-predicted champion
  const champWinners = await db
    .selectDistinct({ userId: bracketPicks.userId })
    .from(bracketPicks)
    .where(and(like(bracketPicks.slot, "CHAMPION#%"), gt(bracketPicks.points, 0)));
  for (const r of champWinners) wantBadge(r.userId, "bracket_master");

  let badgesAwarded = 0;
  for (const a of award) {
    const res = await db
      .insert(userBadges)
      .values(a)
      .onConflictDoNothing()
      .returning({ userId: userBadges.userId });
    badgesAwarded += res.length;
  }

  return { streaksUpdated, badgesAwarded };
}
