"use client";

import { useState, useTransition, useEffect } from "react";
import { votePoll } from "@/app/actions/poll";
import { PRIZE_POOL_POLL, type PollChoice } from "@/lib/polls-shared";
import { t } from "@/lib/i18n";

/**
 * Full-screen blocking gate for the prize-pool poll. Every user MUST answer
 * before they can use the app. Once they've voted (now or in a past visit) it
 * never renders again.
 */
export default function PollGate({ hasVoted }: { hasVoted: boolean }) {
  const [open, setOpen] = useState(!hasVoted);
  const [thanks, setThanks] = useState(false);
  const [pending, startTransition] = useTransition();

  // Lock background scroll while the gate is up.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // After the brief thank-you, release the gate.
  useEffect(() => {
    if (!thanks) return;
    const tm = setTimeout(() => setOpen(false), 1400);
    return () => clearTimeout(tm);
  }, [thanks]);

  if (!open) return null;

  function vote(choice: PollChoice) {
    startTransition(async () => {
      const res = await votePoll(PRIZE_POOL_POLL, choice);
      if (res.ok) setThanks(true);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Opaque, non-dismissible backdrop — no onClick to close. */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className={`relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-6 ring-1 ring-gold/25 shadow-[0_20px_60px_rgba(0,0,0,0.6)] transition-all duration-500 ${
          thanks ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full bg-gold/10 blur-3xl" />

        {thanks ? (
          <p className="relative py-6 text-center text-base font-bold text-pitch-700">
            {t.poll.thanks}
          </p>
        ) : (
          <>
            <h3 className="relative text-lg font-extrabold text-ink">
              {t.poll.prizeTitle}
            </h3>
            <p className="relative mt-3 text-sm leading-relaxed text-ink/90">
              {t.poll.prizeQuestion}
            </p>
            <p className="relative mt-2 text-xs font-semibold text-muted">
              {t.poll.gateSubtitle}
            </p>

            <div className="relative mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => vote("yes")}
                disabled={pending}
                className="rounded-xl bg-gradient-to-r from-pitch-500 to-pitch-600 py-3 text-sm font-bold text-[#08140e] transition active:scale-95 disabled:opacity-50"
              >
                {t.poll.yes}
              </button>
              <button
                onClick={() => vote("no")}
                disabled={pending}
                className="rounded-xl bg-white/5 py-3 text-sm font-bold text-muted ring-1 ring-white/10 transition active:scale-95 disabled:opacity-50"
              >
                {t.poll.no}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
