"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { submitPrediction } from "@/app/actions/predictions";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { formatTime, toPersianDigits } from "@/lib/format";
import type { MatchWithPrediction } from "@/lib/matches";
import { Clock, Lock, Check, BarChart3 } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";

type Props = { match: MatchWithPrediction; locked: boolean; isNext?: boolean };

function ScoreBox({
  value,
  onChange,
  disabled,
  onComplete,
  onEnter,
  hasPrediction,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  onComplete?: () => void;
  onEnter?: () => void;
  hasPrediction?: boolean;
}) {
  const handleInputChange = (val: string) => {
    // Sanitize input to only keep digits (English and Persian)
    const clean = val.replace(/[^\d۰-۹]/g, "");
    if (clean === "") {
      onChange("۰");
      return;
    }
    // Convert to English digits first to do slice to max 2 digits
    const englishDigits = clean.replace(/[۰-۹]/g, (d) => {
      const mapping: Record<string, string> = {
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
      };
      return mapping[d] ?? d;
    }).slice(0, 2);

    // Convert back to Persian digits
    const persian = englishDigits.replace(/[0-9]/g, (d) => {
      const mapping = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
      return mapping[Number(d)];
    });

    onChange(persian);

    if (persian.length >= 1 && onComplete) {
      setTimeout(onComplete, 50);
    }
  };

  const toEnglishNumber = (val: string) => {
    const cleanDigits = val.replace(/[۰-۹]/g, (d) => {
      const mapping: Record<string, string> = {
        "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
        "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
      };
      return mapping[d] ?? d;
    });
    return Number(cleanDigits) || 0;
  };

  const handleIncrement = () => {
    if (disabled) return;
    const num = toEnglishNumber(value);
    if (num < 99) {
      onChange(toPersianDigits(num + 1));
    }
  };

  const handleDecrement = () => {
    if (disabled) return;
    const num = toEnglishNumber(value);
    if (num > 0) {
      onChange(toPersianDigits(num - 1));
    }
  };

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <button
        type="button"
        disabled={disabled}
        onClick={handleIncrement}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-pitch-200/20 bg-pitch-50/5 text-ink hover:bg-pitch-500/20 hover:text-pitch-700 active:scale-90 transition disabled:opacity-20 disabled:pointer-events-none text-[10px] font-bold shadow-sm"
      >
        ＋
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={toPersianDigits(value)}
        disabled={disabled}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) {
            onEnter();
          }
        }}
        onChange={(e) => handleInputChange(e.target.value)}
        className={`h-12 w-12 rounded-2xl border text-center text-xl font-extrabold text-ink outline-none transition-all duration-200 focus:border-pitch-500 focus:bg-pitch-500/10 focus:ring-4 focus:ring-pitch-500/20 disabled:opacity-40 font-feature-ss01 hover:scale-105 ${
          hasPrediction
            ? "border-pitch-500/30 bg-pitch-500/5 focus:border-pitch-500"
            : "border-amber-500/30 bg-amber-500/5 focus:border-amber-500 focus:ring-amber-500/20"
        }`}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={handleDecrement}
        className="flex h-6 w-6 items-center justify-center rounded-full border border-pitch-200/20 bg-pitch-50/5 text-ink hover:bg-pitch-500/20 hover:text-pitch-700 active:scale-90 transition disabled:opacity-20 disabled:pointer-events-none text-[10px] font-bold shadow-sm"
      >
        －
      </button>
    </div>
  );
}

