"use client";

import { useState, useTransition } from "react";
import { submitPrediction } from "@/app/actions/predictions";
import { isLocked } from "@/lib/time";
import { teamFa, teamFlag } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { formatTime, toPersianDigits } from "@/lib/format";
import type { MatchWithPrediction } from "@/lib/matches";

type Props = { match: MatchWithPrediction };

function ScoreBox({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-12 rounded-lg border border-pitch-200 bg-pitch-50 text-center text-lg font-bold outline-none transition-all duration-200 focus:border-pitch-500 focus:ring-1 focus:ring-pitch-500 disabled:opacity-70"
    />
  );
}

export default function MatchCard({ match }: Props) {
  const locked = isLocked(match.kickoffAt);
  const finished = match.status === "FINISHED";

  const [home, setHome] = useState(
    match.predHome != null ? String(match.predHome) : "",
  );
  const [away, setAway] = useState(
    match.predAway != null ? String(match.predAway) : "",
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setError("");
    setSaved(false);
    startTransition(async () => {
      const res = await submitPrediction(match.id, Number(home), Number(away));
      if (!res.ok) return setError(res.error ?? t.common.error);
      setSaved(true);
    });
  }

  const canSave = !locked && home !== "" && away !== "" && !pending;

  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5 transition-all duration-200 hover:ring-black/10">
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span className="font-medium">{match.groupName ? `گروه ${match.groupName}` : ""}</span>
        <span className="font-medium">{toPersianDigits(formatTime(match.kickoffAt))}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-1.5 min-w-0">
          <span className="text-base leading-none select-none">{teamFlag(match.homeTeam)}</span>
          <span className="truncate text-sm font-semibold text-ink">
            {teamFa(match.homeTeam)}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {finished ? (
            <div className="flex items-center gap-2 rounded-lg bg-pitch-50 px-3 py-1 text-lg font-black text-pitch-700 font-feature-ss01">
              <span>{toPersianDigits(match.homeScore ?? 0)}</span>
              <span className="text-xs font-normal opacity-60">{t.match.vs}</span>
              <span>{toPersianDigits(match.awayScore ?? 0)}</span>
            </div>
          ) : (
            <>
              <ScoreBox value={home} onChange={setHome} disabled={locked} />
              <span className="text-xs font-medium text-muted">{t.match.vs}</span>
              <ScoreBox value={away} onChange={setAway} disabled={locked} />
            </>
          )}
        </div>

        <div className="flex flex-1 items-center justify-end gap-1.5 min-w-0">
          <span className="truncate text-sm font-semibold text-ink">
            {teamFa(match.awayTeam)}
          </span>
          <span className="text-base leading-none select-none">{teamFlag(match.awayTeam)}</span>
        </div>
      </div>

      {/* prediction / result footer */}
      <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3">
        {finished ? (
          <div className="flex w-full items-center justify-between text-xs">
            <span className="text-muted">
              {t.match.yourPrediction}:{" "}
              {match.predHome != null ? (
                <span className="font-semibold text-ink">
                  {toPersianDigits(match.predHome)} - {toPersianDigits(match.predAway ?? 0)}
                </span>
              ) : (
                t.match.notPredicted
              )}
            </span>
            {match.predHome != null && (() => {
              const pts = match.points ?? 0;
              let badgeClass = "bg-pitch-100 text-pitch-700";
              let text = `${toPersianDigits(pts)} ${t.match.points}`;
              
              if (pts === 10) {
                badgeClass = "bg-amber-100 text-amber-800 ring-1 ring-amber-200/50";
                text = `🌟 ${toPersianDigits(pts)} ${t.match.points}`;
              } else if (pts === 7) {
                badgeClass = "bg-pitch-100 text-pitch-700 ring-1 ring-pitch-200/30";
              } else if (pts === 5) {
                badgeClass = "bg-pitch-50 text-pitch-600";
              } else if (pts === 2) {
                badgeClass = "bg-black/5 text-muted";
              }
              return (
                <span className={`rounded-full px-2 py-0.5 font-bold text-[10px] ${badgeClass}`}>
                  {text}
                </span>
              );
            })()}
          </div>
        ) : locked ? (
          <span className="text-xs text-muted flex items-center gap-1 font-medium">
            <span>🔒</span>
            <span>{t.match.locked}</span>
          </span>
        ) : (
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-pitch-500 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:bg-pitch-600 focus-visible:ring-2 focus-visible:ring-pitch-500 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {t.common.loading}
              </span>
            ) : saved ? (
              "✓ " + t.common.save
            ) : (
              t.match.save
            )}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}
