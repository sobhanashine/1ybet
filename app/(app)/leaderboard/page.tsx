import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard } from "@/lib/leaderboard";
import { maybeAutoSync } from "@/lib/auto-sync";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  await maybeAutoSync();
  const user = await getCurrentUser();
  const rows = await getLeaderboard({ kind: "total" });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold text-ink">{t.leaderboard.title}</h1>

      {rows.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">{t.leaderboard.empty}</p>
        </div>
      ) : (
        <ol className="card divide-y divide-line overflow-hidden">
          {rows.map((r, i) => {
            const me = r.userId === user?.id;
            const rank = i + 1;
            const onPodium = rank <= 3;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            return (
              <li
                key={r.userId}
                className={`flex items-center gap-3 px-3.5 py-3 ${me ? "bg-pitch-50" : ""}`}
              >
                <span
                  className={`flex w-7 shrink-0 justify-center text-sm font-extrabold tnum ${
                    onPodium ? "text-gold" : "text-muted"
                  }`}
                >
                  {medal ?? toPersianDigits(rank)}
                </span>
                <span className="flex-1 truncate text-sm font-bold text-ink">
                  {r.displayName}
                  {me && <span className="mr-1.5 text-xs font-semibold text-pitch-700">(شما)</span>}
                </span>
                <span className="shrink-0 text-base font-extrabold text-pitch-700 tnum">
                  {toPersianDigits(r.points)}
                </span>
                {!me && (
                  <Link
                    href={`/h2h?b=${r.userId}`}
                    className="btn btn-secondary shrink-0 px-2.5 py-1 text-[11px]"
                  >
                    {t.compare.compare}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
