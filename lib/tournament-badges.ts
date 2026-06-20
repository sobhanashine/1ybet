import "server-only";
import { db } from "./db";
import { badges, userBadges } from "./db/schema";
import { TOURNAMENT_PODIUM_CODES } from "./badges";
import { getStartMatch, getTournamentLeaderboard } from "./tournament";

/**
 * Award the podium badges (الماسخاله / آرسنال / مشکات) to the current top 3 of
 * the tournament standings.
 *
 * Idempotent: inserts with onConflictDoNothing, so a player keeps a badge once
 * earned. Only players who have actually scored points count — we never hand a
 * podium badge to someone sitting at zero before the tournament has produced
 * any results. Called from the sync job (best-effort).
 */
export async function awardTournamentTop3(): Promise<number> {
  const startMatch = await getStartMatch();
  if (!startMatch) return 0;

  const rows = await getTournamentLeaderboard(startMatch.kickoffAt);
  const top3 = rows.filter((r) => r.points > 0).slice(0, 3);
  if (top3.length === 0) return 0;

  const codeToId = new Map(
    (await db.select({ id: badges.id, code: badges.code }).from(badges)).map(
      (b) => [b.code, b.id] as const,
    ),
  );

  let awarded = 0;
  for (let i = 0; i < top3.length; i++) {
    const badgeId = codeToId.get(TOURNAMENT_PODIUM_CODES[i]);
    if (!badgeId) continue;
    const res = await db
      .insert(userBadges)
      .values({ userId: top3[i].userId, badgeId })
      .onConflictDoNothing()
      .returning({ userId: userBadges.userId });
    awarded += res.length;
  }
  return awarded;
}
