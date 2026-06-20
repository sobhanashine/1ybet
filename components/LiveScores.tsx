"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type LiveScore = {
  extId: string;
  home: number;
  away: number;
  status: "LIVE";
};

// Default to an empty map so `useLiveScore` is safe even with no provider above.
const LiveScoresContext = createContext<Map<string, LiveScore>>(new Map());

/** Live in-play score for a match (by ext id), or undefined if not live. */
export function useLiveScore(
  extId: string | null | undefined,
): LiveScore | undefined {
  const map = useContext(LiveScoresContext);
  return extId ? map.get(extId) : undefined;
}

const POLL_MS = 30_000;

/**
 * Polls `/api/live` while `active` and refreshes the moment the tab regains
 * focus, exposing live in-play scores via context.
 *
 * Fail-safe by construction: any network/parse error is swallowed (the last
 * known scores are kept), overlapping fetches are guarded, polling is skipped
 * while the tab is hidden, and the interval/fetch are torn down on unmount — so
 * it can neither crash the page nor leak timers or requests.
 */
export function LiveScoresProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  const [scores, setScores] = useState<Map<string, LiveScore>>(new Map());

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let fetching = false;
    const controller = new AbortController();

    async function poll() {
      if (cancelled || fetching) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      fetching = true;
      try {
        const res = await fetch("/api/live", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const data = (await res.json()) as { matches?: LiveScore[] };
        if (cancelled) return;
        const next = new Map<string, LiveScore>();
        for (const m of data.matches ?? []) next.set(m.extId, m);
        setScores(next);
      } catch {
        // Keep the last known scores and try again on the next tick.
      } finally {
        fetching = false;
      }
    }

    poll(); // kick off immediately
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active]);

  return (
    <LiveScoresContext.Provider value={scores}>
      {children}
    </LiveScoresContext.Provider>
  );
}
