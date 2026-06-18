"use client";

import { useState, useTransition } from "react";
import { saveBracket } from "@/app/actions/bracket";
import {
  BRACKET_ROUNDS,
  ROUND_PICKS,
  ROUND_LABEL_FA,
  ROUND_BONUS,
  type BracketRound,
} from "@/lib/bracket";
import { teamFa } from "@/lib/teams-fa";
import TeamFlag from "@/components/TeamFlag";
import { Check } from "lucide-react";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

type Props = {
  pool: string[];
  initial: Record<BracketRound, string[]>;
  locked: boolean;
};

export default function BracketEditor({ pool, initial, locked }: Props) {
  const [picks, setPicks] = useState<Record<BracketRound, Set<string>>>(() => {
    const out = {} as Record<BracketRound, Set<string>>;
    for (const r of BRACKET_ROUNDS) out[r] = new Set(initial[r] ?? []);
    return out;
  });
  const [activeRound, setActiveRound] = useState<BracketRound>(BRACKET_ROUNDS[0]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const currentRoundIdx = BRACKET_ROUNDS.indexOf(activeRound);
  const hasPrev = currentRoundIdx > 0;
  const hasNext = currentRoundIdx < BRACKET_ROUNDS.length - 1;
  const prevRound = hasPrev ? BRACKET_ROUNDS[currentRoundIdx - 1] : null;

  const isPreviousRoundIncomplete = hasPrev && prevRound && 
    picks[prevRound].size < ROUND_PICKS[prevRound];

  const handleNext = () => {
    if (hasNext) {
      setActiveRound(BRACKET_ROUNDS[currentRoundIdx + 1]);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setActiveRound(BRACKET_ROUNDS[currentRoundIdx - 1]);
    }
  };

  function toggle(round: BracketRound, team: string) {
    if (locked) return;
    setSaved(false);
    setPicks((prev) => {
      const next = { ...prev, [round]: new Set(prev[round]) };
      const set = next[round];
      let isRemoved = false;
      if (set.has(team)) {
        set.delete(team);
        isRemoved = true;
      } else if (set.size < ROUND_PICKS[round]) {
        set.add(team);
      }

      // If removed, automatically prune from all subsequent rounds!
      if (isRemoved) {
        const roundIdx = BRACKET_ROUNDS.indexOf(round);
        for (let i = roundIdx + 1; i < BRACKET_ROUNDS.length; i++) {
          const nextRound = BRACKET_ROUNDS[i];
          if (prev[nextRound].has(team)) {
            next[nextRound] = new Set(prev[nextRound]);
            next[nextRound].delete(team);
          }
        }
      }
      return next;
    });
  }

  function save() {
    setError("");
    startTransition(async () => {
      const payload = Object.fromEntries(
        BRACKET_ROUNDS.map((r) => [r, [...picks[r]]]),
      ) as Record<BracketRound, string[]>;
      const res = await saveBracket(payload);
      if (!res.ok) return setError(res.error ?? t.common.error);
      setSaved(true);
    });
  }

  const getRoundPool = (round: BracketRound): string[] => {
    const roundIdx = BRACKET_ROUNDS.indexOf(round);
    if (roundIdx === 0) {
      return pool;
    }
    const previousRound = BRACKET_ROUNDS[roundIdx - 1];
    return Array.from(picks[previousRound]);
  };

  return (
    <div className="space-y-6">
      {locked && (
        <div className="flex items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-gold/30 bg-gold/10 px-4 py-3 text-center text-xs font-bold text-gold">
          🔒 {t.bracket.locked}
        </div>
      )}

      {/* Step Indicator Tabs */}
      <div className="scrollbar-none flex select-none items-center gap-2 overflow-x-auto pb-1">
        {BRACKET_ROUNDS.map((round, index) => {
          const set = picks[round];
          const req = ROUND_PICKS[round];
          const isSelected = activeRound === round;
          const isCompleted = set.size === req;

          let statusBadge = null;
          if (isCompleted) {
            statusBadge = <span className="text-[11px] font-black text-pitch-500">✓</span>;
          } else if (set.size > 0) {
            statusBadge = <span className="text-[10px] font-extrabold text-warn">{toPersianDigits(set.size)}</span>;
          } else {
            statusBadge = <span className="h-1 w-1 rounded-full bg-muted/50" />;
          }

          return (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              aria-current={isSelected ? "step" : undefined}
              className={`flex min-w-[76px] cursor-pointer flex-col items-center gap-1 rounded-[var(--radius-md)] border px-3 py-2 text-center transition-colors duration-[var(--dur)] ${
                isSelected
                  ? "border-pitch-200 bg-pitch-50 text-pitch-700"
                  : "border-line bg-surface text-muted hover:text-ink"
              }`}
            >
              <span className="text-[10px] font-black leading-none tnum">{toPersianDigits(index + 1)}</span>
              <span className="max-w-[65px] truncate text-[11px] font-extrabold leading-none">{ROUND_LABEL_FA[round]}</span>
              <span className="mt-0.5 flex h-3.5 items-center justify-center">{statusBadge}</span>
            </button>
          );
        })}
      </div>

      {/* Active Round Card */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-extrabold text-ink">
              {ROUND_LABEL_FA[activeRound]}
            </h2>
            <p className="mt-1 text-xs leading-normal text-muted">
              {activeRound === "CHAMPION"
                ? "تیم قهرمان جام جهانی ۲۰۲۶ را پیش‌بینی کنید."
                : `تیم‌های صعودکننده به مرحله ${ROUND_LABEL_FA[activeRound]} را انتخاب کنید.`}
            </p>
          </div>
          <span className="chip shrink-0 border-pitch-200 bg-pitch-50 text-pitch-700">
            +{toPersianDigits(ROUND_BONUS[activeRound])} امتیاز
          </span>
        </div>

        {/* Progress Tracker */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
            <span className="text-ink-dim">وضعیت انتخاب</span>
            <span className="text-pitch-700 tnum">
              {toPersianDigits(picks[activeRound].size)} از {toPersianDigits(ROUND_PICKS[activeRound])}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-line bg-surface-2">
            <div
              className="h-full rounded-full bg-pitch-500 transition-[width] duration-[var(--dur)] ease-[var(--ease-out)]"
              style={{ width: `${(picks[activeRound].size / ROUND_PICKS[activeRound]) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Teams or Block Warning */}
      {isPreviousRoundIncomplete && prevRound ? (
        <div className="card space-y-4 p-8 text-center">
          <div className="select-none text-3xl">⚠️</div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-ink">مرحله قبلی کامل نیست</h3>
            <p className="mx-auto max-w-[280px] text-xs leading-relaxed text-muted">
              برای پیش‌بینی صعودکنندگان مرحله {ROUND_LABEL_FA[activeRound]}، ابتدا باید تمام {toPersianDigits(ROUND_PICKS[prevRound])} تیم صعودکننده به مرحله {ROUND_LABEL_FA[prevRound]} را انتخاب کنید.
            </p>
          </div>
          <button onClick={handlePrev} className="btn btn-secondary mx-auto text-xs">
            تکمیل مرحله {ROUND_LABEL_FA[prevRound]}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 min-[380px]:grid-cols-3">
          {getRoundPool(activeRound).map((team) => {
            const active = picks[activeRound].has(team);
            const isFull = picks[activeRound].size >= ROUND_PICKS[activeRound];
            const disabled = locked || (!active && isFull);

            return (
              <button
                key={team}
                onClick={() => toggle(activeRound, team)}
                disabled={disabled}
                aria-pressed={active}
                className={`relative select-none rounded-[var(--radius-lg)] border p-3 text-center transition-colors duration-[var(--dur)] ${
                  active
                    ? "border-pitch-200 bg-pitch-50 text-pitch-700"
                    : "border-line bg-surface text-ink hover:bg-elevated disabled:opacity-30 disabled:hover:bg-surface"
                }`}
              >
                {active && (
                  <Check className="absolute end-2 top-2 h-3.5 w-3.5 text-pitch-500" aria-hidden />
                )}
                <span className="mb-1.5 flex justify-center">
                  <TeamFlag teamName={team} className="h-8 w-auto max-w-[38px] rounded-sm object-contain" />
                </span>
                <span className="block w-full truncate text-xs font-extrabold">
                  {teamFa(team)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky Wizard Actions Bar */}
      {!locked && (
        <div className="sticky bottom-[76px] z-[var(--z-nav)] flex gap-2 rounded-[var(--radius-lg)] border border-line-strong bg-surface-2/90 p-3 backdrop-blur-md">
          {hasPrev ? (
            <button onClick={handlePrev} className="btn btn-secondary text-xs">
              قبلی →
            </button>
          ) : (
            <div className="w-[68px]" />
          )}

          <button onClick={save} disabled={pending} className="btn btn-primary flex-1 text-xs">
            {pending ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                {t.common.loading}
              </>
            ) : saved ? (
              "✓ " + t.bracket.save
            ) : (
              t.bracket.save
            )}
          </button>

          {hasNext ? (
            <button
              onClick={handleNext}
              className="btn border border-pitch-200 bg-pitch-50 px-4 text-xs text-pitch-700 hover:bg-elevated"
            >
              ← بعدی
            </button>
          ) : (
            <div className="w-[68px]" />
          )}
        </div>
      )}

      {error && <p className="text-center text-xs font-bold text-danger">{error}</p>}
    </div>
  );
}
