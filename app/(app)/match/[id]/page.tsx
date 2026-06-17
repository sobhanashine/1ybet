import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatchWithPrediction, isLocked } from "@/lib/matches";
import { getMatchPredictionStats } from "@/lib/match-stats";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { ArrowRight } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import {
  toPersianDigits,
  formatTime,
  formatJalaliDateFull,
} from "@/lib/format";

export const dynamic = "force-dynamic";

function TeamBadge({
  team,
  flag,
}: {
  team: string;
  flag: string | null;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-2 text-center">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-pitch-50/5">
        <TeamFlag teamName={team} flagUrl={flag} className="h-7 w-auto max-w-[36px] object-contain rounded-sm shadow-sm" />
      </div>
      <span className="text-sm font-extrabold leading-tight text-ink">
        {teamFa(team)}
      </span>
    </div>
  );
}

/** A labelled crowd-share bar (home / draw / away). */
function ShareBar({
  label,
  pct,
  tone,
}: {
  label: string;
  pct: number;
  tone: "home" | "draw" | "away";
}) {
  const barColor =
    tone === "home"
      ? "bg-pitch-500"
      : tone === "away"
        ? "bg-sky-500"
        : "bg-white/40";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-extrabold text-ink font-feature-ss01">
          {toPersianDigits(pct)}٪
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const matchId = Number(id);
  if (Number.isNaN(matchId)) notFound();

  const user = await getCurrentUser();
  if (!user) return null;

  const match = await getMatchWithPrediction(matchId, user.id);
  if (!match) notFound();

  const finished = match.status === "FINISHED";
  const locked = isLocked(match.kickoffAt);
  // Always retrieve the crowd distribution stats, even if predictions are still open.
  const stats = await getMatchPredictionStats(matchId);

  return (
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-pitch-600 hover:text-pitch-700 transition">
        <ArrowRight className="h-3.5 w-3.5" />
        {t.common.back}
      </Link>

      {/* match header */}
      <div className="rounded-3xl bg-gradient-to-b from-surface to-surface-2/95 p-5 ring-1 ring-white/10">
        <div className="mb-3 flex items-center justify-between text-xs text-muted">
          <span className="font-bold text-pitch-700">
            {match.groupName ? `گروه ${match.groupName}` : t.stage[match.stage]}
          </span>
          <span suppressHydrationWarning>
            {formatJalaliDateFull(match.kickoffAt)} ·{" "}
            {toPersianDigits(formatTime(match.kickoffAt))}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TeamBadge team={match.homeTeam} flag={match.homeFlag} />
          <div className="flex flex-col items-center">
            {finished ? (
              <span className="font-feature-ss01 rounded-2xl border border-pitch-500/20 bg-pitch-500/5 px-4 py-2 text-2xl font-black text-pitch-700">
                {toPersianDigits(match.homeScore ?? 0)} {t.match.vs}{" "}
                {toPersianDigits(match.awayScore ?? 0)}
              </span>
            ) : (
              <span className="text-lg font-black text-muted">{t.match.vs}</span>
            )}
          </div>
          <TeamBadge team={match.awayTeam} flag={match.awayFlag} />
        </div>

        {/* your prediction */}
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-white/10 pt-3 text-xs">
          <span className="text-muted">{t.match.yourPrediction}:</span>
          {match.predHome != null ? (
            <span className="font-feature-ss01 rounded-lg border border-white/5 bg-white/5 px-2 py-1 font-extrabold text-ink">
              {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
            </span>
          ) : (
            <span className="italic text-muted/60">{t.match.notPredicted}</span>
          )}
        </div>
      </div>

      {/* crowd stats */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-pitch-600">{t.matchStats.crowd}</h2>

        {!stats ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-muted ring-1 ring-white/10">
            {t.matchStats.lockedHint}
          </p>
        ) : stats.total === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-muted ring-1 ring-white/10">
            {t.matchStats.noPredictions}
          </p>
        ) : (
          <>
            <div className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-white/10">
              <ShareBar
                label={`${t.matchStats.win} ${teamFa(match.homeTeam)}`}
                pct={stats.home.pct}
                tone="home"
              />
              <ShareBar label={t.matchStats.draw} pct={stats.draw.pct} tone="draw" />
              <ShareBar
                label={`${t.matchStats.win} ${teamFa(match.awayTeam)}`}
                pct={stats.away.pct}
                tone="away"
              />
              <p className="pt-1 text-center text-[11px] text-muted">
                {toPersianDigits(stats.total)} {t.matchStats.predictors}
              </p>
            </div>

            {/* most common scorelines */}
            <div className="rounded-2xl bg-surface p-4 ring-1 ring-white/10">
              <h3 className="mb-3 text-xs font-bold text-muted">
                {t.matchStats.topScores}
              </h3>
              <div className="flex gap-2">
                {stats.topScores.map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-white/5 py-2.5"
                  >
                    <span className="font-feature-ss01 text-lg font-black text-ink">
                      {toPersianDigits(s.label.replace("-", " - "))}
                    </span>
                    <span className="text-[11px] font-bold text-pitch-700">
                      {toPersianDigits(s.pct)}٪
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* average predicted goals */}
            <div className="flex items-center justify-between rounded-2xl bg-surface p-4 text-sm ring-1 ring-white/10">
              <span className="text-muted">{t.matchStats.avgGoals}</span>
              <span className="font-feature-ss01 font-extrabold text-ink">
                {toPersianDigits(stats.avgHome)} - {toPersianDigits(stats.avgAway)}
              </span>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
