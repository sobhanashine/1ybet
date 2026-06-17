"use client";

import { useState, useTransition, useEffect } from "react";
import { votePoll } from "@/app/actions/poll";
import { PRIZE_POOL_POLL, type PollResults, type PollChoice } from "@/lib/polls-shared";
import { t } from "@/lib/i18n";

export default function PollCard({ initial }: { initial: PollResults }) {
  // Already voted (returning visit) → never show it.
  const [gone, setGone] = useState(initial.myChoice != null);
  const [thanks, setThanks] = useState(false);
  const [pending, startTransition] = useTransition();

  // After the brief thank-you, collapse the card away.
  useEffect(() => {
    if (!thanks) return;
    const tm = setTimeout(() => setGone(true), 1400);
    return () => clearTimeout(tm);
  }, [thanks]);

  if (gone) return null;

  function vote(choice: PollChoice) {
    startTransition(async () => {
      const res = await votePoll(PRIZE_POOL_POLL, choice);
      if (res.ok) setThanks(true);
    });
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-5 ring-1 ring-gold/20 transition-all duration-500 ${
        thanks ? "opacity-0 scale-95" : "opacity-100"
      }`}
    >
      <div className="pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />

      {thanks ? (
        <p className="relative py-2 text-center text-sm font-bold text-pitch-700">
          {t.poll.thanks}
        </p>
      ) : (
        <>
          <h3 className="relative text-base font-extrabold text-ink">
            {t.poll.prizeTitle}
          </h3>
          <p className="relative mt-1.5 text-xs leading-relaxed text-muted">
            {t.poll.prizeQuestion}
          </p>

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
        </>
      )}
    </div>
  );
}
