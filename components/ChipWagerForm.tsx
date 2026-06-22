"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Coins } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { toPersianDigits, formatTime } from "@/lib/format";
import { placeWagerAction } from "@/app/actions/chip-cup";
import type { ChipOpenMatch } from "@/lib/chip-cup";

type Props = { match: ChipOpenMatch; available: number; minWager: number };

function clampScore(n: number) {
  return Math.min(99, Math.max(0, n));
}

/** A compact ± score stepper. */
function ScoreStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-base font-bold text-muted transition-colors hover:bg-elevated hover:text-ink active:scale-95 disabled:opacity-30";
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={btn} onClick={() => onChange(clampScore(value - 1))} aria-label="کاهش">
        −
      </button>
      <span className="w-8 text-center text-2xl font-black text-ink tnum">
        {toPersianDigits(value)}
      </span>
      <button type="button" className={btn} onClick={() => onChange(clampScore(value + 1))} aria-label="افزایش">
        ＋
      </button>
    </div>
  );
}

export default function ChipWagerForm({ match, available, minWager }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [home, setHome] = useState(match.wager?.predHome ?? 0);
  const [away, setAway] = useState(match.wager?.predAway ?? 0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  // Editing an open wager refunds the old stake, so it's spendable again.
  const maxAmount = available + (match.wager?.amount ?? 0);
  const [amount, setAmount] = useState(
    Math.min(maxAmount, match.wager?.amount ?? minWager),
  );

  const presets = [...new Set([minWager, 100, 250, 500])]
    .filter((p) => p >= minWager && p <= maxAmount)
    .sort((a, b) => a - b);

  const canBet = maxAmount >= minWager;

  function place() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await placeWagerAction(match.id, home, away, amount);
      if (res.ok) {
        setSaved(true);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="card space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] text-muted">
        <span className="font-bold text-pitch-700">
          {match.groupName ? `گروه ${match.groupName}` : match.stage}
        </span>
        <span className="flex items-center gap-1" suppressHydrationWarning>
          <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
          {toPersianDigits(formatTime(match.kickoffAt))}
        </span>
      </div>

      {/* Teams + score steppers (RTL: home on the right) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamFlag teamName={match.homeTeam} flagUrl={match.homeFlag} className="h-6 w-auto max-w-[32px] rounded-sm object-contain" />
          <span className="max-w-[90px] truncate text-xs font-bold text-ink">{teamFa(match.homeTeam)}</span>
        </div>
        <div className="flex items-center gap-2">
          <ScoreStepper value={home} onChange={setHome} />
          <span className="text-xs font-black text-muted">{t.match.vs}</span>
          <ScoreStepper value={away} onChange={setAway} />
        </div>
        <div className="flex flex-col items-center gap-1.5 text-center">
          <TeamFlag teamName={match.awayTeam} flagUrl={match.awayFlag} className="h-6 w-auto max-w-[32px] rounded-sm object-contain" />
          <span className="max-w-[90px] truncate text-xs font-bold text-ink">{teamFa(match.awayTeam)}</span>
        </div>
      </div>

      {canBet ? (
        <>
          {/* Stake amount */}
          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
                <Coins className="h-4 w-4 text-gold" aria-hidden />
                {t.chipCup.amount}
              </span>
              <span className="text-lg font-black text-gold tnum">
                {toPersianDigits(amount)}{" "}
                <span className="text-[11px] font-bold text-gold-dim">{t.chipCup.chips}</span>
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-bold tnum transition-colors ${
                    amount === p
                      ? "border-gold/50 bg-gold/15 text-gold"
                      : "border-line bg-surface-2 text-muted hover:text-ink"
                  }`}
                >
                  {toPersianDigits(p)}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(maxAmount)}
                className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-bold transition-colors ${
                  amount === maxAmount
                    ? "border-gold/50 bg-gold/15 text-gold"
                    : "border-line bg-surface-2 text-muted hover:text-ink"
                }`}
              >
                {t.chipCup.allIn}
              </button>
            </div>
          </div>

          <button
            onClick={place}
            disabled={pending}
            className={`btn w-full py-2.5 text-sm ${
              saved && !match.wager ? "border border-pitch-200 bg-pitch-50 text-pitch-700" : "btn-primary"
            }`}
          >
            {pending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : saved ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                {t.chipCup.saved}
              </>
            ) : match.wager ? (
              t.chipCup.update
            ) : (
              t.chipCup.place
            )}
          </button>

          {match.wager && !saved && (
            <p className="text-center text-[11px] text-muted">
              {t.chipCup.currentWager}:{" "}
              <span className="font-bold text-ink tnum">
                {toPersianDigits(match.wager.predHome)}-{toPersianDigits(match.wager.predAway)}
              </span>{" "}
              ·{" "}
              <span className="font-bold text-gold tnum">
                {toPersianDigits(match.wager.amount)} {t.chipCup.chips}
              </span>
            </p>
          )}
        </>
      ) : (
        <p className="border-t border-line pt-3 text-center text-xs font-semibold text-danger">
          چیپ کافی نداری
        </p>
      )}

      {error && <p className="text-center text-xs font-bold text-danger">{error}</p>}
    </div>
  );
}
