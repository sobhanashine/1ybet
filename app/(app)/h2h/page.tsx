import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getCompareStats } from "@/lib/h2h";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

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
    <div className="grid grid-cols-3 items-center gap-2 border-b border-black/5 py-2 text-sm last:border-0">
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

export default async function H2HPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const sp = await searchParams;
  const me = await getCurrentUser();
  const aId = Number(sp.a ?? me?.id);
  const bId = Number(sp.b);

  if (!bId || Number.isNaN(bId)) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-bold">{t.groups.compare}</h1>
        <p className="text-sm text-muted">
          از صفحه گروه، روی «{t.groups.compare}» کنار یک عضو بزنید.
        </p>
        <Link href="/groups" className="text-sm text-pitch-600">
          {t.nav.groups}
        </Link>
      </div>
    );
  }

  const [a, b] = await Promise.all([getCompareStats(aId), getCompareStats(bId)]);
  if (!a || !b) {
    return <p className="text-sm text-muted">{t.common.error}</p>;
  }

  const stages = ["GROUP", "LAST_16", "QUARTER_FINAL", "SEMI_FINAL", "FINAL"];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">{t.groups.compare}</h1>

      <div className="grid grid-cols-3 items-center gap-2 rounded-2xl bg-pitch-500 p-4 text-white">
        <span className="truncate text-center font-bold">{a.displayName}</span>
        <span className="text-center text-xs opacity-80">{t.match.vs}</span>
        <span className="truncate text-center font-bold">{b.displayName}</span>
      </div>

      <div className="rounded-2xl bg-white px-4 ring-1 ring-black/5">
        <Row label={t.profile.totalPoints} a={a.total} b={b.total} />
        <Row label="پیش‌بینی‌ها" a={a.predicted} b={b.predicted} />
        <Row label="نتایج دقیق" a={a.exactCount} b={b.exactCount} />
        <Row
          label="دقت"
          a={a.accuracy}
          b={b.accuracy}
          fmt={(n) => `${toPersianDigits(n)}٪`}
        />
        <Row label={t.profile.bestStreak} a={a.bestStreak} b={b.bestStreak} />
      </div>

      <h2 className="text-sm font-bold text-pitch-600">{t.leaderboard.stage}</h2>
      <div className="rounded-2xl bg-white px-4 ring-1 ring-black/5">
        {stages.map((s) => (
          <Row
            key={s}
            label={t.stage[s]}
            a={a.perStage[s] ?? 0}
            b={b.perStage[s] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}
