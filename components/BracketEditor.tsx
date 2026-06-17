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
import { teamFa, teamFlag } from "@/lib/teams-fa";
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
        <div className="rounded-2xl border border-gold/20 bg-gold/5 px-4 py-3 text-center text-xs font-bold text-gold flex items-center justify-center gap-1.5">
          🔒 {t.bracket.locked}
        </div>
      )}

      {/* Step Indicator Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 select-none scrollbar-none">
        {BRACKET_ROUNDS.map((round, index) => {
          const set = picks[round];
          const req = ROUND_PICKS[round];
          const isSelected = activeRound === round;
          const isCompleted = set.size === req;

          let statusBadge = null;
          if (isCompleted) {
            statusBadge = <span className="text-[10px] text-pitch-500 font-black">✓</span>;
          } else if (set.size > 0) {
            statusBadge = <span className="text-[9px] text-amber-500 font-extrabold">{toPersianDigits(set.size)}</span>;
          } else {
            statusBadge = <span className="h-1 w-1 rounded-full bg-muted/40" />;
          }

          return (
            <button
              key={round}
              onClick={() => setActiveRound(round)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-center min-w-[76px] transition-all cursor-pointer ${
                isSelected
                  ? "bg-pitch-500/10 border border-pitch-500/25 text-pitch-700 shadow-sm"
                  : "bg-surface border border-white/5 text-muted hover:text-ink"
              }`}
            >
              <span className="text-[10px] font-black leading-none">{toPersianDigits(index + 1)}</span>
              <span className="text-[11px] font-extrabold leading-none truncate max-w-[65px]">{ROUND_LABEL_FA[round]}</span>
              <div className="mt-0.5 flex h-3.5 items-center justify-center">
                {statusBadge}
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Round Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-5 border border-white/10 shadow-lg">
        <div className="pointer-events-none absolute -top-16 -left-10 h-40 w-40 rounded-full bg-pitch-500/5 blur-3xl" />

        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-ink">
              {ROUND_LABEL_FA[activeRound]}
            </h2>
            <p className="text-xs text-muted mt-1 leading-normal">
              {activeRound === "CHAMPION"
                ? "تیم قهرمان جام جهانی ۲۰۲۶ را پیش‌بینی کنید."
                : `تیم‌های صعودکننده به مرحله ${ROUND_LABEL_FA[activeRound]} را انتخاب کنید.`}
            </p>
          </div>
          <div className="text-end shrink-0">
            <span className="text-[10px] font-bold text-pitch-700 bg-pitch-500/10 border border-pitch-500/20 px-2.5 py-1 rounded-full shadow-[0_0_12px_rgba(22,224,127,0.15)]">
              +{toPersianDigits(ROUND_BONUS[activeRound])} امتیاز
            </span>
          </div>
        </div>

        {/* Progress Tracker */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1.5">
            <span className="text-ink">وضعیت انتخاب</span>
            <span className="text-pitch-700 font-feature-ss01">
              {toPersianDigits(picks[activeRound].size)} از {toPersianDigits(ROUND_PICKS[activeRound])}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-pitch-50/10 overflow-hidden border border-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pitch-500 to-pitch-600 transition-all duration-300 shadow-[0_0_8px_var(--color-pitch-500)]"
              style={{ width: `${(picks[activeRound].size / ROUND_PICKS[activeRound]) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid of Teams or Block Warning */}
      {isPreviousRoundIncomplete && prevRound ? (
        <div className="rounded-3xl border border-white/5 bg-surface p-8 text-center space-y-4 shadow-sm">
          <div className="text-3xl select-none">⚠️</div>
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-ink">مرحله قبلی کامل نیست</h3>
            <p className="text-xs text-muted leading-relaxed max-w-[280px] mx-auto">
              برای پیش‌بینی صعودکنندگان مرحله {ROUND_LABEL_FA[activeRound]}، ابتدا باید تمام {toPersianDigits(ROUND_PICKS[prevRound])} تیم صعودکننده به مرحله {ROUND_LABEL_FA[prevRound]} را انتخاب کنید.
            </p>
          </div>
          <button
            onClick={handlePrev}
            className="rounded-xl border border-pitch-500/20 bg-pitch-500/10 px-4 py-2.5 text-xs font-bold text-pitch-700 hover:bg-pitch-500/20 transition cursor-pointer select-none"
          >
            تکمیل مرحله {ROUND_LABEL_FA[prevRound]}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 xs:grid-cols-3">
          {getRoundPool(activeRound).map((team) => {
            const active = picks[activeRound].has(team);
            const isFull = picks[activeRound].size >= ROUND_PICKS[activeRound];
            const disabled = locked || (!active && isFull);

            return (
              <button
                key={team}
                onClick={() => toggle(activeRound, team)}
                disabled={disabled}
                className={`group relative overflow-hidden rounded-2xl p-3 border transition-all duration-300 text-center select-none cursor-pointer ${
                  active
                    ? "bg-pitch-500/10 border-pitch-500/40 text-pitch-700 shadow-[0_0_15px_rgba(22,224,127,0.08)] scale-[1.02]"
                    : "bg-surface border-white/5 text-ink hover:bg-white/5 hover:border-white/10 disabled:opacity-30 disabled:hover:bg-surface disabled:hover:border-white/5"
                }`}
              >
                {active && (
                  <span className="absolute left-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-pitch-500 shadow-[0_0_8px_var(--color-pitch-500)] animate-pulse" />
                )}
                <span className="block text-3xl mb-1.5 transition-transform duration-300 group-hover:scale-110">
                  {teamFlag(team)}
                </span>
                <span className="block text-xs font-extrabold truncate w-full">
                  {teamFa(team)}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Floating Bottom Wizard Actions Bar */}
      {!locked && (
        <div className="sticky bottom-16 z-10 flex gap-2 rounded-2xl bg-surface-2/80 p-3 backdrop-blur-md border border-white/5 shadow-2xl">
          {hasPrev ? (
            <button
              onClick={handlePrev}
              className="rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-xs font-bold text-ink hover:bg-white/5 transition cursor-pointer select-none active:scale-95"
            >
              قبلی →
            </button>
          ) : (
            <div className="w-[68px]" />
          )}

          <button
            onClick={save}
            disabled={pending}
            className="flex-1 rounded-xl bg-gradient-to-r from-pitch-500 to-pitch-600 py-2.5 text-xs font-bold text-[#08140e] shadow-[0_4px_12px_rgba(22,224,127,0.2)] hover:shadow-[0_6px_16px_rgba(22,224,127,0.3)] hover:from-pitch-600 hover:to-pitch-700 transition active:scale-95 disabled:opacity-50 cursor-pointer select-none text-center flex items-center justify-center"
          >
            {pending ? (
              <span className="flex items-center justify-center gap-1.5">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#08140e] border-t-transparent" />
                {t.common.loading}
              </span>
            ) : saved ? (
              "✓ " + t.bracket.save
            ) : (
              t.bracket.save
            )}
          </button>

          {hasNext ? (
            <button
              onClick={handleNext}
              className="rounded-xl bg-pitch-500/10 border border-pitch-500/20 px-4 py-2.5 text-xs font-bold text-pitch-700 hover:bg-pitch-500/20 transition cursor-pointer select-none active:scale-95"
            >
              ← بعدی
            </button>
          ) : (
            <div className="w-[68px]" />
          )}
        </div>
      )}

      {error && <p className="text-center text-xs text-red-400 font-bold">{error}</p>}
    </div>
  );
}
