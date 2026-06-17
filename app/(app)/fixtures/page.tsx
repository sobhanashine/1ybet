import { getCurrentUser } from "@/lib/auth";
import { getMatchesWithPredictions, isLocked, type MatchWithPrediction } from "@/lib/matches";
import MatchCard from "@/components/MatchCard";
import { t } from "@/lib/i18n";
import { formatJalaliDate, tehranDayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

function groupByDay(ms: MatchWithPrediction[]) {
  const groups = new Map<string, MatchWithPrediction[]>();
  for (const m of ms) {
    const key = tehranDayKey(m.kickoffAt);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(m);
  }
  return [...groups.entries()];
}

export default async function FixturesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const all = await getMatchesWithPredictions(user.id);
  const days = groupByDay(all);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-bold">{t.nav.fixtures}</h1>

      {days.length === 0 && (
        <p className="text-sm text-muted">{t.leaderboard.empty}</p>
      )}

      {days.map(([day, ms]) => (
        <section key={day} className="space-y-3">
          <h2 className="text-sm font-semibold text-pitch-600">
            {formatJalaliDate(ms[0].kickoffAt)}
          </h2>
          <div className="space-y-3">
            {ms.map((m) => (
              <MatchCard key={m.id} match={m} locked={isLocked(m.kickoffAt)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
