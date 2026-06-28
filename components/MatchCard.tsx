"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { submitPrediction } from "@/app/actions/predictions";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { formatTime, toPersianDigits } from "@/lib/format";
import type { MatchWithPrediction } from "@/lib/matches";
import { Clock, Lock, Check, BarChart3, ChevronLeft } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { useLiveScore } from "@/components/LiveScores";

type Props = { match: MatchWithPrediction; locked: boolean; isNext?: boolean };

const FA_TO_EN: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};
const toEnDigits = (val: string) => val.replace(/[۰-۹]/g, (d) => FA_TO_EN[d] ?? d);

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
    // Keep only digits (English or Persian)
    const clean = val.replace(/[^\d۰-۹]/g, "");
    if (clean === "") {
      onChange("۰");
      return;
    }
    const englishDigits = toEnDigits(clean).slice(0, 2);
    onChange(toPersianDigits(englishDigits));
    if (englishDigits.length >= 1 && onComplete) {
      setTimeout(onComplete, 50);
    }
  };

  const toNum = (val: string) => Number(toEnDigits(val)) || 0;

  const step = (delta: number) => {
    if (disabled) return;
    const next = Math.min(99, Math.max(0, toNum(value) + delta));
    onChange(toPersianDigits(next));
  };

  const stepBtn =
    "flex h-6 w-9 items-center justify-center rounded-md border border-line-strong bg-surface-2 text-sm font-bold text-muted transition-colors duration-[var(--dur-fast)] hover:bg-elevated hover:text-ink active:scale-95 disabled:pointer-events-none disabled:opacity-25";

  return (
    <div className="flex select-none flex-col items-center gap-1.5">
      <button type="button" disabled={disabled} onClick={() => step(1)} className={stepBtn} aria-label="افزایش">
        ＋
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        aria-label="نتیجه"
        value={toPersianDigits(value)}
        disabled={disabled}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        onChange={(e) => handleInputChange(e.target.value)}
        className={`h-14 w-14 rounded-[var(--radius-md)] border text-center text-2xl font-extrabold text-ink outline-none transition-[border-color,background-color] duration-[var(--dur)] focus:border-pitch-500 focus:bg-pitch-50 disabled:opacity-40 tnum ${
          hasPrediction
            ? "border-pitch-200 bg-pitch-50"
            : "border-line-strong bg-surface-2"
        }`}
      />
      <button type="button" disabled={disabled} onClick={() => step(-1)} className={stepBtn} aria-label="کاهش">
        －
      </button>
    </div>
  );
}

