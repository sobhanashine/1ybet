"use client";

import { useEffect, useState } from "react";
import { PlayCircle, X } from "lucide-react";
import { t } from "@/lib/i18n";

// Where the registration-guide video lives — same source as the tournament-page
// button. Override with a hosted URL via the env var without touching code.
const VIDEO_URL =
  process.env.NEXT_PUBLIC_TOURNAMENT_VIDEO_URL || "/tournament-guide.mp4";

// localStorage flag. Only ever set when the user explicitly declines ("No"),
// which is the one action that permanently suppresses the popup. Watching the
// video does NOT set it, so the prompt returns the next time the app opens.
const DISMISS_KEY = "guide-video-dismissed";

type Stage = "hidden" | "prompt" | "video";

/**
 * App-open popup that offers the tournament registration-guide video.
 *  - On open it asks Yes / No.
 *  - Yes  → plays the clip in a modal with a close (X) button.
 *  - No   → hides it and remembers the choice (never shown again).
 * Mounted once in the app layout, so it appears when the app is opened and
 * does not re-trigger on client-side navigation between tabs.
 */
export default function GuideVideoPopup() {
  // Start hidden so server and first client render match (no localStorage on
  // the server). The effect decides whether to reveal the prompt.
  const [stage, setStage] = useState<Stage>("hidden");
  const [failed, setFailed] = useState(false);

  // Reveal the prompt only on the client (no localStorage on the server), and
  // defer the state update with setTimeout so it isn't a synchronous setState
  // in an effect (eslint react-hooks/set-state-in-effect is on — see Countdown).
  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // private mode / storage blocked — just show the prompt
    }
    if (dismissed) return;
    const id = setTimeout(() => setStage("prompt"), 0);
    return () => clearTimeout(id);
  }, []);

  // Lock background scroll while any modal is up.
  useEffect(() => {
    if (stage === "hidden") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [stage]);

  function watch() {
    setStage("video");
  }

  function decline() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore — worst case it asks again next open
    }
    setStage("hidden");
  }

  // Close the video. Does not persist a choice, so the prompt can return on the
  // next app open (per "keep offering until they say No").
  function closeVideo() {
    setStage("hidden");
  }

  if (stage === "hidden") return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={stage === "video" ? closeVideo : undefined}
      />

      {stage === "prompt" ? (
        <div className="card relative w-full max-w-sm border-gold/30 p-6 shadow-[0_24px_64px_rgba(0,0,0,0.6)]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gold/15 text-gold">
            <PlayCircle className="h-7 w-7" aria-hidden />
          </div>
          <h3 className="text-center text-lg font-extrabold text-ink">
            {t.tournament.guidePopupTitle}
          </h3>
          <p className="mt-2 text-center text-sm leading-relaxed text-ink-dim">
            {t.tournament.guidePopupBody}
          </p>

          <div className="mt-5 grid gap-2.5">
            <button onClick={watch} className="btn btn-primary py-3">
              {t.tournament.guidePopupYes}
            </button>
            <button onClick={decline} className="btn btn-secondary py-3">
              {t.tournament.guidePopupNo}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-sm">
          <button
            type="button"
            onClick={closeVideo}
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
      )}
    </div>
  );
}
