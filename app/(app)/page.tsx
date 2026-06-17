import { getCurrentUser } from "@/lib/auth";
import { getMatchesWithPredictions, isLocked, type MatchWithPrediction } from "@/lib/matches";
import { getLeaderboard } from "@/lib/leaderboard";
import { maybeAutoSync } from "@/lib/auto-sync";
import { getPollResults, PRIZE_POOL_POLL } from "@/lib/polls";
import MatchCard from "@/components/MatchCard";
import EmailReminderBanner from "@/components/EmailReminderBanner";
import PollCard from "@/components/PollCard";
import { t } from "@/lib/i18n";
import { toPersianDigits, formatJalaliDate, tehranDayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

function groupByDay(ms: MatchWithPrediction[]) {
  const groups = new Map<string, MatchWithPrediction[]>();
  for (const m of ms) {
    const key = tehranDayKey(m.kickoffAt);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
  }
  return [...groups.entries()];
}

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Pull fresh results & score predictions if a match has finished since the
  // last load — so scores and rank update without depending on an external cron.
  await maybeAutoSync();

  const [leaderboard, allMatches, pollResults] = await Promise.all([
    getLeaderboard({ kind: "total" }),
    getMatchesWithPredictions(user.id),
    getPollResults(PRIZE_POOL_POLL, user.id),
  ]);

  const userRow = leaderboard.find((r) => r.userId === user.id);
  const totalPoints = userRow?.points ?? 0;
  const userRank = userRow ? leaderboard.findIndex((r) => r.userId === user.id) + 1 : 0;
  const totalPredicted = userRow?.predicted ?? 0;

  const days = groupByDay(allMatches);
  const nextMatchId = allMatches.find((m) => m.status !== "FINISHED")?.id;

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

      {/* Promote the email-reminder opt-in to users who haven't added an email */}
      <EmailReminderBanner hasEmail={!!user.email} />

      {/* Gauge appetite for a paid winner-takes-all prize pool */}
      <PollCard initial={pollResults} />

      <div className="space-y-6">
        <h2 className="text-xs font-bold text-pitch-600 tracking-wider uppercase px-1">{t.nav.fixtures}</h2>

        {days.length === 0 ? (
          <div className="rounded-2xl bg-surface p-6 text-center ring-1 ring-white/10">
            <p className="text-sm text-muted">{t.leaderboard.empty}</p>
          </div>
        ) : (
          days.map(([day, ms]) => (
            <section key={day} className="space-y-3">
              <h3 className="text-sm font-semibold text-pitch-600 px-1" suppressHydrationWarning>
                {formatJalaliDate(ms[0].kickoffAt)}
              </h3>
              <div className="space-y-3">
                {ms.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    locked={isLocked(m.kickoffAt)}
                    isNext={m.id === nextMatchId}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
