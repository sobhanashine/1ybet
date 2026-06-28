import { fetchKnockoutSlots, type KnockoutSlot } from "@/lib/football-api";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { isLiveWindow } from "@/lib/time";
import TeamFlag from "@/components/TeamFlag";
import KnockoutAutoRefresh from "@/components/KnockoutAutoRefresh";
import { GitBranch, Trophy, ArrowLeft, Check } from "lucide-react";
import { toPersianDigits, formatJalaliDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

// ── Stage ordering ───────────────────────────────────────────────────────────

const STAGE_ORDER: KnockoutSlot["stage"][] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

// Stages that form the main bracket ladder (third-place final is separate).
const LADDER_STAGES: KnockoutSlot["stage"][] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
];

function stageIndex(stage: KnockoutSlot["stage"]): number {
  return STAGE_ORDER.indexOf(stage);
}

function sortByKickoff(slots: KnockoutSlot[]) {
  return [...slots].sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
}

/**
 * Build a lookup from team name → the slots they appear in. Used to resolve a
 * winner's *actual* next match by name — the only reliable way, since the free
 * API exposes no bracket-linkage data and next-round fixtures are TBD until
 * their feeding matches finish.
 */
function buildTeamSlotIndex(slots: KnockoutSlot[]): Map<string, KnockoutSlot[]> {
  const map = new Map<string, KnockoutSlot[]>();
  for (const s of slots) {
    for (const team of [s.homeTeam, s.awayTeam]) {
      if (!team) continue;
      const arr = map.get(team) ?? [];
      arr.push(s);
      map.set(team, arr);
    }
  }
  return map;
}

/**
 * The match a finished match's winner advances to: a slot in a strictly later
 * ladder stage that actually contains the winning team. Returns null when the
 * next round hasn't been drawn yet (winner not placed anywhere downstream).
 */
