"use client";

import { useEffect } from "react";

/**
 * On mount, smooth-scrolls the knockout page to the next non-finished match,
 * mirroring the home page's behavior so users land on the action they can take
 * next instead of the top of the bracket. Picks up the live `extId` via the
 * `data-knockout-match` attribute that each server-rendered <MatchCard>
 * carries — keeps the scroll logic out of the server tree.
 */
export default function KnockoutAutoScroll({ extId }: { extId: string | null }) {
  useEffect(() => {
    if (!extId) return;
    const el = document.querySelector(
      `[data-knockout-match="${CSS.escape(extId)}"]`,
    );
    if (!(el instanceof HTMLElement)) return;
    const timer = setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
    return () => clearTimeout(timer);
  }, [extId]);

  return null;
}
