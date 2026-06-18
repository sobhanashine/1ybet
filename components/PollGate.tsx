"use client";

import { useState, useTransition, useEffect } from "react";
import { votePoll } from "@/app/actions/poll";
import { PRIZE_POOL_POLL, type PollChoice } from "@/lib/polls-shared";
import { t } from "@/lib/i18n";
import { Trophy } from "lucide-react";

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
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
      {/* Opaque, non-dismissible backdrop — no onClick to close. */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className={`card relative w-full max-w-sm border-gold/30 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)] transition-all duration-[var(--dur)] ${
          thanks ? "scale-95 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        {thanks ? (
          <p className="py-6 text-center text-base font-bold text-pitch-700">
            {t.poll.thanks}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-gold">
              <Trophy className="h-5 w-5" aria-hidden />
              <h3 className="text-lg font-extrabold text-ink">{t.poll.prizeTitle}</h3>
            </div>
            <p className="text-sm leading-relaxed text-ink-dim">
              {t.poll.prizeQuestion}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted">
              {t.poll.gateSubtitle}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => vote("yes")}
                disabled={pending}
                className="btn btn-primary py-3"
              >
                {t.poll.yes}
              </button>
              <button
                onClick={() => vote("no")}
                disabled={pending}
                className="btn btn-secondary py-3"
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
