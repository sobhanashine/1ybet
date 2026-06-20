import "server-only";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "./db";
import { matches, predictions, users } from "./db/schema";
import { sendEmail, predictionResultEmailHtml } from "./email";
import { teamFa, teamFlag } from "./teams-fa";
import { sendTelegramMessage } from "./telegram";
import { fetchWorldCupMatches } from "./football-api";
import { scorePrediction } from "./scoring";
import { resolveBracketResults, scoreBracket } from "./bracket-server";
import { updateStreaksAndBadges } from "./badges-server";
import { awardTournamentTop3 } from "./tournament-badges";

export type SyncSummary = {
  fetched: number;
  upserted: number;
  matchesScored: number;
  predictionsScored: number;
  bracketScored: number;
  badgesAwarded: number;
};

/** Pull fixtures + results from football-data.org and upsert into `matches`. */
async function upsertFromApi(): Promise<{ fetched: number; upserted: number }> {
  const normalized = await fetchWorldCupMatches();
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
  return { fetched: normalized.length, upserted };
}

/**
 * Score predictions for FINISHED matches that have a regulation score and
 * unscored predictions. Returns how many matches/predictions were scored.
 */
export async function scoreFinishedMatches(): Promise<{
  matchesScored: number;
  predictionsScored: number;
}> {
  const finished = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.status, "FINISHED"),
        isNotNull(matches.homeScore),
        isNotNull(matches.awayScore),
        isNull(matches.scoredAt),
      ),
    );

  let matchesScored = 0;
  let predictionsScored = 0;

  for (const m of finished) {
    const unscored = await db
      .select({
        prediction: predictions,
        email: users.email,
        displayName: users.displayName,
        telegramId: users.telegramId,
      })
      .from(predictions)
      .innerJoin(users, eq(predictions.userId, users.id))
      .where(and(eq(predictions.matchId, m.id), eq(predictions.scored, false)));

    if (unscored.length === 0) {
      if (!m.scoredAt) {
        await db
          .update(matches)
          .set({ scoredAt: new Date() })
          .where(eq(matches.id, m.id));
      }
      continue;
    }

    for (const p of unscored) {
      const pts = scorePrediction(
        p.prediction.predHome,
        p.prediction.predAway,
        m.homeScore!,
        m.awayScore!,
      );
      await db
        .update(predictions)
        .set({ points: pts, scored: true })
        .where(eq(predictions.id, p.prediction.id));

      const homeFa = teamFa(m.homeTeam);
      const awayFa = teamFa(m.awayTeam);

      if (p.telegramId) {
        try {
          let message = "";
          if (pts === 10) {
            message = "🔥 فوق‌العاده بود! نتیجه دقیق را حدس زدی و ۱۰ امتیاز کامل گرفتی!";
          } else if (pts === 7) {
            message = "👏 آفرین! تفاضل گل و نتیجه بازی را درست حدس زدی و ۷ امتیاز گرفتی!";
          } else if (pts === 5) {
            message = "👍 خوب بود! برنده بازی را درست حدس زدی و ۵ امتیاز گرفتی!";
          } else {
            message = "پیش‌بینی‌ات درست نبود ولی ۲ امتیاز مشارکت را گرفتی. برای بازی بعدی بیشتر تلاش کن! ⚽";
          }

          const homeFlag = teamFlag(m.homeTeam);
          const awayFlag = teamFlag(m.awayTeam);
          const tgMsg = `🏆 نتیجه پیش‌بینی مسابقه 🏆
----------------------------------
سلام ${p.displayName || "کاربر"} عزیز، بازی مورد نظر به پایان رسید و امتیاز شما محاسبه شد.

⚽️ مسابقه: ${homeFlag} ${homeFa} - ${awayFa} ${awayFlag}
🏁 نتیجه واقعی: ${m.homeScore} - ${m.awayScore}
🔮 پیش‌بینی شما: ${p.prediction.predHome} - ${p.prediction.predAway}

💎 امتیاز کسب شده: ${pts} امتیاز
----------------------------------
${message}`;
          await sendTelegramMessage(p.telegramId, tgMsg);
        } catch (err) {
          console.error("Failed to send prediction result Telegram message:", err);
        }
      } else if (p.email) {
        try {
          const html = predictionResultEmailHtml({
            displayName: p.displayName || "کاربر",
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            homeScore: m.homeScore!,
            awayScore: m.awayScore!,
            predHome: p.prediction.predHome,
            predAway: p.prediction.predAway,
            points: pts,
          });
          await sendEmail(
            p.email,
            `🏆 نتیجه پیش‌بینی مسابقه ${homeFa} - ${awayFa}`,
            html,
          );
        } catch (err) {
          console.error("Failed to send prediction result email:", err);
        }
      }

      predictionsScored++;
    }

    await db
      .update(matches)
      .set({ scoredAt: new Date() })
      .where(eq(matches.id, m.id));
    matchesScored++;
  }

  return { matchesScored, predictionsScored };
}

/** Re-score every prediction for one match (used by admin score overrides). */
export async function rescoreMatch(matchId: number): Promise<number> {
  const [m] = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  if (!m || m.homeScore == null || m.awayScore == null) return 0;

  const preds = await db
    .select()
    .from(predictions)
    .where(eq(predictions.matchId, matchId));

  for (const p of preds) {
    const pts = scorePrediction(p.predHome, p.predAway, m.homeScore, m.awayScore);
    await db
      .update(predictions)
      .set({ points: pts, scored: true })
      .where(eq(predictions.id, p.id));
  }
  await db.update(matches).set({ scoredAt: new Date() }).where(eq(matches.id, matchId));
  return preds.length;
}

/** Full sync: pull from API, score matches, then resolve & score the bracket. */
export async function runSync(): Promise<SyncSummary> {
  // Pulling fresh fixtures/results from the API is best-effort: if it fails
  // (rate limit, outage, missing/invalid key) we must STILL score the finished
  // matches already in the DB — e.g. results an admin entered by hand.
  // Otherwise one flaky API call leaves every prediction unscored.
  let fetched = 0;
  let upserted = 0;
  try {
    ({ fetched, upserted } = await upsertFromApi());
  } catch (e) {
    console.error(
      "API upsert failed (continuing to score local results):",
      e instanceof Error ? e.message : e,
    );
  }

  const { matchesScored, predictionsScored } = await scoreFinishedMatches();

  // Bracket and badge scoring are best-effort: a failure here must NOT abort the
  // request or mask the match predictions we already scored and committed above
  // (otherwise the sync reports failure and the latest results look unscored).
  let bracketScored = 0;
  let badgesAwarded = 0;
  try {
    await resolveBracketResults();
    bracketScored = await scoreBracket();
  } catch (e) {
    console.error("Bracket scoring failed:", e instanceof Error ? e.message : e);
  }
  try {
    ({ badgesAwarded } = await updateStreaksAndBadges());
  } catch (e) {
    console.error("Badge update failed:", e instanceof Error ? e.message : e);
  }
  try {
    badgesAwarded += await awardTournamentTop3();
  } catch (e) {
    console.error(
      "Tournament podium award failed:",
      e instanceof Error ? e.message : e,
    );
  }

  return {
    fetched,
    upserted,
    matchesScored,
    predictionsScored,
    bracketScored,
    badgesAwarded,
  };
}
