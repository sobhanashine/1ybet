import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getLeaderboard, type Scope } from "@/lib/leaderboard";
import { maybeAutoSync } from "@/lib/auto-sync";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "total", label: t.leaderboard.total },
  { key: "daily", label: t.leaderboard.daily },
  { key: "weekly", label: t.leaderboard.weekly },
  { key: "stage", label: t.leaderboard.stage },
] as const;

const STAGES = [
  "GROUP",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
] as const;

type SP = { tab?: string; stage?: string };

function scopeFrom(sp: SP): Scope {
  switch (sp.tab) {
    case "daily":
      return { kind: "daily" };
    case "weekly":
      return { kind: "weekly" };
    case "stage":
      return { kind: "stage", stage: sp.stage ?? "GROUP" };
    default:
      return { kind: "total" };
  }
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  await maybeAutoSync();
  const user = await getCurrentUser();
  const scope = scopeFrom(sp);
  const rows = await getLeaderboard(scope);
  const activeTab = sp.tab ?? "total";

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{t.leaderboard.title}</h1>

      {/* tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={`/leaderboard?tab=${tab.key}`}
            className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeTab === tab.key
                ? "bg-pitch-500 text-[#08140e]"
                : "bg-surface text-muted ring-1 ring-white/10"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* stage selector */}
      {activeTab === "stage" && (
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s) => (
            <Link
              key={s}
              href={`/leaderboard?tab=stage&stage=${s}`}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs transition ${
                (sp.stage ?? "GROUP") === s
                  ? "bg-pitch-100 text-pitch-700"
                  : "bg-surface text-muted ring-1 ring-white/10"
              }`}
            >
              {t.stage[s]}
            </Link>
          ))}
        </div>
      )}

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
