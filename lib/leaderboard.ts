import "server-only";
import { sql, eq, inArray } from "drizzle-orm";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { db } from "./db";
import { users, predictions, matches, bracketPicks, groupMembers } from "./db/schema";
import { TIMEZONE } from "./config";

dayjs.extend(utc);
dayjs.extend(timezone);

export type LeaderboardRow = {
  userId: number;
  displayName: string | null;
  country: string | null;
  points: number;
  predicted: number;
};

export type Scope =
  | { kind: "daily"; date?: string } // YYYY-MM-DD (Tehran); defaults to today
  | { kind: "weekly"; date?: string }
  | { kind: "stage"; stage: string }
  | { kind: "total" };

/** Tehran calendar-day [from, to) as UTC Dates. */
export function dayRange(date?: string): { from: Date; to: Date } {
  const base = date ? dayjs.tz(date, TIMEZONE) : dayjs().tz(TIMEZONE);
  const start = base.startOf("day");
  return { from: start.toDate(), to: start.add(1, "day").toDate() };
}

/** Persian week: Saturday → Friday, in Tehran tz. */
export function weekRange(date?: string): { from: Date; to: Date } {
  const base = date ? dayjs.tz(date, TIMEZONE) : dayjs().tz(TIMEZONE);
  // dayjs day(): Sun=0 .. Sat=6. Days since Saturday:
  const daysSinceSat = (base.day() + 1) % 7;
  const start = base.startOf("day").subtract(daysSinceSat, "day");
  return { from: start.toDate(), to: start.add(7, "day").toDate() };
}

// SQL expression summing match points under the given scope.
function pointsExpr(scope: Scope) {
  if (scope.kind === "stage") {
    return sql<number>`coalesce(sum(case when ${matches.stage} = ${scope.stage} then ${predictions.points} else 0 end), 0)::int`;
  }
  if (scope.kind === "total") {
    return sql<number>`coalesce(sum(${predictions.points}), 0)::int`;
  }
  const { from, to } =
    scope.kind === "daily" ? dayRange(scope.date) : weekRange(scope.date);
  return sql<number>`coalesce(sum(case when ${matches.kickoffAt} >= ${from} and ${matches.kickoffAt} < ${to} then ${predictions.points} else 0 end), 0)::int`;
}

function predictedExpr() {
  return sql<number>`count(${predictions.id}) filter (where ${predictions.scored})::int`;
}

/** Bracket bonus per user (only relevant for total / stage scopes). */
async function bracketPointsByUser(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      userId: bracketPicks.userId,
      points: sql<number>`coalesce(sum(${bracketPicks.points}), 0)::int`,
    })
    .from(bracketPicks)
    .groupBy(bracketPicks.userId);
  return new Map(rows.map((r) => [r.userId, r.points]));
}

async function baseLeaderboard(
  scope: Scope,
  userIds?: number[],
): Promise<LeaderboardRow[]> {
  const q = db
    .select({
      userId: users.id,
      displayName: users.displayName,
      country: users.country,
      points: pointsExpr(scope),
      predicted: predictedExpr(),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .leftJoin(matches, eq(matches.id, predictions.matchId))
    .groupBy(users.id);

  const rows = userIds
    ? await q.where(inArray(users.id, userIds.length ? userIds : [-1]))
    : await q;

  return rows;
}

export async function getLeaderboard(
  scope: Scope,
  userIds?: number[],
): Promise<LeaderboardRow[]> {
  const rows = await baseLeaderboard(scope, userIds);

  // Add bracket bonus for total/stage scopes.
  if (scope.kind === "total" || scope.kind === "stage") {
    const bracket = await bracketPointsByUser();
    // For stage scope, bracket bonus is only added on the "total"-style view;
    // here we add full bracket bonus to total only to avoid double counting.
    if (scope.kind === "total") {
      for (const r of rows) r.points += bracket.get(r.userId) ?? 0;
    }
  }

  return rows
    .filter((r) => r.displayName)
    .sort((a, b) => b.points - a.points || b.predicted - a.predicted);
}

export async function getGroupMemberIds(groupId: number): Promise<number[]> {
  const rows = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(eq(groupMembers.groupId, groupId));
  return rows.map((r) => r.userId);
}

export async function getGroupLeaderboard(
  groupId: number,
  scope: Scope,
): Promise<LeaderboardRow[]> {
  const ids = await getGroupMemberIds(groupId);
  return getLeaderboard(scope, ids);
}
