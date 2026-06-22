"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Trophy } from "lucide-react";
import { joinTournament } from "@/app/actions/tournament";
import { t } from "@/lib/i18n";

const REDIRECT_MS = 2000;

/**
 * In-page tournament registration for non-members. Tapping register joins the
 * league, shows a congrats card, then auto-redirects home (where they predict)
 * after a short beat — with an immediate "start predicting" button too.
 */
export default function TournamentRegister() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  // After the congrats card shows, slip over to home so they can predict.
  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => router.replace("/"), REDIRECT_MS);
    return () => clearTimeout(id);
  }, [done, router]);

  function register() {
    setError("");
    startTransition(async () => {
      const res = await joinTournament();
      if (res.ok) {
        setDone(true);
      } else {
        setError(res.error);
      }
    });
  }

  if (done) {
    return (
      <section className="card border-pitch-500/30 bg-pitch-50 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-pitch-500/15 text-pitch-700">
          <CheckCircle2 className="h-8 w-8" aria-hidden />
        </div>
        <h2 className="text-lg font-extrabold text-ink">
          {t.tournament.congratsTitle}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-dim">
          {t.tournament.congratsBody}
        </p>
        <button
          onClick={() => router.replace("/")}
          className="btn btn-primary mt-5 w-full py-3"
        >
          {t.tournament.startPredicting}
        </button>
        <p className="mt-2 text-[11px] text-muted">{t.tournament.redirecting}</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <button
        onClick={register}
        disabled={pending}
        className="btn btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-base"
      >
        <Trophy className="h-5 w-5" aria-hidden />
        {t.tournament.registerCta}
      </button>
      {error && (
        <p className="text-center text-xs font-semibold text-danger">{error}</p>
      )}
    </section>
  );
}
