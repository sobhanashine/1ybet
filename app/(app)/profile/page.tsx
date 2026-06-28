import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { getUserTournamentBreakdown, getUserBadges } from "@/lib/profile";
import { getStartMatch, getTournamentLeaderboard } from "@/lib/tournament";
import { POINTS } from "@/lib/scoring";
import NotificationToggle from "@/components/NotificationToggle";
import { BadgeArt } from "@/components/BadgeArt";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";
import { Percent, Target, Trophy, LogOut } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // The whole profile is tournament-scoped: points count from the start match
  // onward, exactly like the tournament standings (no all-time / bracket mix).
  const startMatch = await getStartMatch();
  const startIso = startMatch?.kickoffAt ?? null;

  const [breakdown, tournamentRows, earned] = await Promise.all([
    startIso
      ? getUserTournamentBreakdown(user.id, startIso)
      : getUserTournamentBreakdown(user.id, new Date().toISOString()),
    startIso ? getTournamentLeaderboard(startIso) : Promise.resolve([]),
    getUserBadges(user.id),
  ]);

  const rank = tournamentRows.findIndex((r) => r.userId === user.id) + 1;
  const accuracy =
    breakdown.scored > 0
      ? Math.round((breakdown.correct / breakdown.scored) * 100)
      : 0;

  // Scoring tiers, brightest (exact) first — the spine of the breakdown.
  const tiers = [
    {
      value: POINTS.EXACT,
      label: t.profile.exact,
      count: breakdown.exact,
      bar: "bg-gold",
      pill: "bg-gold/15 text-gold",
      num: "text-gold",
    },
    {
      value: POINTS.DIFF,
      label: t.profile.diff,
      count: breakdown.diff,
      bar: "bg-pitch-500",
      pill: "bg-pitch-500/12 text-pitch-700",
      num: "text-pitch-700",
    },
    {
      value: POINTS.WINNER,
      label: t.profile.winner,
      count: breakdown.winner,
      bar: "bg-info",
      pill: "bg-info/15 text-info",
      num: "text-info",
    },
    {
      value: POINTS.FLOOR,
      label: t.profile.miss,
      count: breakdown.miss,
      bar: "bg-muted/60",
      pill: "bg-muted/15 text-muted",
      num: "text-muted",
    },
  ];

  const miniStats = [
    {
      Icon: Trophy,
      label: t.profile.rank,
      value: rank > 0 ? toPersianDigits(rank) : "—",
    },
    {
      Icon: Target,
      label: t.profile.predicted,
      value: toPersianDigits(breakdown.scored),
    },
    {
      Icon: Percent,
      label: t.profile.accuracy,
      value: breakdown.scored > 0 ? `${toPersianDigits(accuracy)}٪` : "—",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-2xl">
          👤
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-ink">
            {user.displayName}
          </h1>
          {user.country && (
            <p className="text-sm text-muted" dir="ltr">
              {user.country}
            </p>
          )}
        </div>
      </div>

      {/* Tournament points hero */}
      <section className="card overflow-hidden border-gold/25 p-5">
        <div className="flex items-center justify-center gap-1.5 text-gold-dim">
          <Trophy className="h-4 w-4" aria-hidden />
          <p className="text-[11px] font-semibold">
            {t.profile.tournamentPoints}
          </p>
        </div>
        <p className="mt-1 text-center text-5xl font-black text-gold tnum">
          {toPersianDigits(breakdown.total)}
        </p>

        <div className="mt-5 grid grid-cols-3 divide-x divide-x-reverse divide-line border-t border-line pt-4">
          {miniStats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-2">
              <s.Icon className="h-4 w-4 text-muted" aria-hidden />
              <span className="text-lg font-extrabold text-ink tnum">
                {s.value}
              </span>
              <span className="text-[10px] font-semibold text-muted">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Where the tournament points came from */}
      <section className="space-y-3">
        <h2 className="section-label">{t.profile.pointsTitle}</h2>

        {breakdown.scored === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm leading-relaxed text-muted">
              {t.profile.pointsEmpty}
            </p>
          </div>
        ) : (
          <div className="card space-y-4 p-4">
            {/* Contribution bar — each tier's share of the tournament points. */}
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-2"
              dir="ltr"
            >
              {tiers.map(
                (tier) =>
                  tier.count > 0 && (
                    <span
                      key={tier.value}
                      className={`h-full ${tier.bar}`}
                      style={{
                        width: `${((tier.count * tier.value) / breakdown.total) * 100}%`,
                      }}
                    />
                  ),
              )}
            </div>

            <ul className="space-y-2.5">
              {tiers.map((tier) => (
                <li key={tier.value} className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-xs font-extrabold tnum ${tier.pill}`}
                  >
                    {toPersianDigits(tier.value)}
                  </span>
                  <span className="flex-1 text-sm font-semibold text-ink-dim">
                    {tier.label}
                  </span>
                  <span className="text-xs font-semibold text-muted tnum">
                    {toPersianDigits(tier.count)} {t.profile.times}
                  </span>
                  <span
                    className={`w-12 text-left text-sm font-extrabold tnum ${tier.num}`}
                  >
                    {toPersianDigits(tier.count * tier.value)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Badges */}
      <section className="space-y-3">
        <h2 className="section-label">{t.profile.badges}</h2>
        {earned.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-muted">{t.leaderboard.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {earned.map((b) => (
              <div
                key={b.code}
                className="card flex flex-col items-center gap-1.5 p-3 text-center"
                title={b.descFa}
              >
                <BadgeArt code={b.code} fallback={b.icon} size={40} />
                <span className="text-[11px] font-semibold leading-tight text-ink-dim">
                  {b.titleFa}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <NotificationToggle hasEmail={!!user.email} />

      {/* Account actions — moved here since the top header was removed. */}
      <div className="space-y-2 pt-1">
        {user.isAdmin && (
          <Link
            href="/admin"
            className="btn btn-secondary w-full justify-center gap-2 py-2.5 text-sm"
          >
            🛠️ {t.nav.admin}
          </Link>
        )}
        <form action={logout}>
          <button className="btn btn-ghost w-full justify-center gap-2 py-2.5 text-sm text-danger hover:bg-danger/10">
            <LogOut className="h-4 w-4" aria-hidden />
            {t.nav.logout}
          </button>
        </form>
      </div>
    </div>
  );
}
