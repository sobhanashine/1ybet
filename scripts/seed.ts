/**
 * Seeds the badge catalog and a small set of sample matches so the app is
 * usable in local dev before the football-data.org sync (M4) runs.
 * Run: `npm run seed`
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { badges } from "@/lib/db/schema";
import { BADGE_CATALOG } from "@/lib/badges";

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

  console.log("Done seeding badges.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
