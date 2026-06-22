import Link from "next/link";
import { ChevronLeft, Coins } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getMatchesWithPredictions, isLocked, type MatchWithPrediction } from "@/lib/matches";
import { isLiveWindow } from "@/lib/time";
import { getLeaderboard } from "@/lib/leaderboard";
import { getStartMatch, getTournamentLeaderboard } from "@/lib/tournament";
import { maybeAutoSync } from "@/lib/auto-sync";
import MatchCard from "@/components/MatchCard";
import { LiveScoresProvider } from "@/components/LiveScores";
import EmailReminderBanner from "@/components/EmailReminderBanner";
import { FirstVisitTournamentGate } from "@/components/FirstVisitTournamentGate";
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

  const [leaderboard, allMatches, startMatch] = await Promise.all([
    getLeaderboard({ kind: "total" }),
    getMatchesWithPredictions(user.id),
    getStartMatch(),
  ]);

  const userRow = leaderboard.find((r) => r.userId === user.id);
  const totalPoints = userRow?.points ?? 0;
  const totalPredicted = userRow?.predicted ?? 0;

  // Rank shown to users is their position in the prize tournament standings
  // (the general leaderboard page was retired). 0 when they haven't joined.
  const tournamentRows = startMatch
    ? await getTournamentLeaderboard(startMatch.kickoffAt)
    : [];
  const userRank = tournamentRows.findIndex((r) => r.userId === user.id) + 1;

  const days = groupByDay(allMatches);
  const nextMatchId = allMatches.find((m) => m.status !== "FINISHED")?.id;

  // Only poll the live-scores endpoint when a match is plausibly in progress.
  // On any other day the provider does nothing, so there's zero polling overhead.
  const liveActive = allMatches.some(
    (m) => m.status !== "FINISHED" && isLiveWindow(m.kickoffAt),
  );

  const stats = [
    { label: t.profile.totalPoints, value: totalPoints > 0 || userRank > 0 ? toPersianDigits(totalPoints) : "۰" },
    { label: t.tournament.rankLabel, value: userRank > 0 ? toPersianDigits(userRank) : "—" },
    { label: "پیش‌بینی‌ها", value: toPersianDigits(totalPredicted) },
  ];

  return (
    <div className="space-y-6">
      {/* First-ever app open: bounce a not-yet-registered user to the
          tournament page once. Members (userRank > 0) are never redirected. */}
      <FirstVisitTournamentGate isMember={userRank > 0} />

      {/* Welcome / stats */}
      <div className="card p-5">
        <div className="mb-4">
          <span className="text-xs font-semibold text-pitch-700">{t.auth.welcome}</span>
          <h1 className="mt-1 text-2xl font-extrabold text-ink">{user.displayName} 👋</h1>
        </div>
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line border-t border-line pt-4">
          {stats.map((s) => (
            <div key={s.label} className="px-2 text-center">
              <span className="block text-3xl font-black text-pitch-700 tnum">{s.value}</span>
              <span className="mt-1 block text-[11px] font-semibold text-muted">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* New mode: poker-style chip wagering on predictions. */}
      <Link
        href="/chip-cup"
        className="card flex items-center gap-3 border-gold/30 bg-gold/5 p-4 transition-colors hover:bg-gold/10"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Coins className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
            {t.chipCup.title}
            <span className="rounded-full bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-gold-dim">
              {t.common.new}
            </span>
          </p>
          <p className="truncate text-[11px] text-muted">{t.chipCup.tagline}</p>
        </div>
        <ChevronLeft className="h-4 w-4 shrink-0 text-gold" aria-hidden />
      </Link>

      {/* Promote the email-reminder opt-in to users who haven't added an email */}
      <EmailReminderBanner hasEmail={!!user.email} />

      <div className="space-y-7">
        <h2 className="section-label px-0.5">{t.nav.fixtures}</h2>

        {days.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">{t.leaderboard.empty}</p>
          </div>
        ) : (
          <LiveScoresProvider active={liveActive}>
            {days.map(([day, ms]) => (
              <section key={day} className="space-y-3">
                <h3 className="flex items-center gap-3 px-0.5 text-sm font-bold text-ink-dim" suppressHydrationWarning>
                  {formatJalaliDate(ms[0].kickoffAt)}
                  <span className="h-px flex-1 bg-line" />
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
            ))}
          </LiveScoresProvider>
        )}
      </div>
    </div>
  );
}
