import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { maybeAutoSync } from "@/lib/auto-sync";
import {
  getMemberCount,
  getStartMatch,
  isMember,
  TOURNAMENT_ENTRY_FEE_TOMAN,
} from "@/lib/tournament";
import { fetchWorldCupMatches, type NormalizedMatch } from "@/lib/football-api";
import { t } from "@/lib/i18n";
import { toPersianDigits, formatJalaliDate, formatTime } from "@/lib/format";
import TeamFlag from "@/components/TeamFlag";
import { teamFa } from "@/lib/teams-fa";
import Countdown from "@/components/Countdown";
import TournamentGuideButton from "@/components/TournamentGuideButton";
import TournamentRegister from "@/components/TournamentRegister";
import { MarkTournamentIntroSeen } from "@/components/FirstVisitTournamentGate";
import { CheckCircle2, ChevronLeft, Medal, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

// ── Knockout roadmap helpers ──────────────────────────────────────────────────

const STAGE_ORDER: NormalizedMatch["stage"][] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

// Short labels for the stage progress pills
const STAGE_SHORT: Record<NormalizedMatch["stage"], string> = {
  LAST_32: "۳۲",
  LAST_16: "۱۶",
  QUARTER_FINAL: "۸",
  SEMI_FINAL: "۴",
  THIRD_PLACE: "۳م",
  FINAL: "فینال",
  GROUP: "",
};

/** Find the earliest round that has LIVE or SCHEDULED matches; else the last finished round. */
function activeStage(
  grouped: Map<NormalizedMatch["stage"], NormalizedMatch[]>,
): NormalizedMatch["stage"] | null {
  for (const stage of STAGE_ORDER) {
    const ms = grouped.get(stage);
    if (!ms) continue;
    if (ms.some((m) => m.status === "LIVE" || m.status === "SCHEDULED")) return stage;
  }
  // All done — return the FINAL stage if present, else last with matches
  for (const stage of [...STAGE_ORDER].reverse()) {
    if (grouped.has(stage)) return stage;
  }
  return null;
}

function KnockoutRoadmap({
  grouped,
}: {
  grouped: Map<NormalizedMatch["stage"], NormalizedMatch[]>;
}) {
  const current = activeStage(grouped);
  const stagesPresent = STAGE_ORDER.filter((s) => grouped.has(s));

  if (stagesPresent.length === 0) {
    return (
      <section className="card p-5 text-center">
        <p className="text-sm text-muted">{t.tournament.knockoutNotStarted}</p>
      </section>
    );
  }

  const currentMatches = current ? (grouped.get(current) ?? []) : [];
  const sorted = [...currentMatches].sort(
    (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
  );

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-2.5">
        <h2 className="text-sm font-extrabold text-ink">{t.tournament.knockoutTitle}</h2>
      </div>

      {/* Stage progress bar */}
      <div className="flex items-center gap-1 overflow-x-auto px-4 py-3 scrollbar-none" dir="ltr">
        {stagesPresent.map((stage, i) => {
          const isCurrent = stage === current;
          const isDone =
            current !== null &&
            STAGE_ORDER.indexOf(stage) < STAGE_ORDER.indexOf(current);
          return (
            <div key={stage} className="flex shrink-0 items-center gap-1">
              {i > 0 && (
                <ChevronLeft
                  className={`h-3 w-3 shrink-0 ${isDone || isCurrent ? "text-pitch-500" : "text-line-strong"}`}
                  aria-hidden
                />
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold transition-colors ${
                  isCurrent
                    ? "bg-pitch-500 text-pitch-ink"
                    : isDone
                    ? "bg-pitch-500/15 text-pitch-700"
                    : "bg-surface-2 text-muted"
                }`}
              >
                {STAGE_SHORT[stage]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Current round matches (compact) */}
      {current && sorted.length > 0 && (
        <div className="border-t border-line">
          <p className="px-4 pt-2.5 text-[11px] font-bold text-muted">
            {t.stage[current]}
          </p>
          <ol className="divide-y divide-line">
            {sorted.map((m) => {
              const homeWon = m.status === "FINISHED" && m.winnerTeam === m.homeTeam;
              const awayWon = m.status === "FINISHED" && m.winnerTeam === m.awayTeam;
              return (
                <li
                  key={m.extId}
                  className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <TeamFlag
                      teamName={m.homeTeam}
                      flagUrl={m.homeFlag}
                      className="h-4 w-auto max-w-[22px] shrink-0 rounded-sm object-contain"
                    />
                    <span
                      className={`truncate text-xs font-bold ${homeWon ? "text-pitch-700" : "text-ink"}`}
                    >
                      {teamFa(m.homeTeam)}
                    </span>
                  </div>

                  <div className="shrink-0 text-center">
                    {m.status === "SCHEDULED" ? (
                      <span className="text-[10px] font-semibold text-muted tnum">
                        {formatTime(m.kickoffAt)}
                      </span>
                    ) : m.status === "LIVE" ? (
                      <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                        {t.knockout.live}
                      </span>
                    ) : (
                      <span className="text-xs font-black text-ink tnum" dir="ltr">
                        {m.homeScore ?? "–"} – {m.awayScore ?? "–"}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <span
                      className={`truncate text-xs font-bold ${awayWon ? "text-pitch-700" : "text-ink"}`}
                    >
                      {teamFa(m.awayTeam)}
                    </span>
                    <TeamFlag
                      teamName={m.awayTeam}
                      flagUrl={m.awayFlag}
                      className="h-4 w-auto max-w-[22px] shrink-0 rounded-sm object-contain"
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <div className="border-t border-line px-4 py-2.5">
        <Link
          href="/knockout"
          className="flex items-center justify-center gap-1 text-xs font-bold text-pitch-700"
        >
          {t.tournament.knockoutSeeAll}
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default async function TournamentPage() {
  await maybeAutoSync();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [member, startMatch, memberCount, allMatches] = await Promise.all([
    isMember(user.id),
    getStartMatch(),
    getMemberCount(),
    fetchWorldCupMatches().catch(() => [] as NormalizedMatch[]),
  ]);

  // Build knockout grouped map for the roadmap section
  const knockoutGrouped = new Map<NormalizedMatch["stage"], NormalizedMatch[]>();
  for (const m of allMatches) {
    if (m.stage === "GROUP") continue;
    const list = knockoutGrouped.get(m.stage) ?? [];
    list.push(m);
    knockoutGrouped.set(m.stage, list);
  }

  // The whole pot — every entry fee — goes to the winner.
  const pot = memberCount * TOURNAMENT_ENTRY_FEE_TOMAN;
  const potFa = new Intl.NumberFormat("fa-IR").format(pot);

  const steps = [t.tournament.how1, t.tournament.how2, t.tournament.how3];

  return (
    <div className="space-y-5">
      {/* Reaching this page counts as having seen the one-time intro. */}
      <MarkTournamentIntroSeen />

      {/* Hero */}
      <section className="card overflow-hidden border-gold/25 p-5">
        <div className="flex items-center gap-2 text-gold">
          <Trophy className="h-5 w-5" aria-hidden />
          <h1 className="text-lg font-extrabold text-ink">
            {t.tournament.title}
          </h1>
        </div>

        {/* Live pot — sum of every entry fee, awarded to the winner. */}
        <div className="mt-3 rounded-[var(--radius-md)] border border-gold/25 bg-gold/10 p-3.5 text-center">
          <p className="text-[11px] font-semibold text-gold-dim">
            {t.tournament.potLabel}
          </p>
          <p className="mt-1 text-2xl font-black text-gold tnum">
            {potFa}{" "}
            <span className="text-sm font-bold">{t.tournament.toman}</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-muted">
            {t.tournament.potNote}
          </p>
        </div>

        <p className="mt-2.5 text-center text-xs font-semibold text-ink-dim">
          {t.tournament.entryFee}:{" "}
          <span className="font-bold text-ink">
            {t.tournament.entryFeeAmount}
          </span>
        </p>

        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-muted">
          <Users className="h-4 w-4" aria-hidden />
          <span>
            {toPersianDigits(memberCount)} {t.tournament.members}
          </span>
          {member && (
            <span className="ms-auto rounded-full bg-pitch-500/10 px-2.5 py-1 text-[11px] font-bold text-pitch-700">
              {t.tournament.joined}
            </span>
          )}
        </div>

        {/* Short video explaining how to register and the rules. */}
        <TournamentGuideButton />
      </section>

      {/* How to take part */}
      <section className="card p-5">
        <h2 className="mb-3 text-sm font-extrabold text-ink">
          {t.tournament.howTitle}
        </h2>
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pitch-500/12 text-sm font-extrabold text-pitch-700 tnum">
                {toPersianDigits(i + 1)}
              </span>
              <p className="pt-0.5 text-sm font-semibold leading-relaxed text-ink-dim">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Countdown + starting match */}
      {startMatch && (
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-extrabold text-ink">
            {t.tournament.startMatch}
          </h2>

          <div className="mb-4 flex items-center justify-center gap-3 rounded-[var(--radius-md)] bg-surface-2 py-3.5">
            <div className="flex items-center gap-2">
              <TeamFlag
                teamName={startMatch.homeTeam}
                flagUrl={startMatch.homeFlag}
              />
              <span className="text-sm font-bold text-ink">
                {teamFa(startMatch.homeTeam)}
              </span>
            </div>
            <span className="text-xs font-bold text-muted">{t.match.vs}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-ink">
                {teamFa(startMatch.awayTeam)}
              </span>
              <TeamFlag
                teamName={startMatch.awayTeam}
                flagUrl={startMatch.awayFlag}
              />
            </div>
          </div>

          <p className="mb-3 text-center text-xs font-semibold text-muted">
            {formatJalaliDate(startMatch.kickoffAt)} •{" "}
            {formatTime(startMatch.kickoffAt)}
          </p>

          <Countdown target={startMatch.kickoffAt} />
        </section>
      )}

      {/* Live knockout bracket roadmap */}
      <KnockoutRoadmap grouped={knockoutGrouped} />

      {/* Call to action: register (non-members) or jump to the standings. */}
      {member ? (
        <section className="card border-pitch-500/25 p-5 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-pitch-500/12 text-pitch-700">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </div>
          <p className="text-sm font-extrabold text-ink">
            {t.tournament.registered}
          </p>
          <Link
            href="/leaderboard"
            className="btn btn-secondary mt-4 flex w-full items-center justify-center gap-2 py-3"
          >
            <Medal className="h-5 w-5" aria-hidden />
            {t.tournament.viewLeaderboard}
          </Link>
        </section>
      ) : (
        <TournamentRegister />
      )}
    </div>
  );
}
