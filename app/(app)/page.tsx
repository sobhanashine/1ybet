import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMatchesWithPredictions } from "@/lib/matches";
import { getLeaderboard } from "@/lib/leaderboard";
import { isUpcoming, isLocked } from "@/lib/time";
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
      {/* Welcome / stats card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-5 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-pitch-500/15 blur-3xl" />
        <div className="relative mb-4">
          <span className="text-xs font-semibold text-pitch-700">{t.auth.welcome}</span>
          <h1 className="mt-0.5 text-2xl font-extrabold text-ink">{user.displayName} 👋</h1>
        </div>
        <div className="relative grid grid-cols-3 gap-2 divide-x divide-x-reverse divide-white/10 border-t border-white/10 pt-4">
          <div className="text-center">
            <span className="mb-1 block text-[10px] font-semibold text-muted">{t.profile.totalPoints}</span>
            <span className="text-2xl font-black text-pitch-700 font-feature-ss01">{toPersianDigits(totalPoints)}</span>
          </div>
          <div className="text-center">
            <span className="mb-1 block text-[10px] font-semibold text-muted">{t.leaderboard.title}</span>
            <span className="text-2xl font-black text-pitch-700 font-feature-ss01">
              {userRank > 0 ? toPersianDigits(userRank) : "—"}
            </span>
          </div>
          <div className="text-center">
            <span className="mb-1 block text-[10px] font-semibold text-muted">پیش‌بینی‌ها</span>
            <span className="text-2xl font-black text-pitch-700 font-feature-ss01">{toPersianDigits(totalPredicted)}</span>
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
          <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-white/10">
            <p className="text-sm text-muted">{t.leaderboard.empty}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openMatches.map((m) => (
              <MatchCard key={m.id} match={m} locked={isLocked(m.kickoffAt)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
