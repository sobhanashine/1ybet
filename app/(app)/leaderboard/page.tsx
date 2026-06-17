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
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{t.leaderboard.title}</h1>

      {/* rows */}
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t.leaderboard.empty}</p>
      ) : (
        <ol className="space-y-2">
          {rows.map((r, i) => {
            const me = r.userId === user?.id;
            return (
              <li
                key={r.userId}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                  me ? "bg-pitch-100 ring-1 ring-pitch-200" : "bg-surface ring-1 ring-white/10"
                }`}
              >
                <span
                  className={`w-7 text-center text-sm font-bold ${
                    i < 3 ? "text-gold" : "text-muted"
                  }`}
                >
                  {toPersianDigits(i + 1)}
                </span>
                <span className="flex-1 truncate text-sm font-medium">
                  {r.displayName}
                  {me && <span className="mr-1 text-xs text-pitch-600"> (شما)</span>}
                </span>
                <span className="text-sm font-bold text-pitch-700">
                  {toPersianDigits(r.points)}
                </span>
                {!me && (
                  <Link
                    href={`/h2h?b=${r.userId}`}
                    className="rounded-lg bg-pitch-50/5 px-2 py-1 text-xs text-pitch-600 ring-1 ring-pitch-500/20"
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
