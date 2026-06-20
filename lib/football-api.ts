import "server-only";
import { FOOTBALL_API_BASE, WC_COMPETITION, requireEnv } from "./config";

// Subset of the football-data.org v4 match shape we rely on.
type ApiScorePair = { home: number | null; away: number | null };
type ApiMatch = {
  id: number;
  stage: string;
  group: string | null;
  utcDate: string;
  status: string;
  homeTeam: { name: string | null; tla?: string | null; crest?: string | null };
  awayTeam: { name: string | null; tla?: string | null; crest?: string | null };
  score: {
    winner: string | null;
    duration: string;
    fullTime: ApiScorePair;
    halfTime: ApiScorePair;
    regularTime?: ApiScorePair | null;
  };
};

export type NormalizedMatch = {
  extId: string;
  stage: "GROUP" | "LAST_32" | "LAST_16" | "QUARTER_FINAL" | "SEMI_FINAL" | "THIRD_PLACE" | "FINAL";
  groupName: string | null;
  homeTeam: string;
  awayTeam: string;
  homeCode: string | null;
  awayCode: string | null;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: Date;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  // regulation (90-minute) score — null until finished
  homeScore: number | null;
  awayScore: number | null;
  // actual advancing team (incl. ET/penalties) — null unless finished & decided
  winnerTeam: string | null;
};

const STAGE_MAP: Record<string, NormalizedMatch["stage"]> = {
  GROUP_STAGE: "GROUP",
  LAST_32: "LAST_32",
  LAST_16: "LAST_16",
  QUARTER_FINALS: "QUARTER_FINAL",
  SEMI_FINALS: "SEMI_FINAL",
  THIRD_PLACE: "THIRD_PLACE",
  "3RD_PLACE_FINAL": "THIRD_PLACE",
  FINAL: "FINAL",
};

function mapStatus(s: string): NormalizedMatch["status"] {
  if (s === "FINISHED") return "FINISHED";
  if (s === "IN_PLAY" || s === "PAUSED") return "LIVE";
  return "SCHEDULED";
}

/**
 * Regulation result: prefer `regularTime` (goals after 90 min), which is set
 * for knockout matches that went to extra time / penalties. Fall back to
 * `fullTime` for group matches where `regularTime` is absent.
 */
function regulationScore(m: ApiMatch): { home: number | null; away: number | null } {
  if (m.status !== "FINISHED") return { home: null, away: null };
  const rt = m.score.regularTime;
  if (rt && rt.home != null && rt.away != null) {
    return { home: rt.home, away: rt.away };
  }
  return { home: m.score.fullTime.home, away: m.score.fullTime.away };
}

export function normalize(m: ApiMatch): NormalizedMatch | null {
  const stage = STAGE_MAP[m.stage];
  if (!stage) return null;
  if (!m.homeTeam.name || !m.awayTeam.name) return null; // placeholder fixtures
  const reg = regulationScore(m);
  let winnerTeam: string | null = null;
  if (m.status === "FINISHED") {
    if (m.score.winner === "HOME_TEAM") winnerTeam = m.homeTeam.name;
    else if (m.score.winner === "AWAY_TEAM") winnerTeam = m.awayTeam.name;
  }
  return {
    extId: `fd-${m.id}`,
    stage,
    groupName: m.group?.replace(/^GROUP_/, "") ?? null,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    homeCode: m.homeTeam.tla ?? null,
    awayCode: m.awayTeam.tla ?? null,
    homeFlag: m.homeTeam.crest ?? null,
    awayFlag: m.awayTeam.crest ?? null,
    kickoffAt: new Date(m.utcDate),
    status: mapStatus(m.status),
    homeScore: reg.home,
    awayScore: reg.away,
    winnerTeam,
  };
}

/** Raw fetch of the competition's matches from football-data.org. */
async function fetchApiMatches(): Promise<ApiMatch[]> {
  const res = await fetch(
    `${FOOTBALL_API_BASE}/competitions/${WC_COMPETITION}/matches`,
    {
      headers: { "X-Auth-Token": requireEnv("FOOTBALL_DATA_API_KEY") },
      // football-data free tier is delayed anyway; avoid Next's fetch cache.
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { matches: ApiMatch[] };
  return data.matches;
}

export async function fetchWorldCupMatches(): Promise<NormalizedMatch[]> {
  const apiMatches = await fetchApiMatches();
  return apiMatches
    .map(normalize)
    .filter((m): m is NormalizedMatch => m !== null);
}

/** In-play score for a single live match (for display only). */
export type LiveScore = {
  extId: string;
  home: number;
  away: number;
  status: "LIVE";
};

/**
 * Current running scores for matches that are in progress right now. Unlike
 * `fetchWorldCupMatches` — which only reports a regulation score once a match is
 * FINISHED — this reads the live `fullTime` score while a match is IN_PLAY or
 * PAUSED. It is for live display only and is never used to score predictions.
 */
export async function fetchLiveScores(): Promise<LiveScore[]> {
  const apiMatches = await fetchApiMatches();
  const live: LiveScore[] = [];
  for (const m of apiMatches) {
    if (m.status !== "IN_PLAY" && m.status !== "PAUSED") continue;
    live.push({
      extId: `fd-${m.id}`,
      home: m.score.fullTime.home ?? 0,
      away: m.score.fullTime.away ?? 0,
      status: "LIVE",
    });
  }
  return live;
}
