"use client";

import { useLiveScore } from "@/components/LiveScores";
import { toPersianDigits } from "@/lib/format";
import { t } from "@/lib/i18n";

type Props = {
  extId: string | null;
  finished: boolean;
  homeScore: number | null;
  awayScore: number | null;
};

/**
 * Center score for the match-detail header. Shows the live in-play score (red,
 * pulsing) when the match is on, the final score when finished, or a plain "vs"
 * otherwise. Live data comes from the surrounding LiveScoresProvider; with no
 * provider/live data it simply falls back to the finished/scheduled view.
 */
export default function MatchScore({ extId, finished, homeScore, awayScore }: Props) {
  const live = useLiveScore(extId);

  if (!finished && live) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="tnum rounded-[var(--radius-md)] border border-danger/40 bg-danger/5 px-4 py-2 text-2xl font-black text-danger">
          {toPersianDigits(live.home)} {t.match.vs} {toPersianDigits(live.away)}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-bold text-danger">
          <span className="chip-dot animate-pulse" />
          {t.match.live}
        </span>
      </div>
    );
  }

  if (finished) {
    return (
      <span className="tnum rounded-[var(--radius-md)] border border-pitch-200 bg-pitch-50 px-4 py-2 text-2xl font-black text-pitch-700">
        {toPersianDigits(homeScore ?? 0)} {t.match.vs} {toPersianDigits(awayScore ?? 0)}
      </span>
    );
  }

  return <span className="text-lg font-black text-muted">{t.match.vs}</span>;
}
