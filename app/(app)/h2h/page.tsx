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
    <div className="grid grid-cols-3 items-center gap-2 border-b border-line py-2.5 text-sm last:border-0">
      <span className={`text-center font-extrabold tnum ${a >= b ? "text-pitch-700" : "text-muted"}`}>
        {fmt(a)}
      </span>
      <span className="text-center text-xs font-medium text-muted">{label}</span>
      <span className={`text-center font-extrabold tnum ${b >= a ? "text-pitch-700" : "text-muted"}`}>
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
        className={`tnum rounded-md border px-2 py-1 text-sm font-extrabold ${
          win ? "border-pitch-200 bg-pitch-50 text-pitch-700" : "border-line bg-surface-2 text-ink"
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
        <h1 className="text-xl font-extrabold text-ink">{t.compare.title}</h1>
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
        <h1 className="text-xl font-extrabold text-ink">{t.compare.title}</h1>
        <Link href="/h2h" className="text-xs font-semibold text-pitch-700 transition-colors hover:text-pitch-500">
          {t.compare.compare}
        </Link>
      </div>

      <div className="card grid grid-cols-3 items-center gap-2 p-4">
        <span className="truncate text-center text-sm font-extrabold text-pitch-700">{youLabel}</span>
        <span className="text-center text-xs font-medium text-muted">{t.match.vs}</span>
        <span className="truncate text-center text-sm font-extrabold text-pitch-700">{b.displayName}</span>
      </div>

      <h2 className="section-label">{t.compare.overall}</h2>
      <div className="card px-4">
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

      <h2 className="section-label">{t.leaderboard.stage}</h2>
      <div className="card px-4">
        {stages.map((s) => (
          <Row
            key={s}
            label={t.stage[s]}
            a={a.perStage[s] ?? 0}
            b={b.perStage[s] ?? 0}
          />
        ))}
      </div>

      <h2 className="section-label">{t.compare.matchByMatch}</h2>
      {perMatch.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">{t.compare.noCommonMatches}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {perMatch.map((m) => {
            const aPts = m.a?.scored ? m.a.points : 0;
            const bPts = m.b?.scored ? m.b.points : 0;
            const finished = m.status === "FINISHED";
            return (
              <li key={m.matchId} className="card p-3">
                {/* match header: teams + result */}
                <div className="mb-2.5 flex items-center justify-center gap-2 text-xs">
                  <span className="flex items-center gap-1.5 font-bold text-ink">
                    <TeamFlag teamName={m.homeTeam} flagUrl={m.homeFlag} className="h-3.5 w-auto max-w-[20px] rounded-sm object-contain" />
                    {teamFa(m.homeTeam)}
                  </span>
                  <span className="tnum font-extrabold text-pitch-700">
                    {finished
                      ? `${toPersianDigits(m.homeScore ?? 0)} - ${toPersianDigits(m.awayScore ?? 0)}`
                      : toPersianDigits(formatTime(m.kickoffAt))}
                  </span>
                  <span className="flex items-center gap-1.5 font-bold text-ink">
                    {teamFa(m.awayTeam)}
                    <TeamFlag teamName={m.awayTeam} flagUrl={m.awayFlag} className="h-3.5 w-auto max-w-[20px] rounded-sm object-contain" />
                  </span>
                </div>
                {/* the two picks side by side */}
                <div className="grid grid-cols-2 gap-2 border-t border-line pt-2.5">
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
