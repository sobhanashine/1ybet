"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Copy, CreditCard, Trophy, X } from "lucide-react";
import { t } from "@/lib/i18n";

const DISMISS_KEY = "tournament-results-popup-dismissed";
const CARD_NUMBER = "۵۰۴۷-۰۶۱۱-۱۴۱۶-۳۷۲۴";
const CARD_NUMBER_FOR_COPY = "5047061114163724";

type TournamentResultsPopupProps = {
  winnerName: string | null;
  isTournamentMember: boolean;
};

/**
 * One-time results notice for signed-in users. It gives participants a clear
 * route to the final standings and, when needed, the winner's payment card.
 */
export default function TournamentResultsPopup({
  winnerName,
  isTournamentMember,
}: TournamentResultsPopupProps) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // Private mode / blocked storage: show the announcement for this visit.
    }
    if (dismissed) return;
    const timer = setTimeout(() => setVisible(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  function close() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore storage errors; the notice can safely appear again next visit.
    }
    setVisible(false);
  }

  async function copyCardNumber() {
    try {
      await navigator.clipboard.writeText(CARD_NUMBER_FOR_COPY);
      setCopied(true);
    } catch {
      // The card number remains selectable and readable if clipboard access is denied.
    }
  }

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tournament-results-title"
    >
      <button
        type="button"
        onClick={close}
        aria-label={t.common.cancel}
        className="absolute inset-0 cursor-default bg-black/80 backdrop-blur-md"
      />

      <section className="card relative w-full max-w-sm overflow-hidden border-gold/30 p-0 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
        <div className="absolute inset-x-0 top-0 h-1 bg-gold" />
        <button
          type="button"
          onClick={close}
          aria-label={t.common.cancel}
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>

        <div className="p-6 pt-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Trophy className="h-7 w-7" aria-hidden />
          </div>
          <h2 id="tournament-results-title" className="mt-3 text-lg font-extrabold text-ink">
            {t.tournament.resultsPopupTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-dim">
            {winnerName
              ? t.tournament.resultsPopupWinner.replace("{winner}", winnerName)
              : t.tournament.resultsPopupBody}
          </p>

          {isTournamentMember && (
            <div className="mt-5 rounded-[var(--radius-lg)] border border-gold/25 bg-gold/5 p-4 text-right">
              <div className="flex items-center gap-2 text-gold">
                <CreditCard className="h-4 w-4" aria-hidden />
                <p className="text-xs font-extrabold">{t.tournament.resultsPopupPaymentTitle}</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-ink-dim">
                {t.tournament.resultsPopupPaymentBody}
              </p>
              <div className="mt-3 flex items-center gap-2 rounded-[var(--radius-md)] bg-surface px-3 py-2.5">
                <span dir="ltr" className="flex-1 text-center text-base font-extrabold tracking-[0.08em] text-ink">
                  {CARD_NUMBER}
                </span>
                <button
                  type="button"
                  onClick={copyCardNumber}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold transition-colors hover:bg-gold/25"
                  aria-label={t.tournament.resultsPopupCopyCard}
                >
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                </button>
              </div>
              {copied && (
                <p className="mt-2 text-center text-xs font-bold text-pitch-700">
                  {t.tournament.resultsPopupCopied}
                </p>
              )}
            </div>
          )}

          <Link href="/leaderboard" onClick={close} className="btn btn-primary mt-5 w-full py-3">
            {t.tournament.resultsPopupCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
