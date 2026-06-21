import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { maybeAutoSync } from "@/lib/auto-sync";
import { getGamesAnalysis, type GameAnalysis, type FormResult } from "@/lib/analyze";
import { teamFa } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import TeamFlag from "@/components/TeamFlag";
import { ArrowLeft, BarChart3 } from "lucide-react";
import {
  toPersianDigits,
  formatJalaliDate,
  formatTime,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/** Recent form as coloured W/D/L pills (oldest → newest). */
function FormDots({ form }: { form: FormResult[] }) {
  if (form.length === 0) {
    return <span className="text-[11px] text-muted">—</span>;
  }
  const tone: Record<FormResult, string> = {
    W: "bg-pitch-500 text-pitch-ink",
    D: "bg-muted/30 text-ink-dim",
    L: "bg-danger/80 text-white",
  };
  const label: Record<FormResult, string> = { W: "ب", D: "م", L: "خ" };
  return (
    <div className="flex gap-1" dir="ltr">
      {form.map((r, i) => (
        <span
          key={i}
          className={`flex h-5 w-5 items-center justify-center rounded-[5px] text-[10px] font-extrabold ${tone[r]}`}
          aria-label={r}
        >
          {label[r]}
        </span>
      ))}
    </div>
  );
}

/** One team's column: flag, name, group standing summary, recent form. */
function TeamColumn({
  team,
  flag,
  analysis,
  align,
}: {
  team: string;
  flag: string | null;
  analysis: GameAnalysis["home"];
  align: "start" | "end";
}) {
  const s = analysis.standing;
  return (
    <div className={`flex flex-1 flex-col gap-2 ${align === "end" ? "items-end text-right" : "items-start text-left"}`}>
      <div className="flex items-center gap-2">
        <TeamFlag teamName={team} flagUrl={flag} className="h-5 w-auto max-w-[28px] rounded-sm object-contain" />
        <span className="text-sm font-extrabold text-ink">{teamFa(team)}</span>
      </div>
      {s ? (
        <div className="text-[11px] font-semibold text-muted">
          {s.group && (
            <span className="text-pitch-700">
              {t.analyze.groupPos} {toPersianDigits(s.position)}
            </span>
          )}
          <span className="mx-1 text-line-strong">·</span>
          {toPersianDigits(s.points)} {t.analyze.points}
        </div>
      ) : (
        <span className="text-[11px] text-muted">{t.analyze.noStanding}</span>
      )}
      <FormDots form={analysis.form} />
    </div>
  );
}

/** Slim home/draw/away crowd split bar. */
function CrowdBar({ crowd }: { crowd: GameAnalysis["crowd"] }) {
  if (crowd.total === 0) return null;
  return (
    <div className="space-y-1">
      <div className="flex h-2 w-full overflow-hidden rounded-full border border-line bg-surface-2" dir="ltr">
        <span className="h-full bg-pitch-500" style={{ width: `${crowd.home.pct}%` }} />
        <span className="h-full bg-muted/50" style={{ width: `${crowd.draw.pct}%` }} />
        <span className="h-full bg-info" style={{ width: `${crowd.away.pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-bold text-muted tnum">
        <span className="text-pitch-700">{toPersianDigits(crowd.home.pct)}٪</span>
        <span>{toPersianDigits(crowd.draw.pct)}٪</span>
        <span className="text-info">{toPersianDigits(crowd.away.pct)}٪</span>
      </div>
    </div>
  );
}

/** The computed lean, phrased as a short Persian verdict. */
function verdictText(g: GameAnalysis): string {
  if (g.lean.side === "even") return t.analyze.even;
  const team = g.lean.side === "home" ? g.match.homeTeam : g.match.awayTeam;
  const edge = g.lean.strength === "clear" ? t.analyze.edgeClear : t.analyze.edgeSlight;
  return `${edge} ${teamFa(team)}`;
}

export default async function AnalyzePage() {
  await maybeAutoSync();
  const user = await getCurrentUser();
  if (!user) return null;

  const games = await getGamesAnalysis(user.id);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-pitch-700" aria-hidden />
        <div>
          <h1 className="text-xl font-extrabold text-ink">{t.analyze.title}</h1>
          <p className="text-[11px] text-muted">{t.analyze.subtitle}</p>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">{t.analyze.empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {games.map((g) => (
            <article key={g.match.id} className="card space-y-3 p-4">
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span className="font-bold text-pitch-700">
                  {g.match.groupName ? `گروه ${g.match.groupName}` : t.stage[g.match.stage]}
                </span>
                <span suppressHydrationWarning>
                  {formatJalaliDate(g.match.kickoffAt)} · {toPersianDigits(formatTime(g.match.kickoffAt))}
                </span>
              </div>

              <div className="flex items-start gap-3">
                <TeamColumn team={g.match.homeTeam} flag={g.match.homeFlag} analysis={g.home} align="start" />
                <span className="mt-1 text-xs font-bold text-muted">{t.match.vs}</span>
                <TeamColumn team={g.match.awayTeam} flag={g.match.awayFlag} analysis={g.away} align="end" />
              </div>

              <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2">
                <p className="text-[11px] font-bold text-muted">
                  {t.analyze.verdict}:{" "}
                  <span className="text-ink">{verdictText(g)}</span>
                </p>
              </div>

              {g.crowd.total > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted">{t.analyze.crowdLean}</p>
                  <CrowdBar crowd={g.crowd} />
                </div>
              )}

              <Link
                href={`/match/${g.match.id}`}
                className="flex items-center justify-center gap-1 border-t border-line pt-3 text-xs font-bold text-pitch-700 transition-colors hover:text-pitch-500"
              >
                {t.analyze.details}
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </article>
          ))}

          <p className="px-1 text-center text-[10px] text-muted">{t.analyze.source}</p>
        </div>
      )}
    </div>
  );
}
