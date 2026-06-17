/**
 * One-off: remove seed/sample matches (and their predictions) and pull the real
 * WC 2026 fixtures from football-data.org. Run: `npx tsx scripts/resync.ts`
 *
 * Inlines the fetch+normalize so it can run under tsx without Next's
 * `server-only` shim. Mirrors lib/football-api.ts.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { inArray, like } from "drizzle-orm";

const STAGE_MAP: Record<string, string> = {
  GROUP_STAGE: "GROUP",
  LAST_32: "LAST_32",
  LAST_16: "LAST_16",
  QUARTER_FINALS: "QUARTER_FINAL",
  SEMI_FINALS: "SEMI_FINAL",
  THIRD_PLACE: "THIRD_PLACE",
  "3RD_PLACE_FINAL": "THIRD_PLACE",
  FINAL: "FINAL",
};

function mapStatus(s: string) {
  if (s === "FINISHED") return "FINISHED";
  if (s === "IN_PLAY" || s === "PAUSED") return "LIVE";
  return "SCHEDULED";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalize(m: any) {
  const stage = STAGE_MAP[m.stage];
  if (!stage) return null;
  if (!m.homeTeam?.name || !m.awayTeam?.name) return null;
  const finished = m.status === "FINISHED";
  const rt = m.score?.regularTime;
  const reg =
    finished && rt && rt.home != null && rt.away != null
      ? { home: rt.home, away: rt.away }
      : finished
        ? { home: m.score.fullTime.home, away: m.score.fullTime.away }
        : { home: null, away: null };
  let winnerTeam: string | null = null;
  if (finished) {
    if (m.score.winner === "HOME_TEAM") winnerTeam = m.homeTeam.name;
    else if (m.score.winner === "AWAY_TEAM") winnerTeam = m.awayTeam.name;
  }
  return {
    extId: `fd-${m.id}`,
    stage: stage as never,
    groupName: m.group?.replace(/^GROUP_/, "") ?? null,
    homeTeam: m.homeTeam.name,
    awayTeam: m.awayTeam.name,
    homeCode: m.homeTeam.tla ?? null,
    awayCode: m.awayTeam.tla ?? null,
    homeFlag: m.homeTeam.crest ?? null,
    awayFlag: m.awayTeam.crest ?? null,
    kickoffAt: new Date(m.utcDate),
    status: mapStatus(m.status) as never,
    homeScore: reg.home,
    awayScore: reg.away,
    winnerTeam,
  };
}

async function main() {
  const { db } = await import("@/lib/db");
  const { matches, predictions } = await import("@/lib/db/schema");

  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) throw new Error("Missing FOOTBALL_DATA_API_KEY");

  const res = await fetch(
    "https://api.football-data.org/v4/competitions/WC/matches",
    { headers: { "X-Auth-Token": key }, cache: "no-store" },
  );
  if (!res.ok) throw new Error(`football-data.org ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { matches: unknown[] };
  const normalized = data.matches
    .map(normalize)
    .filter((m): m is NonNullable<typeof m> => m !== null);
  console.log(`Fetched ${normalized.length} real matches from the API.`);

  // Drop sample-* matches and any predictions attached to them.
  const samples = await db
    .select({ id: matches.id })
    .from(matches)
    .where(like(matches.extId, "sample-%"));
  const sampleIds = samples.map((s) => s.id);
  if (sampleIds.length) {
    await db.delete(predictions).where(inArray(predictions.matchId, sampleIds));
    await db.delete(matches).where(inArray(matches.id, sampleIds));
    console.log(`Removed ${sampleIds.length} sample matches.`);
  }

  let upserted = 0;
  for (const m of normalized) {
    await db
      .insert(matches)
      .values(m)
      .onConflictDoUpdate({
        target: matches.extId,
        set: {
          stage: m.stage,
          groupName: m.groupName,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          homeCode: m.homeCode,
          awayCode: m.awayCode,
          homeFlag: m.homeFlag,
          awayFlag: m.awayFlag,
          kickoffAt: m.kickoffAt,
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          winnerTeam: m.winnerTeam,
        },
      });
    upserted++;
  }
  console.log(`Upserted ${upserted} matches.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
