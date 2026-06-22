"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// One-time onboarding: a brand-new visitor sees the tournament page once, then
// the app behaves normally. Tracked client-side (same approach as the guide
// popup's localStorage flag) — no server state needed.
const KEY = "tournament-intro-seen";

/**
 * Mounted on the home page. On the very first app open it sends a not-yet-
 * registered user to the tournament page (where they can register), then marks
 * the intro as seen so every later visit lands on home as usual.
 *
 * Users already in the tournament are never redirected — opening the app keeps
 * them on home; we just mark the intro seen so it stays that way.
 */
export function FirstVisitTournamentGate({ isMember }: { isMember: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isMember) {
      localStorage.setItem(KEY, "1");
      return;
    }
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, "1");
      router.replace("/tournament");
    }
  }, [isMember, router]);

  return null;
}

/**
 * Mounted on the tournament page so that reaching it directly (e.g. via the
 * nav FAB) also counts as the intro being seen — avoids a later bounce back.
 */
export function MarkTournamentIntroSeen() {
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, "1");
  }, []);

  return null;
}
