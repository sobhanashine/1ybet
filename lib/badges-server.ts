import "server-only";
import { asc, eq, like, and, gt, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  predictions,
  matches,
  badges,
  userBadges,
  bracketPicks,
  groupMembers,
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

  // group_winner: rank 1 (by total points) in a group with >=2 members
  await awardGroupWinners(wantBadge);

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

async function awardGroupWinners(
  wantBadge: (userId: number, code: string) => void,
) {
  const memberRows = await db
    .select({ groupId: groupMembers.groupId, userId: groupMembers.userId })
    .from(groupMembers);
  const byGroup = new Map<number, number[]>();
  for (const r of memberRows) {
    (byGroup.get(r.groupId) ?? byGroup.set(r.groupId, []).get(r.groupId)!).push(
      r.userId,
    );
  }

  // total prediction points per user
  const sums = await db
    .select({
      userId: predictions.userId,
      total: sql<number>`coalesce(sum(${predictions.points}), 0)::int`,
    })
    .from(predictions)
    .groupBy(predictions.userId);
  const pointMap = new Map<number, number>(sums.map((r) => [r.userId, r.total]));

  for (const [, members] of byGroup) {
    if (members.length < 2) continue;
    let topUser = members[0];
    let topPts = pointMap.get(topUser) ?? 0;
    for (const u of members) {
      const p = pointMap.get(u) ?? 0;
      if (p > topPts) {
        topPts = p;
        topUser = u;
      }
    }
    if (topPts > 0) wantBadge(topUser, "group_winner");
  }
}
