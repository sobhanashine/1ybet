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
import { CalendarDays } from "lucide-react";

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

  // Show points even when 0 once the user is in the tournament — they’ve
  // staked in, so the rank pill is meaningful even before scoring starts.
  const pointsLabel =
    userRank > 0 || totalPoints > 0 ? toPersianDigits(totalPoints) : "۰";

  // Only poll the live-scores endpoint when a match is plausibly in progress.
  // On any other day the provider does nothing, so there's zero polling overhead.
  const liveActive = allMatches.some(
    (m) => m.status !== "FINISHED" && isLiveWindow(m.kickoffAt),
  );

  return (
    <div className="space-y-6">
      {/* First-ever app open: bounce a not-yet-registered user to the
          tournament page once. Members (userRank > 0) are never redirected. */}
      <FirstVisitTournamentGate isMember={userRank > 0} />

      <section aria-labelledby="home-welcome-heading" className="card p-5">
        <span className="text-[11px] font-semibold text-pitch-700">
          {t.auth.welcome}
        </span>
        <h1
          id="home-welcome-heading"
          className="mt-1 text-[clamp(1.5rem,5vw,1.875rem)] font-extrabold leading-tight text-ink"
        >
          {user.displayName} <span aria-hidden>👋</span>
        </h1>

        {/* dt/dd pairs carry the label/value semantics; the grid places a
            single divider between cells, RTL-aware via divide-x-reverse. */}
        <dl className="mt-4 grid grid-cols-3 divide-x divide-x-reverse divide-line border-t border-line pt-4">
          <Stat value={pointsLabel} label={t.profile.totalPoints} tone="accent" />
          <Stat
            value={userRank > 0 ? toPersianDigits(userRank) : "—"}
            label={t.tournament.rankLabel}
          />
          <Stat
            value={toPersianDigits(totalPredicted)}
            label={t.profile.predicted}
          />
        </dl>
      </section>

      <EmailReminderBanner hasEmail={!!user.email} />

      <section aria-labelledby="home-fixtures-heading" className="space-y-7">
        <h2 id="home-fixtures-heading" className="section-label px-0.5">
          {t.nav.fixtures}
        </h2>

        {days.length === 0 ? (
          <EmptyFixtures />
        ) : (
          <LiveScoresProvider active={liveActive}>
            {days.map(([day, ms]) => (
              <div key={day} className="space-y-3">
                <div className="flex items-center gap-3 px-0.5">
                  <h3
                    className="m-0 text-sm font-bold text-ink-dim"
                    suppressHydrationWarning
                  >
                    {formatJalaliDate(ms[0].kickoffAt)}
                  </h3>
                  <span aria-hidden className="h-px flex-1 bg-line" />
                  <span className="text-[11px] font-semibold text-muted">
                    {ms.length === 1
                      ? "۱ بازی"
                      : `${toPersianDigits(ms.length)} بازی`}
                  </span>
                </div>
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
              </div>
            ))}
          </LiveScoresProvider>
        )}
      </section>
    </div>
  );
}

/** One label/value stat inside the welcome-card description list. The grid
 *  wrapper handles dividers; this cell renders the pair + spacing only. */
function Stat({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone?: "accent";
}) {
  return (
    <div className="flex flex-col items-center gap-1 px-2">
      <dd
        className={`text-2xl font-black ${
          tone === "accent" ? "text-pitch-700" : "text-ink"
        }`}
      >
        {value}
      </dd>
      <dt className="text-[10.5px] font-semibold text-muted">{label}</dt>
    </div>
  );
}

/** Friendly no-fixtures state. Used when the schedule is empty
 *  (pre-tournament, or all matches finished with no live ones planned). */
function EmptyFixtures() {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-pitch-50 text-pitch-700"
      >
        <CalendarDays className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <p className="text-sm text-ink-dim">{t.leaderboard.empty}</p>
    </div>
  );
}
