import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { maybeAutoSync } from "@/lib/auto-sync";
import {
  getMemberCount,
  getStartMatch,
  getTournamentLeaderboard,
  isMember,
  TOURNAMENT_ENTRY_FEE_TOMAN,
} from "@/lib/tournament";
import { t } from "@/lib/i18n";
import { toPersianDigits, formatJalaliDate, formatTime } from "@/lib/format";
import TeamFlag from "@/components/TeamFlag";
import { teamFa } from "@/lib/teams-fa";
import Countdown from "@/components/Countdown";
import TournamentJoinModal from "@/components/TournamentJoinModal";
import TournamentGuideButton from "@/components/TournamentGuideButton";
import { Trophy, Users } from "lucide-react";

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

  const rows = startMatch
    ? await getTournamentLeaderboard(startMatch.kickoffAt)
    : [];
  const myRank = rows.findIndex((r) => r.userId === user.id) + 1;

  // The whole pot — every entry fee — goes to the winner.
  const pot = memberCount * TOURNAMENT_ENTRY_FEE_TOMAN;
  const potFa = new Intl.NumberFormat("fa-IR").format(pot);

  return (
    <div className="space-y-5">
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

      {/* Standings */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-ink">
            {t.tournament.standings}
          </h2>
          {member && myRank > 0 && (
            <span className="text-xs font-bold text-pitch-700">
              {t.tournament.yourRank}: {toPersianDigits(myRank)}
            </span>
          )}
        </div>

        {rows.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">{t.tournament.empty}</p>
          </div>
        ) : (
          <ol className="card divide-y divide-line overflow-hidden">
            {rows.map((r, i) => {
              const me = r.userId === user.id;
              const rank = i + 1;
              const onPodium = rank <= 3;
              const medal =
                rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
              return (
                <li
                  key={r.userId}
                  className={`flex items-center gap-3 px-3.5 py-3 ${me ? "bg-pitch-50" : ""}`}
                >
                  <span
                    className={`flex w-7 shrink-0 justify-center text-sm font-extrabold tnum ${
                      onPodium ? "text-gold" : "text-muted"
                    }`}
                  >
                    {medal ?? toPersianDigits(rank)}
                  </span>
                  <span className="flex-1 truncate text-sm font-bold text-ink">
                    {r.displayName}
                    {me && (
                      <span className="mr-1.5 text-xs font-semibold text-pitch-700">
                        (شما)
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-base font-extrabold text-pitch-700 tnum">
                    {toPersianDigits(r.points)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* First-visit join gate (non-members only). */}
      {!member && <TournamentJoinModal />}
    </div>
  );
}
