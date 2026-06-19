"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { joinTournament } from "@/app/actions/tournament";
import { t } from "@/lib/i18n";

/**
 * First-visit gate for the tournament page. Non-members must choose:
 *  - Yes  → join the league, then the page reveals behind the modal.
 *  - No   → leave to the home page (regular prediction game).
 */
export default function TournamentJoinModal() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  // Lock background scroll while the gate is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  function accept() {
    setError("");
    startTransition(async () => {
      const res = await joinTournament();
      if (res.ok) {
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function decline() {
    router.push("/");
  }

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div className="card relative w-full max-w-sm border-gold/30 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Trophy className="h-7 w-7" aria-hidden />
        </div>
        <h3 className="text-center text-lg font-extrabold text-ink">
          {t.tournament.inviteTitle}
        </h3>
        <p className="mt-2 text-center text-sm leading-relaxed text-ink-dim">
          {t.tournament.inviteBody}
        </p>

        <div className="mt-5 grid gap-2.5">
          <button
            onClick={accept}
            disabled={pending}
            className="btn btn-primary py-3"
          >
            {t.tournament.join}
          </button>
          <button
            onClick={decline}
            disabled={pending}
            className="btn btn-secondary py-3"
          >
            {t.tournament.decline}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-center text-xs font-semibold text-danger">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
