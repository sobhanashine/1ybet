import { fetchGroupTables, type GroupTable, type GroupTeamRow } from "@/lib/football-api";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import TeamFlag from "@/components/TeamFlag";
import { Table2 } from "lucide-react";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

function gdLabel(gd: number): string {
  if (gd > 0) return `+${toPersianDigits(gd)}`;
  return toPersianDigits(gd); // keeps the minus for negatives, "۰" for zero
}

/** One team's row in a group table. Top two are flagged as qualifying. */
function Row({ r }: { r: GroupTeamRow }) {
  const qualifies = r.position > 0 && r.position <= 2;
  return (
    <li
      className={`flex items-center gap-2 px-3 py-2.5 ${qualifies ? "bg-pitch-50" : ""}`}
    >
      <span className="relative flex w-5 shrink-0 justify-center text-xs font-extrabold tnum text-muted">
        {qualifies && (
          <span className="absolute -right-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-pitch-500" />
        )}
        {toPersianDigits(r.position)}
      </span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <TeamFlag
          teamName={r.team}
          flagUrl={r.crest}
          className="h-4 w-auto max-w-[24px] rounded-sm object-contain"
        />
        <span className="truncate text-sm font-bold text-ink">{teamFa(r.team)}</span>
      </div>

      <span className="w-7 shrink-0 text-center text-xs tnum text-muted">
        {toPersianDigits(r.played)}
      </span>
      <span className="w-8 shrink-0 text-center text-xs tnum text-ink-dim">
        {gdLabel(r.goalDiff)}
      </span>
      <span className="w-8 shrink-0 text-center text-sm font-extrabold tnum text-pitch-700">
        {toPersianDigits(r.points)}
      </span>
    </li>
  );
}

/** A single group's card with its ordered table. */
function GroupCard({ table }: { table: GroupTable }) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-2">
        <h2 className="text-sm font-extrabold text-ink">
          {t.standings.group} {table.group ?? ""}
        </h2>
        <div className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-muted">
          <span className="w-7 text-center">{t.standings.played}</span>
          <span className="w-8 text-center">{t.standings.goalDiff}</span>
          <span className="w-8 text-center">{t.standings.points}</span>
        </div>
      </div>
      <ol className="divide-y divide-line">
        {table.rows.map((r) => (
          <Row key={`${table.group}-${r.team}-${r.position}`} r={r} />
        ))}
      </ol>
    </section>
  );
}

export default async function StandingsPage() {
  let tables: GroupTable[] | null = null;
  try {
    tables = await fetchGroupTables();
  } catch (e) {
    console.error("group tables fetch failed:", e instanceof Error ? e.message : e);
  }

  const hasData = tables && tables.some((g) => g.rows.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Table2 className="h-5 w-5 text-pitch-700" aria-hidden />
        <div>
          <h1 className="text-xl font-extrabold text-ink">{t.standings.title}</h1>
          <p className="text-[11px] text-muted">{t.standings.subtitle}</p>
        </div>
      </div>

      {!hasData ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">
            {tables ? t.standings.empty : t.standings.unavailable}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {tables!
              .filter((g) => g.rows.length > 0)
              .map((g, i) => (
                <GroupCard key={g.group ?? i} table={g} />
              ))}
          </div>

          <div className="space-y-1 px-1 text-center">
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted">
              <span className="inline-block h-3 w-[3px] rounded-full bg-pitch-500" />
              {t.standings.qualifyHint}
            </p>
            <p className="text-[10px] text-muted">{t.standings.source}</p>
          </div>
        </>
      )}
    </div>
  );
}
