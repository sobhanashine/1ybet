/**
 * Seeds the badge catalog and a small set of sample matches so the app is
 * usable in local dev before the football-data.org sync (M4) runs.
 * Run: `npm run seed`
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { badges, matches } from "@/lib/db/schema";
import { BADGE_CATALOG } from "@/lib/badges";
import { sql } from "drizzle-orm";

function at(daysFromNow: number, hour: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

const SAMPLE_MATCHES = [
  // a few finished matches (yesterday) so scoring/leaderboards have data
  {
    extId: "sample-1",
    stage: "GROUP" as const,
    groupName: "A",
    homeTeam: "Argentina",
    awayTeam: "Mexico",
    kickoffAt: at(-1, 16),
    status: "FINISHED" as const,
    homeScore: 2,
    awayScore: 1,
    scoredAt: at(-1, 18),
  },
  {
    extId: "sample-2",
    stage: "GROUP" as const,
    groupName: "A",
    homeTeam: "Brazil",
    awayTeam: "Croatia",
    kickoffAt: at(-1, 19),
    status: "FINISHED" as const,
    homeScore: 0,
    awayScore: 0,
    scoredAt: at(-1, 21),
  },
  // today
  {
    extId: "sample-3",
    stage: "GROUP" as const,
    groupName: "B",
    homeTeam: "France",
    awayTeam: "Iran",
    kickoffAt: at(0, 18),
    status: "SCHEDULED" as const,
  },
  {
    extId: "sample-4",
    stage: "GROUP" as const,
    groupName: "B",
    homeTeam: "Spain",
    awayTeam: "Japan",
    kickoffAt: at(0, 21),
    status: "SCHEDULED" as const,
  },
  // upcoming
  {
    extId: "sample-5",
    stage: "GROUP" as const,
    groupName: "C",
    homeTeam: "England",
    awayTeam: "USA",
    kickoffAt: at(1, 18),
    status: "SCHEDULED" as const,
  },
  {
    extId: "sample-6",
    stage: "GROUP" as const,
    groupName: "C",
    homeTeam: "Germany",
    awayTeam: "Morocco",
    kickoffAt: at(2, 20),
    status: "SCHEDULED" as const,
  },
];

async function main() {
  // Imported here so env is loaded before lib/db reads DATABASE_URL.
  const { db } = await import("@/lib/db");

  console.log("Seeding badges…");
  for (const b of BADGE_CATALOG) {
    await db
      .insert(badges)
      .values(b)
      .onConflictDoUpdate({
        target: badges.code,
        set: { titleFa: b.titleFa, descFa: b.descFa, icon: b.icon },
      });
  }

  console.log("Seeding sample matches…");
  for (const m of SAMPLE_MATCHES) {
    await db
      .insert(matches)
      .values(m)
      .onConflictDoUpdate({ target: matches.extId, set: m });
  }

  const [{ count: matchCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(matches);
  console.log(`Done. ${matchCount} matches in DB.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
