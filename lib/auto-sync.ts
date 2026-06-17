import "server-only";
import { and, eq, gt, lt, isNull, or, ne } from "drizzle-orm";
import { db } from "./db";
import { matches } from "./db/schema";
import { runSync } from "./sync";

// Best-effort, in-process throttle so concurrent requests on a warm serverless
// instance don't all kick off a sync at once. Resets on cold start, which is
// fine — the DB "pending work" gate below is the real protection.
let lastRun = 0;
let inFlight: Promise<void> | null = null;
const THROTTLE_MS = 90_000;

/**
 * Is there match work a sync would actually resolve? Keeps us from hitting the
 * football-data API on every page load: once everything finished is scored,
 * this returns false and no external call is made.
 */
async function hasPendingWork(): Promise<boolean> {
  const now = Date.now();
  const recentFrom = new Date(now - 24 * 60 * 60 * 1000); // ignore long-stale fixtures
  const overdueTo = new Date(now - 150 * 60 * 1000); // ~kickoff + 2.5h => should be done

  const [row] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(
      or(
        // finished, but its predictions haven't been scored yet
        and(eq(matches.status, "FINISHED"), isNull(matches.scoredAt)),
        // should be over by now but we still don't have a final result
        and(
          ne(matches.status, "FINISHED"),
          gt(matches.kickoffAt, recentFrom),
          lt(matches.kickoffAt, overdueTo),
        ),
      ),
    )
    .limit(1);

  return !!row;
}

/**
 * Opportunistically pull results & score predictions on page load when there's
 * pending work, so scores and the leaderboard self-update even without an
 * external cron or CRON_SECRET configured. Never throws: any failure is logged
 * and the page renders normally.
 */
export async function maybeAutoSync(): Promise<void> {
  if (Date.now() - lastRun < THROTTLE_MS) return;
  if (inFlight) {
    await inFlight;
    return;
  }
  try {
    if (!process.env.FOOTBALL_DATA_API_KEY) return; // can't sync without a key
    if (!(await hasPendingWork())) {
      lastRun = Date.now();
      return;
    }
    inFlight = (async () => {
      try {
        await runSync();
      } catch (e) {
        console.error("auto-sync failed:", e instanceof Error ? e.message : e);
      } finally {
        lastRun = Date.now();
        inFlight = null;
      }
    })();
    await inFlight;
  } catch (e) {
    console.error("auto-sync precheck failed:", e instanceof Error ? e.message : e);
  }
}
