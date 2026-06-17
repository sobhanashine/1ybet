import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCompareStats, getMatchComparison, type Pick } from "@/lib/h2h";
import { getLeaderboard } from "@/lib/leaderboard";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { toPersianDigits, formatTime } from "@/lib/format";
import ComparePicker, { type PickablePlayer } from "@/components/ComparePicker";
import TeamFlag from "@/components/TeamFlag";

export const dynamic = "force-dynamic";

function Row({
  label,
  a,
  b,
  fmt = (n: number) => toPersianDigits(n),
}: {
  label: string;
  a: number;
  b: number;
  fmt?: (n: number) => string;
}) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 border-b border-white/10 py-2 text-sm last:border-0">
      <span className={`text-center font-bold ${a >= b ? "text-pitch-600" : "text-muted"}`}>
        {fmt(a)}
      </span>
      <span className="text-center text-xs text-muted">{label}</span>
      <span className={`text-center font-bold ${b >= a ? "text-pitch-600" : "text-muted"}`}>
        {fmt(b)}
      </span>
    </div>
  );
}

function PickCell({ pick, win }: { pick: Pick | null; win: boolean }) {
  if (!pick) {
    return (
      <span className="text-center text-xs italic text-muted/60">
        {t.compare.notPredicted}
      </span>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`font-feature-ss01 rounded-lg px-2 py-1 text-sm font-extrabold ${
          win ? "bg-pitch-500/10 text-pitch-700 ring-1 ring-pitch-500/30" : "bg-white/5 text-ink"
        }`}
      >
        {toPersianDigits(pick.predHome)} - {toPersianDigits(pick.predAway)}
      </span>
      {pick.scored && (
        <span className="text-[10px] font-bold text-muted">
          {toPersianDigits(pick.points)} {t.match.points}
        </span>
      )}
    </div>
  );
}

export default async function H2HPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const aId = Number(sp.a ?? me?.id);
  const bId = Number(sp.b);

  // No opponent selected → show the player picker (everyone in the leaderboard).
  if (!bId || Number.isNaN(bId)) {
    const rows = await getLeaderboard({ kind: "total" });
    const players: PickablePlayer[] = rows
      .filter((r) => r.userId !== aId && r.displayName)
      .map((r) => ({ id: r.userId, displayName: r.displayName!, points: r.points }));

    return (
      <div className="space-y-4">
        <h1 className="text-lg font-bold">{t.compare.title}</h1>
        <p className="text-sm text-muted">{t.compare.pickOpponent}</p>
        <ComparePicker players={players} />
      </div>
    );
  }

  const [a, b, perMatch] = await Promise.all([
    getCompareStats(aId),
    getCompareStats(bId),
    getMatchComparison(aId, bId),
  ]);
  if (!a || !b) {
    return <p className="text-sm text-muted">{t.common.error}</p>;
  }

  const stages = ["GROUP", "LAST_32", "LAST_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];
  const youLabel = aId === me?.id ? t.compare.you : a.displayName;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t.compare.title}</h1>
        <Link href="/h2h" className="text-xs text-pitch-600">
          {t.compare.compare}
        </Link>
      </div>

      <div className="grid grid-cols-3 items-center gap-2 rounded-2xl bg-surface p-4 text-ink ring-1 ring-white/10">
        <span className="truncate text-center text-sm font-bold text-pitch-700">{youLabel}</span>
        <span className="text-center text-xs font-medium text-muted">{t.match.vs}</span>
        <span className="truncate text-center text-sm font-bold text-pitch-700">{b.displayName}</span>
      </div>

      <h2 className="text-sm font-bold text-pitch-600">{t.compare.overall}</h2>
      <div className="rounded-2xl bg-surface px-4 ring-1 ring-white/10">
        <Row label={t.profile.totalPoints} a={a.total} b={b.total} />
        <Row label={t.compare.predictions} a={a.predicted} b={b.predicted} />
        <Row label={t.compare.exact} a={a.exactCount} b={b.exactCount} />
        <Row
          label={t.compare.accuracy}
          a={a.accuracy}
          b={b.accuracy}
          fmt={(n) => `${toPersianDigits(n)}٪`}
        />
        <Row label={t.profile.bestStreak} a={a.bestStreak} b={b.bestStreak} />
      </div>

      <h2 className="text-sm font-bold text-pitch-600">{t.leaderboard.stage}</h2>
      <div className="rounded-2xl bg-surface px-4 ring-1 ring-white/10">
        {stages.map((s) => (
          <Row
            key={s}
            label={t.stage[s]}
            a={a.perStage[s] ?? 0}
            b={b.perStage[s] ?? 0}
          />
        ))}
      </div>

      <h2 className="text-sm font-bold text-pitch-600">{t.compare.matchByMatch}</h2>
      {perMatch.length === 0 ? (
        <p className="text-sm text-muted">{t.compare.noCommonMatches}</p>
      ) : (
        <ul className="space-y-2">
          {perMatch.map((m) => {
            const aPts = m.a?.scored ? m.a.points : 0;
            const bPts = m.b?.scored ? m.b.points : 0;
            const finished = m.status === "FINISHED";
            return (
              <li
                key={m.matchId}
                className="rounded-2xl bg-surface p-3 ring-1 ring-white/10"
              >
                {/* match header: teams + result */}
                <div className="mb-2 flex items-center justify-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-ink">
                    <TeamFlag teamName={m.homeTeam} flagUrl={m.homeFlag} className="h-3.5 w-auto max-w-[20px] object-contain rounded-sm shadow-sm" />
                    {teamFa(m.homeTeam)}
                  </span>
                  <span className="font-feature-ss01 font-extrabold text-pitch-700">
                    {finished
                      ? `${toPersianDigits(m.homeScore ?? 0)} - ${toPersianDigits(m.awayScore ?? 0)}`
                      : toPersianDigits(formatTime(m.kickoffAt))}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-ink">
                    {teamFa(m.awayTeam)}
                    <TeamFlag teamName={m.awayTeam} flagUrl={m.awayFlag} className="h-3.5 w-auto max-w-[20px] object-contain rounded-sm shadow-sm" />
                  </span>
                </div>
                {/* the two picks side by side */}
                <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                  <PickCell pick={m.a} win={finished && aPts > bPts} />
                  <PickCell pick={m.b} win={finished && bPts > aPts} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
