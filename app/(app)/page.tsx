import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMatchesWithPredictions } from "@/lib/matches";
import { getLeaderboard } from "@/lib/leaderboard";
import { isUpcoming } from "@/lib/time";
import MatchCard from "@/components/MatchCard";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [leaderboard, allMatches] = await Promise.all([
    getLeaderboard({ kind: "total" }),
    getMatchesWithPredictions(user.id),
  ]);

  const userRow = leaderboard.find((r) => r.userId === user.id);
  const totalPoints = userRow?.points ?? 0;
  const userRank = userRow ? leaderboard.findIndex((r) => r.userId === user.id) + 1 : 0;
  const totalPredicted = userRow?.predicted ?? 0;

  const openMatches = allMatches
    .filter((m) => isUpcoming(m.kickoffAt) && m.status !== "FINISHED")
    .slice(0, 6);

  return (
    <div className="space-y-5">
      {/* Tactical Turf Welcome Stats Card */}
      <div className="rounded-2xl bg-white p-5 ring-1 ring-black/5 transition-all duration-200 hover:ring-black/10">
        <div className="mb-4">
          <span className="text-xs font-semibold text-muted">{t.auth.welcome}</span>
          <h1 className="text-xl font-bold text-ink mt-0.5">{user.displayName} 👋</h1>
        </div>
        <div className="grid grid-cols-3 gap-2 divide-x divide-x-reverse divide-black/5 border-t border-black/5 pt-4">
          <div className="text-center">
            <span className="block text-[10px] font-semibold text-muted mb-1">{t.profile.totalPoints}</span>
            <span className="text-2xl font-black text-pitch-600 font-feature-ss01">{toPersianDigits(totalPoints)}</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] font-semibold text-muted mb-1">{t.leaderboard.title}</span>
            <span className="text-2xl font-black text-pitch-600 font-feature-ss01">
              {userRank > 0 ? `${toPersianDigits(userRank)}` : "—"}
            </span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] font-semibold text-muted mb-1">پیش‌بینی‌ها</span>
            <span className="text-2xl font-black text-pitch-600 font-feature-ss01">{toPersianDigits(totalPredicted)}</span>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-pitch-600 tracking-wider uppercase">{t.match.upcoming}</h2>
          <Link href="/fixtures" className="text-xs font-semibold text-pitch-500 hover:text-pitch-600 transition">
            همه بازی‌ها ←
          </Link>
        </div>
        {openMatches.length === 0 ? (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-black/5">
            <p className="text-sm text-muted">{t.leaderboard.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openMatches.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
