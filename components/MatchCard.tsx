"use client";

import { useState, useTransition } from "react";
import { submitPrediction } from "@/app/actions/predictions";
import { isLocked } from "@/lib/time";
import { teamFa } from "@/lib/teams-fa";
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
      className="h-11 w-12 rounded-lg border border-pitch-200 bg-pitch-50 text-center text-lg font-bold outline-none focus:border-pitch-500 disabled:opacity-70"
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
    <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
      <div className="mb-3 flex items-center justify-between text-xs text-muted">
        <span>{match.groupName ? `گروه ${match.groupName}` : ""}</span>
        <span>{toPersianDigits(formatTime(match.kickoffAt))}</span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="flex-1 text-start text-sm font-semibold">
          {teamFa(match.homeTeam)}
        </span>

        <div className="flex items-center gap-1.5">
          {finished ? (
            <div className="flex items-center gap-1.5 text-lg font-bold">
              <span>{toPersianDigits(match.homeScore ?? 0)}</span>
              <span className="text-muted">{t.match.vs}</span>
              <span>{toPersianDigits(match.awayScore ?? 0)}</span>
            </div>
          ) : (
            <>
              <ScoreBox value={home} onChange={setHome} disabled={locked} />
              <span className="text-muted">{t.match.vs}</span>
              <ScoreBox value={away} onChange={setAway} disabled={locked} />
            </>
          )}
        </div>

        <span className="flex-1 text-end text-sm font-semibold">
          {teamFa(match.awayTeam)}
        </span>
      </div>

      {/* prediction / result footer */}
      <div className="mt-3 flex items-center justify-between">
        {finished ? (
          <div className="flex w-full items-center justify-between text-xs">
            <span className="text-muted">
              {t.match.yourPrediction}:{" "}
              {match.predHome != null
                ? `${toPersianDigits(match.predHome)}${t.match.vs}${toPersianDigits(
                    match.predAway ?? 0,
                  )}`
                : t.match.notPredicted}
            </span>
            {match.predHome != null && (
              <span className="rounded-full bg-pitch-100 px-2 py-0.5 font-bold text-pitch-700">
                {toPersianDigits(match.points ?? 0)} {t.match.points}
              </span>
            )}
          </div>
        ) : locked ? (
          <span className="text-xs text-muted">🔒 {t.match.locked}</span>
        ) : (
          <button
            onClick={save}
            disabled={!canSave}
            className="rounded-lg bg-pitch-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-pitch-600 disabled:opacity-50"
          >
            {pending ? t.common.loading : saved ? "✓ " + t.common.save : t.match.save}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
