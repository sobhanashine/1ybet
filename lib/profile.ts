import "server-only";
import { sql, eq } from "drizzle-orm";
import { db } from "./db";
import { predictions, bracketPicks, badges, userBadges } from "./db/schema";

export async function getUserTotalPoints(userId: number): Promise<number> {
  const [pred] = await db
    .select({ total: sql<number>`coalesce(sum(${predictions.points}), 0)::int` })
    .from(predictions)
    .where(eq(predictions.userId, userId));
  const [brk] = await db
    .select({ total: sql<number>`coalesce(sum(${bracketPicks.points}), 0)::int` })
    .from(bracketPicks)
    .where(eq(bracketPicks.userId, userId));
  return (pred?.total ?? 0) + (brk?.total ?? 0);
}

export type EarnedBadge = {
  code: string;
  titleFa: string;
  descFa: string;
  icon: string | null;
};

export async function getUserBadges(userId: number): Promise<EarnedBadge[]> {
  return db
    .select({
      code: badges.code,
      titleFa: badges.titleFa,
      descFa: badges.descFa,
      icon: badges.icon,
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(userBadges.earnedAt);
}
