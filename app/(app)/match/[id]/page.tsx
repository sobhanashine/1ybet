import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMatchWithPrediction, isLocked } from "@/lib/matches";
import { isLiveWindow } from "@/lib/time";
import { getMatchPredictionStats } from "@/lib/match-stats";
import { getMatchAnalysis, type GameAnalysis, type FormResult } from "@/lib/analyze";
import { fetchMatchHead2Head, type Head2Head } from "@/lib/football-api";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { ArrowRight, BarChart3 } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { LiveScoresProvider } from "@/components/LiveScores";
import MatchScore from "@/components/MatchScore";
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
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-2">
        <TeamFlag teamName={team} flagUrl={flag} className="h-7 w-auto max-w-[36px] rounded-sm object-contain" />
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
        ? "bg-info"
        : "bg-muted";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink-dim">{label}</span>
        <span className="font-extrabold text-ink tnum">
          {toPersianDigits(pct)}٪
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-line bg-surface-2">
        <div
          className={`h-full rounded-full ${barColor} transition-[width] duration-[var(--dur)] ease-[var(--ease-out)]`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Recent form as coloured W/D/L pills (oldest → newest). */
function FormDots({ form }: { form: FormResult[] }) {
  if (form.length === 0) {
    return <span className="text-[11px] text-muted">—</span>;
  }
  const tone: Record<FormResult, string> = {
    W: "bg-pitch-500 text-pitch-ink",
    D: "bg-muted/30 text-ink-dim",
    L: "bg-danger/80 text-white",
  };
  const label: Record<FormResult, string> = { W: "ب", D: "م", L: "خ" };
  return (
    <div className="flex gap-1" dir="ltr">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-extrabold ${tone[r]}`}
          aria-label={r}
        >
          {label[r]}
        </span>
      ))}
    </div>
  );
}

/** One team's analysis column: name, group standing summary, recent form. */
function AnalysisColumn({
  team,
  analysis,
  align,
}: {
  team: string;
  analysis: GameAnalysis["home"];
  align: "start" | "end";
}) {
  const s = analysis.standing;
  return (
    <div
      className={`flex flex-1 flex-col gap-2 ${align === "end" ? "items-end text-right" : "items-start text-left"}`}
    >
      <span className="text-sm font-extrabold text-ink">{teamFa(team)}</span>
      {s ? (
        <div className="text-[11px] font-semibold text-muted">
          {s.group && (
            <span className="text-pitch-700">
              {t.analyze.groupPos} {toPersianDigits(s.position)}
            </span>
          )}
          <span className="mx-1 text-line-strong">·</span>
          {toPersianDigits(s.points)} {t.analyze.points}
        </div>
      ) : (
        <span className="text-[11px] text-muted">{t.analyze.noStanding}</span>
      )}
      <FormDots form={analysis.form} />
    </div>
  );
}

/** The computed lean, phrased as a short Persian verdict. */
function verdictText(g: GameAnalysis): string {
  if (g.lean.side === "even") return t.analyze.even;
  const team = g.lean.side === "home" ? g.match.homeTeam : g.match.awayTeam;
  const edge = g.lean.strength === "clear" ? t.analyze.edgeClear : t.analyze.edgeSlight;
  return `${edge} ${teamFa(team)}`;
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

  // Standings + recent form + computed lean (moved here from the old /analyze
  // page). Best-effort — never blocks the page if standings can't be fetched.
  const analysis = await getMatchAnalysis(matchId, user.id);

  // Head-to-head history from football-data.org (free tier). Best-effort: a
  // missing API key, rate limit or outage must never break the page.
  let h2h: Head2Head | null = null;
  if (match.extId) {
    try {
      h2h = await fetchMatchHead2Head(match.extId);
    } catch (e) {
      console.error("head-to-head fetch failed:", e instanceof Error ? e.message : e);
    }
  }

  // Poll for the live score only while this match is plausibly in progress.
  const liveActive = !finished && isLiveWindow(match.kickoffAt);

  return (
    <LiveScoresProvider active={liveActive}>
    <div className="space-y-5">
      <Link href="/" className="inline-flex items-center gap-1 text-xs font-bold text-pitch-700 transition-colors hover:text-pitch-500">
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        {t.common.back}
      </Link>

      {/* match header */}
      <div className="card p-5">
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
            <MatchScore
              extId={match.extId}
              finished={finished}
              homeScore={match.homeScore}
              awayScore={match.awayScore}
            />
          </div>
          <TeamBadge team={match.awayTeam} flag={match.awayFlag} />
        </div>

        {/* your prediction */}
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-line pt-3 text-xs">
          <span className="text-muted">{t.match.yourPrediction}:</span>
          {match.predHome != null ? (
            <span className="tnum rounded-md border border-line bg-surface-2 px-2 py-1 font-extrabold text-ink">
              {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
            </span>
          ) : (
            <span className="italic text-muted">{t.match.notPredicted}</span>
          )}
        </div>
      </div>

      {/* analysis: group standing, recent form, computed lean */}
      {analysis && (
        <section className="space-y-3">
          <h2 className="section-label flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-pitch-700" aria-hidden />
            {t.analyze.matchTitle}
          </h2>
          <div className="card space-y-3 p-4">
            <div className="flex items-start gap-3">
              <AnalysisColumn team={match.homeTeam} analysis={analysis.home} align="start" />
              <span className="mt-1 text-xs font-bold text-muted">{t.match.vs}</span>
              <AnalysisColumn team={match.awayTeam} analysis={analysis.away} align="end" />
            </div>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2">
              <p className="text-[11px] font-bold text-muted">
                {t.analyze.verdict}:{" "}
                <span className="text-ink">{verdictText(analysis)}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* crowd stats */}
      <section className="space-y-3">
        <h2 className="section-label">{t.matchStats.crowd}</h2>

        {!stats ? (
          <div className="card p-4 text-sm text-muted">{t.matchStats.lockedHint}</div>
        ) : stats.total === 0 ? (
          <div className="card p-4 text-sm text-muted">{t.matchStats.noPredictions}</div>
        ) : (
          <>
            <div className="card space-y-3 p-4">
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
            <div className="card p-4">
              <h3 className="mb-3 text-xs font-bold text-muted">
                {t.matchStats.topScores}
              </h3>
              <div className="flex gap-2">
                {stats.topScores.map((s) => (
                  <div
                    key={s.label}
                    className="flex flex-1 flex-col items-center gap-1 rounded-[var(--radius-md)] border border-line bg-surface-2 py-2.5"
                  >
                    <span className="tnum text-lg font-black text-ink">
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
            <div className="card flex items-center justify-between p-4 text-sm">
              <span className="text-muted">{t.matchStats.avgGoals}</span>
              <span className="tnum font-extrabold text-ink">
                {toPersianDigits(stats.avgHome)} - {toPersianDigits(stats.avgAway)}
              </span>
            </div>
          </>
        )}
      </section>

      {/* head-to-head history (football-data.org, free tier) */}
      {h2h && h2h.numberOfMatches > 0 && (
        <section className="space-y-3">
          <h2 className="section-label">{t.matchStats.h2hTitle}</h2>
          <div className="card space-y-4 p-4">
            <div className="flex justify-around text-center">
              <div className="flex flex-col">
                <span className="tnum text-2xl font-black text-ink">
                  {toPersianDigits(h2h.numberOfMatches)}
                </span>
                <span className="text-[11px] font-bold text-muted">
                  {t.matchStats.h2hMatches}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="tnum text-2xl font-black text-ink">
                  {toPersianDigits(h2h.totalGoals)}
                </span>
                <span className="text-[11px] font-bold text-muted">
                  {t.matchStats.h2hGoals}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-line pt-3">
              <TeamRecord team={match.homeTeam} record={h2h.home} tone="home" />
              <TeamRecord team={match.awayTeam} record={h2h.away} tone="away" />
            </div>
            <p className="text-center text-[10px] text-muted">
              {t.matchStats.h2hSource}
            </p>
          </div>
        </section>
      )}
    </div>
    </LiveScoresProvider>
  );
}

/** One team's win/draw/loss tally across previous encounters. */
function TeamRecord({
  team,
  record,
  tone,
}: {
  team: string;
  record: Head2Head["home"];
  tone: "home" | "away";
}) {
  const accent = tone === "home" ? "text-pitch-700" : "text-info";
  const cells: { value: number; label: string }[] = [
    { value: record.wins, label: t.matchStats.h2hWins },
    { value: record.draws, label: t.matchStats.h2hDraws },
    { value: record.losses, label: t.matchStats.h2hLosses },
  ];
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
      <p className={`mb-2 truncate text-center text-xs font-extrabold ${accent}`}>
        {teamFa(team)}
      </p>
      <div className="flex justify-around">
        {cells.map((c) => (
          <div key={c.label} className="flex flex-col items-center">
            <span className="tnum text-base font-black text-ink">
              {toPersianDigits(c.value)}
            </span>
            <span className="text-[10px] font-medium text-muted">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
