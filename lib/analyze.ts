import "server-only";
import { getMatchesWithPredictions, type MatchWithPrediction } from "./matches";
import { getMatchPredictionStats, type MatchStats } from "./match-stats";
import { fetchStandings, type StandingRow } from "./football-api";

export type FormResult = "W" | "D" | "L";

export type TeamAnalysis = {
  standing: StandingRow | null;
  form: FormResult[]; // most-recent last, up to 5
};

export type Lean = {
  side: "home" | "away" | "even";
  strength: "slight" | "clear";
};

export type GameAnalysis = {
  match: MatchWithPrediction;
  home: TeamAnalysis;
  away: TeamAnalysis;
  crowd: MatchStats;
  lean: Lean;
};

// How many recent results make up a team's form line.
const FORM_LEN = 5;

const formPoints = (form: FormResult[]) =>
  form.reduce((n, r) => n + (r === "W" ? 3 : r === "D" ? 1 : 0), 0);

const sign = (n: number) => (n > 0 ? 1 : n < 0 ? -1 : 0);

/**
 * Recent W/D/L form for every team, derived from our own finished matches
 * (regulation scores). Built in a single pass so the analyse page needs no
 * per-team queries. Keyed by team name; values are oldest→newest.
 */
function buildFormMap(all: MatchWithPrediction[]): Map<string, FormResult[]> {
  const map = new Map<string, FormResult[]>();
  const push = (team: string, r: FormResult) => {
    const arr = map.get(team) ?? [];
    arr.push(r);
    map.set(team, arr);
  };
  // getMatchesWithPredictions returns ascending by kickoff, so appending keeps
  // chronological order.
  for (const m of all) {
    if (m.status !== "FINISHED" || m.homeScore == null || m.awayScore == null) continue;
    if (m.homeScore > m.awayScore) {
      push(m.homeTeam, "W");
      push(m.awayTeam, "L");
    } else if (m.homeScore < m.awayScore) {
      push(m.homeTeam, "L");
      push(m.awayTeam, "W");
    } else {
      push(m.homeTeam, "D");
      push(m.awayTeam, "D");
    }
  }
  return map;
}

/**
 * A simple, explainable lean: each of three signals — group points, recent
 * form, crowd sentiment — casts a vote for home/away. The net decides the
 * favourite and how confident we are. "even" when the signals cancel out.
 */
function computeLean(
  home: TeamAnalysis,
  away: TeamAnalysis,
  crowd: MatchStats,
): Lean {
  const standingEdge = sign((home.standing?.points ?? 0) - (away.standing?.points ?? 0));
  const formEdge = sign(formPoints(home.form) - formPoints(away.form));
  const crowdEdge = crowd.total > 0 ? sign(crowd.home.pct - crowd.away.pct) : 0;
  const net = standingEdge + formEdge + crowdEdge;
  if (net === 0) return { side: "even", strength: "slight" };
  return {
    side: net > 0 ? "home" : "away",
    strength: Math.abs(net) >= 2 ? "clear" : "slight",
  };
}

/**
 * Analysis for a single match: group standing + recent form for each side, the
 * crowd's prediction split, and a computed lean. Rendered inline on the match
 * detail page. All from free sources — football-data.org standings (cached,
 * best-effort) and our own predictions. Returns null if the match is unknown.
 */
export async function getMatchAnalysis(
  matchId: number,
  userId: number,
): Promise<GameAnalysis | null> {
  const all = await getMatchesWithPredictions(userId);
  const match = all.find((m) => m.id === matchId);
  if (!match) return null;

  const formMap = buildFormMap(all);

  // Standings are best-effort: a missing key, rate limit or outage must never
  // break the page — we just render without group positions.
  let standings: Map<string, StandingRow> | null = null;
  try {
    standings = await fetchStandings();
  } catch (e) {
    console.error("standings fetch failed:", e instanceof Error ? e.message : e);
  }

  const lookup = (team: string, code: string | null): StandingRow | null =>
    (code && standings?.get(code.toUpperCase())) || standings?.get(team) || null;

  const recentForm = (team: string): FormResult[] =>
    (formMap.get(team) ?? []).slice(-FORM_LEN);

  const home: TeamAnalysis = {
    standing: lookup(match.homeTeam, match.homeCode),
    form: recentForm(match.homeTeam),
  };
  const away: TeamAnalysis = {
    standing: lookup(match.awayTeam, match.awayCode),
    form: recentForm(match.awayTeam),
  };
  const crowd = await getMatchPredictionStats(matchId);
  return { match, home, away, crowd, lean: computeLean(home, away, crowd) };
}
