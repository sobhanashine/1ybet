"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

type Remaining = {
  done: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const ZERO: Remaining = {
  done: false,
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
};

function diff(targetMs: number): Remaining {
  const ms = Math.max(0, targetMs - Date.now());
  const total = Math.floor(ms / 1000);
  return {
    done: ms <= 0,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

/**
 * Live countdown to the tournament kickoff. Renders a deterministic placeholder
 * on the server / first paint (so hydration matches), then ticks every second
 * from the real client clock.
 */
export default function Countdown({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  const [time, setTime] = useState<Remaining | null>(null);

  useEffect(() => {
    const update = () => setTime(diff(targetMs));
    const first = setTimeout(update, 0);
    const id = setInterval(update, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [targetMs]);

  const shown = time ?? ZERO;

  if (shown.done) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-pitch-500/10 py-3 text-sm font-extrabold text-pitch-700">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pitch-500 opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-pitch-500" />
        </span>
        {t.tournament.started}
      </div>
    );
  }

  const cells: [number, string][] = [
    [shown.days, t.tournament.days],
    [shown.hours, t.tournament.hours],
    [shown.minutes, t.tournament.minutes],
    [shown.seconds, t.tournament.seconds],
  ];

  return (
    <div dir="ltr" className="grid grid-cols-4 gap-2">
      {cells.map(([value, label], i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded-[var(--radius-md)] border border-line-strong bg-surface-2 py-2.5"
        >
          <span className="text-2xl font-black tabular-nums text-gold tnum">
            {toPersianDigits(String(value).padStart(2, "0"))}
          </span>
          <span className="mt-0.5 text-[10px] font-semibold text-muted">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
