import { fetchWorldCupMatches, type NormalizedMatch } from "@/lib/football-api";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import TeamFlag from "@/components/TeamFlag";
import { GitBranch } from "lucide-react";
import { toPersianDigits, formatJalaliDate, formatTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const KNOCKOUT_STAGE_ORDER: NormalizedMatch["stage"][] = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
];

function ScoreBadge({
  home,
  away,
  status,
  winnerTeam,
  homeTeam,
  awayTeam,
}: {
  home: number | null;
  away: number | null;
  status: NormalizedMatch["status"];
  winnerTeam: string | null;
  homeTeam: string;
  awayTeam: string;
}) {
  if (status === "SCHEDULED") return null;

  const scoreText =
    home != null && away != null
      ? `${toPersianDigits(home)} – ${toPersianDigits(away)}`
      : "– : –";

  const isLive = status === "LIVE";
  const homeWon = winnerTeam === homeTeam;
  const awayWon = winnerTeam === awayTeam;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`text-lg font-black tnum ${
          isLive ? "text-danger" : "text-ink"
        }`}
        dir="ltr"
      >
        {scoreText}
      </span>
      {isLive ? (
        <span className="rounded-full bg-danger/10 px-2 py-0.5 text-[10px] font-bold text-danger">
          {t.knockout.live}
        </span>
      ) : (
        <span className="text-[10px] text-muted">{t.knockout.finished}</span>
      )}
      {!isLive && winnerTeam && (
        <div className="mt-0.5 flex gap-1 text-[9px] font-bold text-pitch-600">
          <span>{homeWon ? "▲" : awayWon ? "" : ""}</span>
          <span>{awayWon ? "▲" : ""}</span>
        </div>
      )}
    </div>
  );
}

function MatchCard({ m }: { m: NormalizedMatch }) {
  const homeWon = m.status === "FINISHED" && m.winnerTeam === m.homeTeam;
  const awayWon = m.status === "FINISHED" && m.winnerTeam === m.awayTeam;

  return (
    <li className="divide-y divide-line">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-3">
        {/* Home team */}
        <div className="flex items-center gap-2">
          <TeamFlag
            teamName={m.homeTeam}
            flagUrl={m.homeFlag}
            className="h-5 w-auto max-w-[28px] shrink-0 rounded-sm object-contain"
          />
          <span
            className={`truncate text-sm font-bold ${
              homeWon ? "text-pitch-700" : "text-ink"
            }`}
          >
            {teamFa(m.homeTeam)}
          </span>
          {homeWon && <span className="shrink-0 text-xs text-pitch-500">✓</span>}
        </div>

        {/* Score / time */}
        <div className="shrink-0">
          {m.status === "SCHEDULED" ? (
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold text-ink-dim tnum">
                {formatTime(m.kickoffAt)}
              </span>
              <span className="text-[10px] text-muted">
                {formatJalaliDate(m.kickoffAt)}
              </span>
            </div>
          ) : (
            <ScoreBadge
              home={m.homeScore}
              away={m.awayScore}
              status={m.status}
              winnerTeam={m.winnerTeam}
              homeTeam={m.homeTeam}
              awayTeam={m.awayTeam}
            />
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center justify-end gap-2">
          {awayWon && <span className="shrink-0 text-xs text-pitch-500">✓</span>}
          <span
            className={`truncate text-sm font-bold ${
              awayWon ? "text-pitch-700" : "text-ink"
            }`}
          >
            {teamFa(m.awayTeam)}
          </span>
          <TeamFlag
            teamName={m.awayTeam}
            flagUrl={m.awayFlag}
            className="h-5 w-auto max-w-[28px] shrink-0 rounded-sm object-contain"
          />
        </div>
      </div>
    </li>
  );
}

function RoundSection({
  stage,
  matches,
}: {
  stage: NormalizedMatch["stage"];
  matches: NormalizedMatch[];
}) {
  const sorted = [...matches].sort(
    (a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime(),
  );

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line bg-surface-2 px-4 py-2.5">
        <h2 className="text-sm font-extrabold text-ink">{t.stage[stage]}</h2>
        <p className="text-[11px] text-muted">
          {toPersianDigits(matches.length)} بازی
        </p>
      </div>
      <ol className="divide-y divide-line">
        {sorted.map((m) => (
          <MatchCard key={m.extId} m={m} />
        ))}
      </ol>
    </section>
  );
}

export default async function KnockoutPage() {
  let matches: NormalizedMatch[] | null = null;
  try {
    const all = await fetchWorldCupMatches();
    matches = all.filter((m) => m.stage !== "GROUP");
  } catch (e) {
    console.error("knockout fetch failed:", e instanceof Error ? e.message : e);
  }

  const grouped = new Map<NormalizedMatch["stage"], NormalizedMatch[]>();
  for (const m of matches ?? []) {
    const list = grouped.get(m.stage) ?? [];
    list.push(m);
    grouped.set(m.stage, list);
  }

  const hasData = grouped.size > 0;

  return (
    <div className="space-y-5">
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
            {matches ? t.knockout.empty : t.knockout.unavailable}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {KNOCKOUT_STAGE_ORDER.filter((s) => grouped.has(s)).map((stage) => (
              <RoundSection
                key={stage}
                stage={stage}
                matches={grouped.get(stage)!}
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