function resolveNextMatch(
  match: KnockoutSlot,
  teamIndex: Map<string, KnockoutSlot[]>,
): KnockoutSlot | null {
  if (match.status !== "FINISHED" || !match.winnerTeam) return null;
  if (match.stage === "FINAL" || match.stage === "THIRD_PLACE") return null;

  const here = stageIndex(match.stage);
  const candidates = teamIndex.get(match.winnerTeam) ?? [];
  const next = candidates
    .filter((s) => stageIndex(s.stage) > here && LADDER_STAGES.includes(s.stage))
    .sort((a, b) => stageIndex(a.stage) - stageIndex(b.stage))[0];
  return next ?? null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function TeamCell({
  team,
  flagUrl,
  isWinner,
  isLoser,
  side,
}: {
  team: string | null;
  flagUrl: string | null;
  isWinner: boolean;
  isLoser: boolean;
  side: "home" | "away";
}) {
  const tbd = !team;
  const name = tbd ? t.knockout.tbdTeam : teamFa(team!);

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 ${
        side === "away" ? "flex-row-reverse" : ""
      }`}
    >
      {!tbd && (
        <TeamFlag
          teamName={team!}
          flagUrl={flagUrl}
          className={`h-4 w-auto max-w-[24px] shrink-0 rounded-[2px] object-contain ${
            isLoser ? "opacity-40 grayscale" : ""
          }`}
        />
      )}
      <span
        className={`truncate text-xs ${
          isWinner
            ? "font-extrabold text-pitch-700"
            : isLoser
              ? "font-medium text-muted line-through decoration-muted/40"
              : tbd
                ? "font-bold italic text-muted"
                : "font-bold text-ink"
        }`}
      >
        {name}
      </span>
      {isWinner && (
        <Check
          className="h-3.5 w-3.5 shrink-0 text-pitch-600"
          strokeWidth={3}
          aria-label={t.knockout.advanced}
          aria-hidden={false}
        />
      )}
    </div>
  );
}

/**
 * Footer strip on a FINISHED match: who advanced and which match they go to
 * next — shown only when that next match is actually known from the API.
 */
function NextUp({ next }: { next: KnockoutSlot }) {
  // The opponent in the next match (if both sides are known).
  const opponentKnown = next.homeTeam && next.awayTeam;

  return (
    <div className="flex items-center justify-between gap-2 border-t border-line bg-pitch-500/5 px-3 py-2">
      <span className="flex items-center gap-1 text-[11px] font-semibold text-pitch-600">
        <ArrowLeft className="h-3 w-3" aria-hidden />
        {t.knockout.advancesTo}
      </span>
      <div className="flex flex-col items-end gap-0.5 text-end">
        <span className="text-[11px] font-extrabold text-ink">
          {t.stage[next.stage]}
        </span>
        {opponentKnown ? (
          <span className="text-[10px] text-muted">
            {teamFa(next.homeTeam!)} {t.knockout.vsLabel} {teamFa(next.awayTeam!)}
          </span>
        ) : (
          <span className="text-[10px] text-muted">
            {formatJalaliDate(next.kickoffAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function MatchCard({
  slot,
  next,
}: {
  slot: KnockoutSlot;
  next: KnockoutSlot | null;
}) {
  const isLive = slot.status === "LIVE";
  const isFinished = slot.status === "FINISHED";
  const decided = isFinished && !!slot.winnerTeam;
  const homeWon = decided && slot.winnerTeam === slot.homeTeam;
  const awayWon = decided && slot.winnerTeam === slot.awayTeam;
  const homeLost = decided && !!slot.homeTeam && !homeWon;
  const awayLost = decided && !!slot.awayTeam && !awayWon;

  return (
    <div className="card overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 py-2.5">
        <TeamCell
          team={slot.homeTeam}
          flagUrl={slot.homeFlag}
          isWinner={homeWon}
          isLoser={homeLost}
          side="home"
        />

        <div className="min-w-[60px] shrink-0 text-center">
          {slot.status === "SCHEDULED" ? (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-xs font-bold text-ink-dim tnum">
                {formatTime(slot.kickoffAt)}
              </span>
              <span className="text-[10px] text-muted">
                {formatJalaliDate(slot.kickoffAt)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-0.5">
              {/* RTL layout: home team is on the right, away on the left.
                  Print away–home so each score sits beside its own team. */}
              <span
                className={`text-base font-black tnum ${
                  isLive ? "text-danger" : "text-ink"
                }`}
                dir="ltr"
              >
                {slot.awayScore != null ? toPersianDigits(slot.awayScore) : "–"}
                &ndash;
                {slot.homeScore != null ? toPersianDigits(slot.homeScore) : "–"}
              </span>
              {isLive ? (
                <span className="rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                  {t.knockout.live}
                </span>
              ) : (
                <span className="text-[10px] text-muted">
                  {t.knockout.finished}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <TeamCell
            team={slot.awayTeam}
            flagUrl={slot.awayFlag}
            isWinner={awayWon}
            isLoser={awayLost}
            side="away"
          />
        </div>
      </div>

      {next && <NextUp next={next} />}
    </div>
  );
}

function RoundSection({
  stage,
  slots,
  teamIndex,
}: {
  stage: KnockoutSlot["stage"];
  slots: KnockoutSlot[];
  teamIndex: Map<string, KnockoutSlot[]>;
}) {
  const sorted = sortByKickoff(slots);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between px-0.5">
        <h2 className="text-sm font-extrabold text-ink">{t.stage[stage]}</h2>
        <span className="text-[11px] text-muted">
          {toPersianDigits(slots.length)} بازی
        </span>
      </div>
      <div className="space-y-2">
        {sorted.map((slot) => (
          <MatchCard
            key={slot.extId}
            slot={slot}
            next={resolveNextMatch(slot, teamIndex)}
          />
        ))}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function KnockoutPage() {
  let allSlots: KnockoutSlot[] = [];
  let fetchFailed = false;

  try {
    allSlots = await fetchKnockoutSlots();
  } catch (e) {
    console.error("knockout fetch failed:", e instanceof Error ? e.message : e);
    fetchFailed = true;
  }

  const teamIndex = buildTeamSlotIndex(allSlots);

  const byStage = new Map<KnockoutSlot["stage"], KnockoutSlot[]>();
  for (const s of allSlots) {
    const arr = byStage.get(s.stage) ?? [];
    arr.push(s);
    byStage.set(s.stage, arr);
  }

  const hasData = allSlots.length > 0;

  // Auto-refresh only while a knockout match is plausibly in progress, so a
  // finished result fills into the bracket without a manual reload.
  const liveActive = allSlots.some(
    (s) => s.status !== "FINISHED" && isLiveWindow(s.kickoffAt),
  );

  // Final shown prominently at the top once both finalists are known.
  const finalSlot = sortByKickoff(byStage.get("FINAL") ?? [])[0] ?? null;
  const finalReady = finalSlot?.homeTeam && finalSlot?.awayTeam;

  return (
    <div className="space-y-5">
      <KnockoutAutoRefresh active={liveActive} />
      <div className="flex items-center gap-2">
        <GitBranch className="h-5 w-5 text-pitch-700" aria-hidden />
        <div>
          <h1 className="text-xl font-extrabold text-ink">{t.knockout.title}</h1>
          <p className="text-[11px] text-muted">{t.knockout.subtitle}</p>
        </div>
      </div>

      {!hasData ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">
            {fetchFailed ? t.knockout.unavailable : t.knockout.empty}
          </p>
        </div>
      ) : (
        <>
          {finalReady && finalSlot && (
            <div className="card overflow-hidden border-gold/40">
              <div className="flex items-center gap-1.5 border-b border-line bg-gold/10 px-3 py-2">
                <Trophy className="h-3.5 w-3.5 text-gold" aria-hidden />
                <span className="text-xs font-extrabold text-gold">
                  {t.stage.FINAL}
                </span>
              </div>
              <MatchCard slot={finalSlot} next={null} />
            </div>
          )}

          <div className="space-y-5">
            {STAGE_ORDER.filter((s) => byStage.has(s)).map((stage) => (
              <RoundSection
                key={stage}
                stage={stage}
                slots={byStage.get(stage)!}
                teamIndex={teamIndex}
              />
            ))}
          </div>

          <p className="px-1 text-center text-[10px] text-muted">
            {t.knockout.source}
          </p>
        </>
      )}
    </div>
  );
}
