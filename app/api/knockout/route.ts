import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { getTeamPool, getUserBracket, isBracketLocked } from "@/lib/bracket-server";
import { db } from "@/lib/db";
import { bracketResults } from "@/lib/db/schema";
import { BRACKET_ROUNDS, roundOfSlot, teamOfSlot, type BracketRound } from "@/lib/bracket";
import { saveBracket } from "@/app/actions/bracket";

export const dynamic = "force-dynamic";

/**
 * GET /api/knockout
 * Returns team pool, lock status, actual results, and user's current bracket picks.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();

    const [pool, locked, resultsRows] = await Promise.all([
      getTeamPool(),
      isBracketLocked(),
      db.select().from(bracketResults),
    ]);

    const results = Object.fromEntries(
      BRACKET_ROUNDS.map((r) => [r, [] as string[]])
    ) as Record<BracketRound, string[]>;

    for (const row of resultsRows) {
      const round = roundOfSlot(row.slot);
      const team = teamOfSlot(row.slot);
      if (results[round]) {
        results[round].push(team);
      }
    }

    let picks = null;
    if (session) {
      picks = await getUserBracket(session.uid);
    }

    return NextResponse.json({
      ok: true,
      pool,
      locked,
      results,
      picks,
    });
  } catch (error) {
    console.error("Failed to fetch knockout data:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/knockout
 * Saves user's bracket picks.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const picks = body.picks;
    if (!picks) {
      return NextResponse.json(
        { ok: false, error: "Missing 'picks' in request body" },
        { status: 400 }
      );
    }

    const res = await saveBracket(picks);
    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save knockout picks:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
