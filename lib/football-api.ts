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

/** Aggregated record of the two teams' previous encounters. */
export type Head2Head = {
  numberOfMatches: number;
  totalGoals: number;
  home: { wins: number; draws: number; losses: number };
  away: { wins: number; draws: number; losses: number };
};

type ApiH2HTeam = { wins?: number; draws?: number; losses?: number };
type ApiH2H = {
  numberOfMatches?: number;
  totalGoals?: number;
  homeTeam?: ApiH2HTeam;
  awayTeam?: ApiH2HTeam;
};

// Head-to-head changes only when these teams play again, so cache it for an
// hour. We use our own in-memory cache rather than Next's fetch cache because
// the match page is `force-dynamic`, which forces every fetch to `no-store` —
// without this each page view would hit the free tier's ~10 req/min limit.
const H2H_TTL_MS = 60 * 60 * 1000;
const h2hCache = new Map<string, { at: number; data: Head2Head | null }>();

/**
 * Head-to-head history for one match, from football-data.org. This aggregate
 * (matches played, total goals, each side's W/D/L) is the only per-match stat
 * available on the free tier — detailed stats, lineups and events are paid.
 * Returns null when the match has no football-data id or no prior encounters.
 */
export async function fetchMatchHead2Head(
  extId: string,
): Promise<Head2Head | null> {
  if (!extId.startsWith("fd-")) return null;

  const cached = h2hCache.get(extId);
  if (cached && Date.now() - cached.at < H2H_TTL_MS) return cached.data;

  const fdId = extId.slice(3);
  const res = await fetch(`${FOOTBALL_API_BASE}/matches/${fdId}`, {
    headers: { "X-Auth-Token": requireEnv("FOOTBALL_DATA_API_KEY") },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { head2head?: ApiH2H };
  const h = data.head2head;
  const result: Head2Head | null =
    !h || typeof h.numberOfMatches !== "number"
      ? null
      : {
          numberOfMatches: h.numberOfMatches,
          totalGoals: h.totalGoals ?? 0,
          home: {
            wins: h.homeTeam?.wins ?? 0,
            draws: h.homeTeam?.draws ?? 0,
            losses: h.homeTeam?.losses ?? 0,
          },
          away: {
            wins: h.awayTeam?.wins ?? 0,
            draws: h.awayTeam?.draws ?? 0,
            losses: h.awayTeam?.losses ?? 0,
          },
        };

  h2hCache.set(extId, { at: Date.now(), data: result });
  return result;
}

/** One team's row in a group standings table (free tier). */
export type StandingRow = {
  group: string | null; // e.g. "A"
  position: number;
  played: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
};

/** A standings row enriched with the team's identity (for rendering a table). */
export type GroupTeamRow = StandingRow & {
  team: string;
  code: string | null;
  crest: string | null;
};

/** One group's ordered table. */
export type GroupTable = { group: string | null; rows: GroupTeamRow[] };

type ApiStandingTeam = { name?: string | null; tla?: string | null; crest?: string | null };
type ApiStandingRow = {
  position?: number;
  team?: ApiStandingTeam;
  playedGames?: number;
  won?: number;
  draw?: number;
  lost?: number;
  points?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
};
type ApiStandingsGroup = { group?: string | null; table?: ApiStandingRow[] };

// Group tables move only when matches finish, so a short cache keeps us well
// under the free tier's ~10 req/min. One shared entry (the whole competition),
// reused by both the table view and the analyse lookup.
const STANDINGS_TTL_MS = 30 * 60 * 1000;
let standingsCache: { at: number; data: GroupTable[] } | null = null;

/**
 * Live group standings for the competition, from football-data.org (free tier),
 * as ordered group tables. Cached 30m. `form` is intentionally ignored (null on
 * the WC free tier). Throws on API error — callers decide whether to swallow.
 */
export async function fetchGroupTables(): Promise<GroupTable[]> {
  if (standingsCache && Date.now() - standingsCache.at < STANDINGS_TTL_MS) {
    return standingsCache.data;
  }

  const res = await fetch(
    `${FOOTBALL_API_BASE}/competitions/${WC_COMPETITION}/standings`,
    {
      headers: { "X-Auth-Token": requireEnv("FOOTBALL_DATA_API_KEY") },
      cache: "no-store",
    },
  );
  if (!res.ok) {
    throw new Error(`football-data.org error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { standings?: ApiStandingsGroup[] };

  const tables: GroupTable[] = [];
  for (const g of data.standings ?? []) {
    const group = g.group?.replace(/^Group\s+/i, "").trim() || null;
    const rows: GroupTeamRow[] = (g.table ?? []).map((r) => ({
      group,
      position: r.position ?? 0,
      played: r.playedGames ?? 0,
      won: r.won ?? 0,
      draw: r.draw ?? 0,
      lost: r.lost ?? 0,
      points: r.points ?? 0,
      goalsFor: r.goalsFor ?? 0,
      goalsAgainst: r.goalsAgainst ?? 0,
      goalDiff: r.goalDifference ?? 0,
      team: r.team?.name ?? "",
      code: r.team?.tla ?? null,
      crest: r.team?.crest ?? null,
    }));
    tables.push({ group, rows });
  }

  standingsCache = { at: Date.now(), data: tables };
  return tables;
}

/**
 * Standings as a lookup keyed by BOTH team code (TLA) and full name, so a caller
 * can resolve a team either way. Built from the cached group tables.
 */
export async function fetchStandings(): Promise<Map<string, StandingRow>> {
  const tables = await fetchGroupTables();
  const map = new Map<string, StandingRow>();
  for (const g of tables) {
    for (const r of g.rows) {
      const row: StandingRow = {
        group: r.group,
        position: r.position,
        played: r.played,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        points: r.points,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDiff: r.goalDiff,
      };
      if (r.code) map.set(r.code.toUpperCase(), row);
      if (r.team) map.set(r.team, row);
    }
  }
  return map;
}
