"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 45_000;

/**
 * Keeps the (force-dynamic) knockout bracket fresh while a match is in progress
 * by calling `router.refresh()` on an interval — so a just-finished result fills
 * into the bracket (winner ✓, next-round teams) without a manual reload.
 *
 * Safe by construction: only runs while `active`, skips refreshing when the tab
 * is hidden, refreshes once the tab regains focus, and tears the interval down
 * on unmount. `active` is gated server-side to live matches, so it never polls
 * the free football-data tier on quiet days.
 */
export default function KnockoutAutoRefresh({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      router.refresh();
    };

    const id = setInterval(tick, POLL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, router]);

  return null;
}