export default function MatchCard({ match, locked, isNext }: Props) {
  const finished = match.status === "FINISHED";
  const containerRef = useRef<HTMLDivElement>(null);

  const [home, setHome] = useState(
    match.predHome != null ? toPersianDigits(match.predHome) : "۰",
  );
  const [away, setAway] = useState(
    match.predAway != null ? toPersianDigits(match.predAway) : "۰",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (isNext && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isNext]);

  function save() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const homeDigits = home.replace(/[۰-۹]/g, (d) => {
        const mapping: Record<string, string> = {
          "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
          "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
        };
        return mapping[d] ?? d;
      });
      const awayDigits = away.replace(/[۰-۹]/g, (d) => {
        const mapping: Record<string, string> = {
          "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
          "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
        };
        return mapping[d] ?? d;
      });

      const res = await submitPrediction(match.id, Number(homeDigits), Number(awayDigits));
      if (!res.ok) return setError(res.error ?? t.common.error);
      setSaved(true);
    });
  }

  const canSave = !locked && home !== "" && away !== "" && !pending;

  const hasPrediction = match.predHome != null || saved;
  const isUpcoming = !locked && !finished;
  const isAwaitingResult = locked && !finished;
  const cardBorderClass = isAwaitingResult
    ? hasPrediction
      ? "ring-sky-500/25 hover:ring-sky-500/45 hover:shadow-[0_8px_30px_rgba(14,165,233,0.08)] bg-gradient-to-b from-surface/95 via-surface/98 to-sky-950/10 shadow-[0_2px_16px_rgba(14,165,233,0.02)]"
      : "ring-red-500/15 border-dashed border-red-500/5 bg-gradient-to-b from-surface-2/60 to-surface-2/40 opacity-70"
    : hasPrediction
      ? "ring-pitch-500/25 hover:ring-pitch-500/45 hover:shadow-[0_8px_30px_rgba(22,224,127,0.08)] bg-gradient-to-b from-surface/95 via-surface/98 to-pitch-50/10 shadow-[0_2px_16px_rgba(22,224,127,0.02)]"
      : isUpcoming
        ? "ring-amber-500/30 hover:ring-amber-500/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)] bg-gradient-to-b from-surface/90 to-surface-2/90"
        : "ring-white/5 border-dashed border-white/5 bg-gradient-to-b from-surface-2/60 to-surface-2/40 opacity-70";

  return (
    <div
      ref={containerRef}
      className={`group relative overflow-hidden rounded-3xl p-5 ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${cardBorderClass}`}
    >
      {/* Top accent line representing predicted/unpredicted/missed status */}
      {isAwaitingResult ? (
        hasPrediction ? (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-sky-500/70 to-transparent rounded-t-3xl" />
        ) : (
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent rounded-t-3xl" />
        )
      ) : hasPrediction ? (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-pitch-500/70 to-transparent rounded-t-3xl" />
      ) : isUpcoming ? (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-amber-500/70 to-transparent rounded-t-3xl animate-pulse" />
      ) : (
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent rounded-t-3xl" />
      )}

      {/* Dynamic spotlight glow on card hover */}
      <div
        className={`pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full blur-3xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
          isAwaitingResult
            ? hasPrediction
              ? "bg-sky-500/10"
              : "bg-red-500/5"
            : hasPrediction
              ? "bg-pitch-500/10"
              : isUpcoming
                ? "bg-amber-500/10"
                : "bg-red-500/5"
        }`}
      />

      {/* Header Row */}
      <div className="mb-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          {match.groupName && (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-bold text-muted border border-white/5">
              گروه {match.groupName}
            </span>
          )}
          {finished && (
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-bold text-muted">
              {t.match.finished}
            </span>
          )}
          {!finished && locked && (
            <span className="rounded-full border border-red-500/10 bg-red-500/5 px-2.5 py-0.5 font-bold text-red-400">
              {t.match.locked}
            </span>
          )}
          
          {hasPrediction ? (
            <span className="flex items-center gap-1 rounded-full border border-pitch-500/30 bg-pitch-500/10 px-2.5 py-0.5 font-bold text-pitch-700 shadow-[0_0_8px_rgba(22,224,127,0.1)]">
              <span className="h-1 w-1 rounded-full bg-pitch-500" />
              پیش‌بینی‌شده
            </span>
          ) : (
            <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-bold ${
              isUpcoming
                ? "border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.08)] animate-pulse"
                : "border-red-500/20 bg-red-500/5 text-red-400/70"
            }`}>
              <span className={`h-1 w-1 rounded-full ${isUpcoming ? "bg-amber-500 animate-pulse" : "bg-red-400/70"}`} />
              {isUpcoming ? "ثبت‌نشده" : "پیش‌بینی‌نشده"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-muted">
          <span className="flex items-center gap-1 font-semibold" suppressHydrationWarning>
            <Clock className="h-3.5 w-3.5 opacity-70" />
            {toPersianDigits(formatTime(match.kickoffAt))}
          </span>
        </div>
      </div>

      {/* Grid Match Center */}
      <div className="grid grid-cols-3 items-center py-2">
        {/* Home Team */}
        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 flex items-center justify-center mb-2 overflow-hidden rounded-xl bg-pitch-50/5 transition-transform duration-300 group-hover:scale-110 select-none">
            <TeamFlag teamName={match.homeTeam} flagUrl={match.homeFlag} className="h-6 w-auto max-w-[28px] object-contain rounded-sm shadow-sm" />
          </div>
          <span className="text-sm font-extrabold text-ink leading-tight truncate max-w-[110px]">
            {teamFa(match.homeTeam)}
          </span>
        </div>

        {/* Score Center */}
        <div className="flex flex-col items-center justify-center">
          {finished ? (
            <div className="flex items-center gap-2.5 rounded-2xl bg-pitch-500/5 border border-pitch-500/20 px-4 py-2 text-2xl font-black text-pitch-700 shadow-inner font-feature-ss01 select-none">
              <span>{toPersianDigits(match.homeScore ?? 0)}</span>
              <span className="text-xs font-normal opacity-50">{t.match.vs}</span>
              <span>{toPersianDigits(match.awayScore ?? 0)}</span>
            </div>
          ) : locked ? (
            // Prediction window closed, awaiting kickoff/result: read-only.
            <div className="flex flex-col items-center gap-1.5 select-none">
              {match.predHome != null ? (
                <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-2xl font-black text-ink/85 shadow-inner font-feature-ss01">
                  <span>{toPersianDigits(match.predHome)}</span>
                  <span className="text-xs font-normal opacity-40">{t.match.vs}</span>
                  <span>{toPersianDigits(match.predAway ?? 0)}</span>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-bold text-muted/70">
                  {t.match.notPredicted}
                </div>
              )}
              <span className={`flex items-center gap-1.5 text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${
                hasPrediction
                  ? "text-sky-400/80 bg-sky-500/5 border-sky-500/10 shadow-[0_0_8px_rgba(14,165,233,0.05)]"
                  : "text-red-400/70 bg-red-500/5 border-red-500/10"
              }`}>
                <span className={`h-1 w-1 rounded-full ${hasPrediction ? "bg-sky-400 animate-pulse" : "bg-red-400/70"}`} />
                {t.match.awaitingResult}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <ScoreBox
                value={home}
                onChange={setHome}
                disabled={locked}
                onEnter={save}
                onComplete={() => {
                  const inputs = containerRef.current?.querySelectorAll("input");
                  if (inputs && inputs[1]) {
                    inputs[1].focus();
                    inputs[1].select();
                  }
                }}
                hasPrediction={hasPrediction}
              />
              <span className="text-[10px] font-black text-muted/60 select-none">{t.match.vs}</span>
              <ScoreBox
                value={away}
                onChange={setAway}
                disabled={locked}
                onEnter={save}
                hasPrediction={hasPrediction}
              />
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center text-center">
          <div className="h-10 w-10 flex items-center justify-center mb-2 overflow-hidden rounded-xl bg-pitch-50/5 transition-transform duration-300 group-hover:scale-110 select-none">
            <TeamFlag teamName={match.awayTeam} flagUrl={match.awayFlag} className="h-6 w-auto max-w-[28px] object-contain rounded-sm shadow-sm" />
          </div>
          <span className="text-sm font-extrabold text-ink leading-tight truncate max-w-[110px]">
            {teamFa(match.awayTeam)}
          </span>
        </div>
      </div>

      {/* Prediction / Result Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
        {finished ? (
          <div className="flex w-full items-center justify-between text-xs">
            <span className="text-muted font-medium">
              {t.match.yourPrediction}:{" "}
              {match.predHome != null ? (
                <span className="font-extrabold text-ink font-feature-ss01 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                  {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
                </span>
              ) : (
                <span className="italic opacity-60">{t.match.notPredicted}</span>
              )}
            </span>
            {match.predHome != null && (() => {
              const pts = match.points ?? 0;
              let badgeClass = "bg-white/5 text-muted border border-white/10";
              let text = `${toPersianDigits(pts)} ${t.match.points}`;

              if (pts === 10) {
                badgeClass = "bg-gradient-to-r from-amber-500/10 to-yellow-500/10 text-gold border border-gold/30 shadow-[0_0_12px_rgba(245,197,24,0.15)]";
                text = `🌟 ${toPersianDigits(pts)} ${t.match.points}`;
              } else if (pts === 7) {
                badgeClass = "bg-gradient-to-r from-pitch-500/15 to-emerald-500/15 text-pitch-700 border border-pitch-500/30 shadow-[0_0_12px_rgba(22,224,127,0.1)]";
                text = `🔥 ${toPersianDigits(pts)} ${t.match.points}`;
              } else if (pts === 5) {
                badgeClass = "bg-pitch-500/10 text-pitch-700 border border-pitch-500/20";
                text = `👍 ${toPersianDigits(pts)} ${t.match.points}`;
              } else if (pts === 2) {
                badgeClass = "bg-white/5 text-muted border border-white/10";
              } else if (pts === 0) {
                badgeClass = "bg-red-500/10 text-red-400 border border-red-500/20";
              }
              return (
                <span className={`rounded-full px-3 py-1 font-extrabold text-[10px] tracking-wide ${badgeClass}`}>
                  {text}
                </span>
              );
            })()}
          </div>
        ) : locked ? (
          <div className="flex w-full items-center justify-center">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[11px] font-bold ${
                match.predHome != null
                  ? "border-pitch-500/20 bg-pitch-500/5 text-pitch-700"
                  : "border-white/10 bg-white/5 text-muted"
              }`}
            >
              <Lock className="h-3 w-3" />
              {match.predHome != null
                ? t.match.predictionSaved
                : t.match.predictionMissed}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 w-full">
            {match.predHome != null && !saved && (
              <span className="text-xs text-muted font-medium">
                {t.match.yourPrediction}:{" "}
                <span className="font-extrabold text-ink font-feature-ss01 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                  {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
                </span>
              </span>
            )}

            <button
              onClick={save}
              disabled={!canSave}
              className={`w-full max-w-[200px] rounded-xl py-2.5 text-xs font-bold shadow-md transition-all duration-300 cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-center flex items-center justify-center ${
                saved
                  ? "bg-pitch-500/10 text-pitch-700 border border-pitch-500/30 shadow-none"
                  : "bg-gradient-to-r from-pitch-500 to-pitch-600 text-[#08140e] hover:shadow-[0_4px_12px_rgba(22,224,127,0.25)] hover:from-pitch-600 hover:to-pitch-700"
              }`}
            >
              {pending ? (
                <span className="flex items-center gap-1.5 justify-center">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#08140e] border-t-transparent" />
                  {t.common.loading}
                </span>
              ) : saved ? (
                <span className="flex items-center gap-1 text-pitch-700 font-extrabold justify-center">
                  <Check className="h-3.5 w-3.5" />
                  {t.common.save}
                </span>
              ) : (
                t.match.save
              )}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2.5 text-xs text-red-400 font-bold text-center">{error}</p>}

      <Link
        href={`/match/${match.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 border-t border-white/5 pt-3 text-[11px] font-bold text-muted transition hover:text-pitch-700"
      >
        <BarChart3 className="h-3.5 w-3.5" />
        {t.match.details}
        <span aria-hidden className="mr-0.5">›</span>
      </Link>
    </div>
  );
}
