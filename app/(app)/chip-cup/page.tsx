import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { maybeAutoSync } from "@/lib/auto-sync";
import {
  getChipLeaderboard,
  getChipStack,
  getOpenMatches,
  getSettledWagers,
  isChipMember,
  settlePendingWagers,
  MIN_WAGER,
  STARTING_STACK,
} from "@/lib/chip-cup";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";
import { teamFa } from "@/lib/teams-fa";
import ChipJoinButton from "@/components/ChipJoinButton";
import ChipWagerForm from "@/components/ChipWagerForm";
import { Coins, Layers, ListOrdered, Trophy } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ChipCupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Pull fresh results, then cash out any wagers whose match has finished.
  await maybeAutoSync();
  await settlePendingWagers();

  const member = await isChipMember(user.id);

  if (!member) {
    const steps = [t.chipCup.how1, t.chipCup.how2, t.chipCup.how3];
    return (
      <div className="space-y-5">
        <section className="card overflow-hidden border-gold/25 p-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Coins className="h-7 w-7" aria-hidden />
          </div>
          <h1 className="text-xl font-extrabold text-ink">{t.chipCup.title}</h1>
          <p className="mt-1 text-xs font-semibold text-gold-dim">{t.chipCup.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">{t.chipCup.intro}</p>
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-sm font-extrabold text-ink">{t.chipCup.howTitle}</h2>
          <ol className="space-y-3">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/12 text-sm font-extrabold text-gold tnum">
                  {toPersianDigits(i + 1)}
                </span>
                <p className="pt-0.5 text-sm font-semibold leading-relaxed text-ink-dim">{step}</p>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
            {t.chipCup.payoutHint}
          </p>
        </section>

        <ChipJoinButton />
        <p className="text-center text-[11px] text-muted">
          {t.chipCup.joinNote} ({toPersianDigits(STARTING_STACK)} {t.chipCup.chips})
        </p>
      </div>
    );
  }

  const [stack, openMatches, settled, leaderboard] = await Promise.all([
    getChipStack(user.id),
    getOpenMatches(user.id),
    getSettledWagers(user.id),
    getChipLeaderboard(),
  ]);

  const rank = leaderboard.findIndex((r) => r.userId === user.id) + 1;
  const available = stack?.chips ?? 0;

  const miniStats = [
    { Icon: Layers, label: t.chipCup.available, value: toPersianDigits(available) },
    { Icon: Coins, label: t.chipCup.atStake, value: toPersianDigits(stack?.atStake ?? 0) },
    { Icon: Trophy, label: t.chipCup.rank, value: rank > 0 ? toPersianDigits(rank) : "—" },
  ];

  return (
    <div className="space-y-6">
      {/* Stack hero */}
      <section className="card overflow-hidden border-gold/25 p-5">
        <div className="flex items-center justify-center gap-1.5 text-gold-dim">
          <Coins className="h-4 w-4" aria-hidden />
          <p className="text-[11px] font-semibold">{t.chipCup.yourStack}</p>
        </div>
        <p className="mt-1 text-center text-5xl font-black text-gold tnum">
          {toPersianDigits(stack?.total ?? 0)}
        </p>
        <div className="mt-5 grid grid-cols-3 divide-x divide-x-reverse divide-line border-t border-line pt-4">
          {miniStats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1 px-2">
              <s.Icon className="h-4 w-4 text-muted" aria-hidden />
              <span className="text-lg font-extrabold text-ink tnum">{s.value}</span>
              <span className="text-[10px] font-semibold text-muted">{s.label}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2 text-[11px] leading-relaxed text-muted">
          {t.chipCup.payoutHint}
        </p>
      </section>

      {/* Open matches to wager on */}
      <section className="space-y-3">
        <h2 className="section-label">{t.chipCup.openMatches}</h2>
        {openMatches.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-muted">{t.chipCup.noOpen}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {openMatches.map((m) => (
              <ChipWagerForm key={m.id} match={m} available={available} minWager={MIN_WAGER} />
            ))}
          </div>
        )}
      </section>

      {/* Settled results */}
      {settled.length > 0 && (
        <section className="space-y-3">
          <h2 className="section-label">{t.chipCup.results}</h2>
          <ol className="card divide-y divide-line overflow-hidden">
            {settled.map((w) => {
              const win = w.delta >= 0;
              return (
                <li key={w.matchId} className="flex items-center gap-3 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {teamFa(w.homeTeam)}{" "}
                      <span className="tnum text-pitch-700">
                        {toPersianDigits(w.homeScore ?? 0)}-{toPersianDigits(w.awayScore ?? 0)}
                      </span>{" "}
                      {teamFa(w.awayTeam)}
                    </p>
                    <p className="text-[11px] text-muted">
                      {t.chipCup.currentWager}:{" "}
                      <span className="tnum">
                        {toPersianDigits(w.predHome)}-{toPersianDigits(w.predAway)}
                      </span>{" "}
                      · {toPersianDigits(w.amount)} {t.chipCup.chips}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-extrabold tnum ${
                      win ? "bg-pitch-500/10 text-pitch-700" : "bg-danger/10 text-danger"
                    }`}
                  >
                    {win ? "+" : ""}
                    {toPersianDigits(w.delta)}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Chip leaderboard */}
      <section className="space-y-3">
        <div className="flex items-center gap-1.5">
          <ListOrdered className="h-4 w-4 text-pitch-700" aria-hidden />
          <h2 className="section-label">{t.chipCup.leaderboard}</h2>
        </div>
        {leaderboard.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-muted">{t.chipCup.empty}</p>
          </div>
        ) : (
          <ol className="card divide-y divide-line overflow-hidden">
            {leaderboard.map((r, i) => {
              const me = r.userId === user.id;
              return (
                <li
                  key={r.userId}
                  className={`flex items-center gap-3 px-3.5 py-3 ${me ? "bg-pitch-50" : ""}`}
                >
                  <span className="w-7 shrink-0 text-center text-sm font-extrabold tnum text-muted">
                    {toPersianDigits(i + 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                    {r.displayName}
                    {me && <span className="mr-1.5 text-xs font-semibold text-pitch-700">(شما)</span>}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-base font-extrabold text-gold tnum">
                    <Coins className="h-3.5 w-3.5" aria-hidden />
                    {toPersianDigits(r.total)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
