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

// How many upcoming/live matches to analyse on the page. Bounds the per-match
// crowd-stat queries; the analyse hub is about the next games, not the archive.
const MAX_GAMES = 12;
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
 * Analysis for the next few games: group standing + recent form for each side,
 * the crowd's prediction split, and a computed lean. All from free sources —
 * football-data.org standings (cached, best-effort) and our own predictions.
 */
export async function getGamesAnalysis(userId: number): Promise<GameAnalysis[]> {
  const all = await getMatchesWithPredictions(userId);
  const formMap = buildFormMap(all);

  const upcoming = all
    .filter((m) => m.status !== "FINISHED")
    .slice(0, MAX_GAMES);

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

  const out: GameAnalysis[] = [];
  for (const m of upcoming) {
    const home: TeamAnalysis = {
      standing: lookup(m.homeTeam, m.homeCode),
      form: recentForm(m.homeTeam),
    };
    const away: TeamAnalysis = {
      standing: lookup(m.awayTeam, m.awayCode),
      form: recentForm(m.awayTeam),
    };
    const crowd = await getMatchPredictionStats(m.id);
    out.push({ match: m, home, away, crowd, lean: computeLean(home, away, crowd) });
  }
  return out;
}
