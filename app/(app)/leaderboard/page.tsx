import Link from "next/link";
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
import { toPersianDigits } from "@/lib/format";
import { TournamentCrest } from "@/components/BadgeArt";
import { TOURNAMENT_PODIUM_CODES, tournamentPodiumTitle } from "@/lib/badges";
import { Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

/**
 * The prize-tournament standings — moved off the tournament page into its own
 * bottom-nav tab. Members only; points count from the start match's kickoff.
 */
export default async function LeaderboardPage() {
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

  const pot = memberCount * TOURNAMENT_ENTRY_FEE_TOMAN;
  const potFa = new Intl.NumberFormat("fa-IR").format(pot);

  return (
    <div className="space-y-5">
      {/* Compact pot + your-rank header for motivation. */}
      <section className="card flex items-center justify-between gap-3 border-gold/25 p-4">
        <div className="flex items-center gap-2 text-gold">
          <Trophy className="h-5 w-5" aria-hidden />
          <div>
            <h1 className="text-base font-extrabold text-ink">
              {t.tournament.standings}
            </h1>
            <p className="text-[11px] font-semibold text-gold-dim tnum">
              {potFa} {t.tournament.toman}
            </p>
          </div>
        </div>
        {member && myRank > 0 && (
          <span className="rounded-full bg-pitch-500/10 px-3 py-1.5 text-xs font-bold text-pitch-700">
            {t.tournament.yourRank}: {toPersianDigits(myRank)}
          </span>
        )}
      </section>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">{t.tournament.empty}</p>
          {!member && (
            <Link href="/tournament" className="btn btn-primary mt-4 inline-flex">
              {t.tournament.registerCta}
            </Link>
          )}
        </div>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden">
          {rows.map((r, i) => {
            const me = r.userId === user.id;
            const rank = i + 1;
            const onPodium = rank <= 3;
            return (
              <li
                key={r.userId}
                className={`flex items-center gap-3 px-3.5 py-3 ${me ? "bg-pitch-50" : ""}`}
              >
                <span className="flex w-7 shrink-0 justify-center text-sm font-extrabold tnum text-muted">
                  {onPodium ? (
                    <TournamentCrest code={TOURNAMENT_PODIUM_CODES[rank - 1]} />
                  ) : (
                    toPersianDigits(rank)
                  )}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-bold text-ink">
                    {r.displayName}
                    {me && (
                      <span className="mr-1.5 text-xs font-semibold text-pitch-700">
                        (شما)
                      </span>
                    )}
                  </span>
                  {onPodium && tournamentPodiumTitle(rank) && (
                    <span className="truncate text-[11px] font-extrabold text-gold">
                      {tournamentPodiumTitle(rank)}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-base font-extrabold text-pitch-700 tnum">
                  {toPersianDigits(r.points)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
