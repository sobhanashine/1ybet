import { sql, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { predictions } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getMatchesWithPredictions } from "@/lib/matches";
import { isUpcoming } from "@/lib/time";
import MatchCard from "@/components/MatchCard";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

async function getTotalPoints(userId: number): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${predictions.points}), 0)::int` })
    .from(predictions)
    .where(eq(predictions.userId, userId));
  return row?.total ?? 0;
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [total, all] = await Promise.all([
    getTotalPoints(user.id),
    getMatchesWithPredictions(user.id),
  ]);

  const openMatches = all
    .filter((m) => isUpcoming(m.kickoffAt) && m.status !== "FINISHED")
    .slice(0, 6);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-pitch-500 p-5 text-white">
        <p className="text-sm opacity-90">
          {t.auth.welcome}، {user.displayName} 👋
        </p>
        <div className="mt-3 flex items-end gap-2">
          <span className="text-4xl font-bold">{toPersianDigits(total)}</span>
          <span className="mb-1 text-sm opacity-90">{t.profile.totalPoints}</span>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-pitch-600">{t.match.upcoming}</h2>
        {openMatches.length === 0 ? (
          <p className="text-sm text-muted">{t.leaderboard.empty}</p>
        ) : (
          openMatches.map((m) => <MatchCard key={m.id} match={m} />)
        )}
      </section>
    </div>
  );
}
