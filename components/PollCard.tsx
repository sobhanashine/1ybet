"use client";

import { useState, useTransition } from "react";
import { votePoll } from "@/app/actions/poll";
import { PRIZE_POOL_POLL, type PollResults, type PollChoice } from "@/lib/polls-shared";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export default function PollCard({ initial }: { initial: PollResults }) {
  const [results, setResults] = useState(initial);
  const [revealed, setRevealed] = useState(initial.myChoice != null);
  const [pending, startTransition] = useTransition();

  function vote(choice: PollChoice) {
    startTransition(async () => {
      const res = await votePoll(PRIZE_POOL_POLL, choice);
      if (res.ok) {
        setResults(res.results);
        setRevealed(true);
      }
    });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-5 ring-1 ring-gold/20">
      <div className="pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />

      <h3 className="relative text-base font-extrabold text-ink">
        {t.poll.prizeTitle}
      </h3>
      <p className="relative mt-1.5 text-xs leading-relaxed text-muted">
        {t.poll.prizeQuestion}
      </p>

      {!revealed ? (
        <div className="relative mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={() => vote("yes")}
            disabled={pending}
            className="rounded-xl bg-gradient-to-r from-pitch-500 to-pitch-600 py-2.5 text-sm font-bold text-[#08140e] transition active:scale-95 disabled:opacity-50"
          >
            {t.poll.yes}
          </button>
          <button
            onClick={() => vote("no")}
            disabled={pending}
            className="rounded-xl bg-white/5 py-2.5 text-sm font-bold text-muted ring-1 ring-white/10 transition active:scale-95 disabled:opacity-50"
          >
            {t.poll.no}
          </button>
        </div>
      ) : (
        <div className="relative mt-4 space-y-2.5">
          <ResultBar
            label={t.poll.yesShare}
            pct={results.yesPct}
            mine={results.myChoice === "yes"}
            tone="yes"
          />
          <ResultBar
            label={t.poll.noShare}
            pct={results.noPct}
            mine={results.myChoice === "no"}
            tone="no"
          />
          <div className="flex items-center justify-between pt-0.5 text-[11px]">
            <span className="font-bold text-pitch-700">{t.poll.thanks}</span>
            <span className="text-muted">
              {toPersianDigits(results.total)} {t.poll.voters}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultBar({
  label,
  pct,
  mine,
  tone,
}: {
  label: string;
  pct: number;
  mine: boolean;
  tone: "yes" | "no";
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-ink">
          {label}
          {mine && <span className="mr-1 text-[10px] text-pitch-600"> ✓</span>}
        </span>
        <span className="font-extrabold text-ink font-feature-ss01">
          {toPersianDigits(pct)}٪
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className={`h-full rounded-full transition-all ${
            tone === "yes" ? "bg-pitch-500" : "bg-white/40"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