export default function MatchCard({ match, locked, isNext }: Props) {
  const finished = match.status === "FINISHED";
  const live = useLiveScore(match.extId);
  // A live in-play score only matters until the match is finished/scored.
  const showLive = !finished && !!live;
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
        containerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isNext]);

  function save() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await submitPrediction(
        match.id,
        Number(toEnDigits(home)),
        Number(toEnDigits(away)),
      );
      if (!res.ok) return setError(res.error ?? t.common.error);
      setSaved(true);
    });
  }

  const canSave = !locked && home !== "" && away !== "" && !pending;
  const hasPrediction = match.predHome != null || saved;
  const isUpcoming = !locked && !finished;
  const isAwaitingResult = locked && !finished;

  // One status drives chip + border tone. No side stripes, no glow.
  const status: {
    label: string;
    tone: "live" | "predicted" | "open" | "awaiting" | "missed" | "finished";
  } = showLive
    ? { label: t.match.live, tone: "live" }
    : finished
      ? { label: t.match.finished, tone: "finished" }
      : isAwaitingResult
        ? hasPrediction
          ? { label: t.match.awaitingResult, tone: "awaiting" }
          : { label: t.match.predictionMissed, tone: "missed" }
        : hasPrediction
          ? { label: "پیش‌بینی‌شده", tone: "predicted" }
          : { label: "ثبت‌نشده", tone: "open" };

  const cardStyleByTone: Record<
    typeof status.tone,
    { border: string; bg: string }
  > = {
    live: {
      border: "border border-solid border-danger/40",
      bg: "bg-surface",
    },
    predicted: {
      border: "border border-solid border-pitch-200/80 border-[1.5px]",
      bg: "bg-surface",
    },
    open: {
      border: "border-dashed border-[1.8px] border-warn/70",
      bg: "bg-surface-2/60",
    },
    awaiting: {
      border: "border border-solid border-info/30",
      bg: "bg-surface",
    },
    missed: {
      border: "border border-solid border-danger/20",
      bg: "bg-surface-2/40",
    },
    finished: {
      border: "border border-solid border-line",
      bg: "bg-surface-2/20",
    },
  };

  const chipByTone: Record<typeof status.tone, string> = {
    live: "border-danger/30 bg-danger/10 text-danger",
    predicted: "border-pitch-200 bg-pitch-50/60 text-pitch-700",
    open: "border-warn/35 bg-warn/10 text-warn",
    awaiting: "border-info/30 bg-info/10 text-info",
    missed: "border-danger/25 bg-danger/10 text-danger",
    finished: "border-line bg-surface-2 text-muted",
  };
  const dimmed = status.tone === "missed";
  const style = cardStyleByTone[status.tone];

  return (
    <div
      ref={containerRef}
      className={`rounded-[var(--radius-lg)] p-4 transition-all duration-[var(--dur)] ${style.border} ${style.bg} ${dimmed ? "opacity-70" : ""}`}
    >
      {/* Header: group + status (start) · kickoff time (end) */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {match.groupName && (
            <span className="chip">گروه {match.groupName}</span>
          )}
          <span className={`chip ${chipByTone[status.tone]}`}>
            {status.tone === "predicted" ? (
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
            ) : (
              <span className={`chip-dot ${status.tone === "open" || status.tone === "live" ? "animate-pulse" : ""}`} />
            )}
            {status.label}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted" suppressHydrationWarning>
          <Clock className="h-3.5 w-3.5 opacity-70" aria-hidden />
          {toPersianDigits(formatTime(match.kickoffAt))}
        </span>
      </div>

      {/* Match center: home · score · away (RTL → home on the right) */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-2">
            <TeamFlag teamName={match.homeTeam} flagUrl={match.homeFlag} className="h-7 w-auto max-w-[30px] rounded-sm object-contain" />
          </span>
          <span className="max-w-[100px] truncate text-sm font-bold leading-tight text-ink">
            {teamFa(match.homeTeam)}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center px-1">
          {showLive ? (
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 px-3.5 py-2 text-2xl font-black text-danger tnum">
                <span>{toPersianDigits(live!.home)}</span>
                <span className="text-sm font-normal text-muted">{t.match.vs}</span>
                <span>{toPersianDigits(live!.away)}</span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-danger">
                <span className="chip-dot animate-pulse" />
                {t.match.live}
              </span>
            </div>
          ) : finished ? (
            (() => {
              const isKnockout = match.stage !== "GROUP";
              const drawnAt90 =
                isKnockout &&
                match.homeScore != null &&
                match.awayScore != null &&
                match.homeScore === match.awayScore;
              return (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-pitch-200 bg-pitch-50 px-3.5 py-2 text-2xl font-black text-pitch-700 tnum">
                    <span>{toPersianDigits(match.homeScore ?? 0)}</span>
                    <span className="text-sm font-normal text-muted">{t.match.vs}</span>
                    <span>{toPersianDigits(match.awayScore ?? 0)}</span>
                  </div>
                  {isKnockout && (
                    <span className="text-[10px] font-semibold text-muted">
                      {t.match.regulationLabel}
                    </span>
                  )}
                  {drawnAt90 && match.winnerTeam && (
                    <span className="text-[10px] font-bold text-pitch-700">
                      {t.match.advancedLabel}: {teamFa(match.winnerTeam)}
                    </span>
                  )}
                </div>
              );
            })()
          ) : locked ? (
            match.predHome != null ? (
              <div className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-line-strong bg-surface-2 px-3.5 py-2 text-2xl font-black text-ink/90 tnum">
                <span>{toPersianDigits(match.predHome)}</span>
                <span className="text-sm font-normal text-muted">{t.match.vs}</span>
                <span>{toPersianDigits(match.predAway ?? 0)}</span>
              </div>
            ) : (
              <span className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-3.5 py-2.5 text-xs font-bold text-muted">
                {t.match.notPredicted}
              </span>
            )
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
              <span className="text-xs font-black text-muted">{t.match.vs}</span>
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

        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface-2">
            <TeamFlag teamName={match.awayTeam} flagUrl={match.awayFlag} className="h-7 w-auto max-w-[30px] rounded-sm object-contain" />
          </span>
          <span className="max-w-[100px] truncate text-sm font-bold leading-tight text-ink">
            {teamFa(match.awayTeam)}
          </span>
        </div>
      </div>

      {/* Footer: action / result / status */}
      <div className="mt-4 border-t border-line pt-4">
        {finished ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted">
              {t.match.yourPrediction}:{" "}
              {match.predHome != null ? (
                <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-extrabold text-ink tnum">
                  {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
                </span>
              ) : (
                <span className="italic opacity-70">{t.match.notPredicted}</span>
              )}
            </span>
            {match.predHome != null && <PointsBadge points={match.points ?? 0} isKnockout={match.stage !== "GROUP"} />}
          </div>
        ) : locked ? (
          <div className="flex flex-col items-center gap-2.5">
            {/* While the match is locked (incl. live), the center shows the
                live/awaited score — so always surface the user's own
                prediction here too, otherwise it disappears mid-match. */}
            {match.predHome != null && (
              <span className="text-xs text-muted">
                {t.match.yourPrediction}:{" "}
                <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-extrabold text-ink tnum">
                  {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
                </span>
              </span>
            )}
            <span
              className={`chip ${
                match.predHome != null
                  ? "border-pitch-200 bg-pitch-50 text-pitch-700"
                  : "border-line bg-surface-2 text-muted"
              } px-3 py-1`}
            >
              <Lock className="h-3 w-3" aria-hidden />
              {match.predHome != null ? t.match.predictionSaved : t.match.predictionMissed}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            {match.predHome != null && !saved && (
              <span className="text-xs text-muted">
                {t.match.yourPrediction}:{" "}
                <span className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-extrabold text-ink tnum">
                  {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
                </span>
              </span>
            )}
            <button
              onClick={save}
              disabled={!canSave}
              className={`btn w-full max-w-[220px] py-2.5 text-sm ${
                saved
                  ? "border border-pitch-200 bg-pitch-50 text-pitch-700"
                  : "btn-primary"
              }`}
            >
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t.common.loading}
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4" aria-hidden />
                  {t.common.save}
                </>
              ) : (
                t.match.save
              )}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2.5 text-center text-xs font-bold text-danger">{error}</p>}

      <Link
        href={`/match/${match.id}`}
        className="mt-3 flex items-center justify-center gap-1.5 border-t border-line pt-3 text-[11px] font-bold text-muted transition-colors duration-[var(--dur)] hover:text-pitch-700"
      >
        <BarChart3 className="h-3.5 w-3.5" aria-hidden />
        {t.match.details}
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}

/** Points earned on a finished match — flat tinted chip, tier by score. */
function PointsBadge({ points, isKnockout }: { points: number; isKnockout: boolean }) {
  const EXACT  = isKnockout ? 20 : 10;
  const DIFF   = isKnockout ? 14 : 7;
  const WINNER = isKnockout ? 10 : 5;

  let cls = "border-line bg-surface-2 text-muted";
  let prefix = "";
  if (points === EXACT) {
    cls = "border-gold/40 bg-gold/10 text-gold";
    prefix = "🌟 ";
  } else if (points === DIFF) {
    cls = "border-pitch-200 bg-pitch-50 text-pitch-700";
    prefix = "🔥 ";
  } else if (points === WINNER) {
    cls = "border-pitch-200 bg-pitch-50 text-pitch-700";
    prefix = "👍 ";
  } else if (points === 0) {
    cls = "border-danger/25 bg-danger/10 text-danger";
  }
  return (
    <span className={`chip ${cls} px-2.5 py-1`}>
      {prefix}
      {toPersianDigits(points)} {t.match.points}
    </span>
  );
}
