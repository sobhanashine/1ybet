import { NextResponse } from "next/server";
import { fetchLiveScores, type LiveScore } from "@/lib/football-api";

export const dynamic = "force-dynamic";

// Many clients poll this while a match is on. A shared in-memory cache collapses
// them to at most one upstream football-data call per TTL — its free tier allows
// only ~10 requests/minute, so the cache is what protects the quota regardless
// of how many users are watching.
const CACHE_TTL_MS = 20_000;
let cache: { at: number; data: LiveScore[] } | null = null;
let inFlight: Promise<LiveScore[]> | null = null;

async function getLiveScores(): Promise<LiveScore[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const data = await fetchLiveScores();
      cache = { at: Date.now(), data };
      return data;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

export async function GET() {
  try {
    const matches = await getLiveScores();
    return NextResponse.json({ matches });
  } catch (e) {
    // Never surface an error to the polling client (missing API key, rate
    // limit, outage…) — just report no live data so the page keeps working.
    console.error("live scores fetch failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ matches: [] as LiveScore[] });
  }
}
