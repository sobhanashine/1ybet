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
import { t } from "@/lib/i18n";
import { toPersianDigits, formatJalaliDate, formatTime } from "@/lib/format";
import TeamFlag from "@/components/TeamFlag";
import { teamFa } from "@/lib/teams-fa";
import Countdown from "@/components/Countdown";
import TournamentGuideButton from "@/components/TournamentGuideButton";
import TournamentRegister from "@/components/TournamentRegister";
import { MarkTournamentIntroSeen } from "@/components/FirstVisitTournamentGate";
import { CheckCircle2, Medal, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TournamentPage() {
  await maybeAutoSync();
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [member, startMatch, memberCount] = await Promise.all([
    isMember(user.id),
    getStartMatch(),
    getMemberCount(),
  ]);

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
