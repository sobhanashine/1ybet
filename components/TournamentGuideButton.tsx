"use client";

import { useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { t } from "@/lib/i18n";

// Where the registration-guide video lives. Drop the generated clip at
// `public/tournament-guide.mp4`, or point this at a hosted URL via the env var
// (e.g. a CDN) without touching the code.
const VIDEO_URL =
  process.env.NEXT_PUBLIC_TOURNAMENT_VIDEO_URL || "/tournament-guide.mp4";

/**
 * A button on the tournament page that opens a modal playing a short clip
 * explaining how to register and the tournament rules. If the video file is
 * missing it shows a friendly fallback instead of a broken player.
 */
export default function TournamentGuideButton() {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-secondary mt-3 w-full gap-2 py-2.5 text-sm"
      >
        <PlayCircle className="h-4 w-4 text-gold" aria-hidden />
        {t.tournament.guideButton}
      </button>

      {open && (
        <div
          dir="rtl"
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

          <div
            className="relative w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t.common.cancel}
              className="absolute -top-11 left-0 flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-ink transition-colors hover:bg-elevated"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>

            <div className="card overflow-hidden border-gold/30 p-0 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
              <div className="border-b border-line p-3 text-center text-sm font-extrabold text-ink">
                {t.tournament.guideTitle}
              </div>
              {failed ? (
                <p className="p-8 text-center text-sm text-muted">
                  {t.tournament.guideUnavailable}
                </p>
              ) : (
                <video
                  src={VIDEO_URL}
                  controls
                  autoPlay
                  playsInline
                  onError={() => setFailed(true)}
                  className="aspect-[9/16] w-full bg-black"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
