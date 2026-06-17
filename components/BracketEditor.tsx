"use client";

import { useState, useTransition } from "react";
import { saveBracket } from "@/app/actions/bracket";
import {
  BRACKET_ROUNDS,
  ROUND_PICKS,
  ROUND_LABEL_FA,
  ROUND_BONUS,
  type BracketRound,
} from "@/lib/bracket";
import { teamFa, teamFlag } from "@/lib/teams-fa";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

type Props = {
  pool: string[];
  initial: Record<BracketRound, string[]>;
  locked: boolean;
};

export default function BracketEditor({ pool, initial, locked }: Props) {
  const [picks, setPicks] = useState<Record<BracketRound, Set<string>>>(() => {
    const out = {} as Record<BracketRound, Set<string>>;
    for (const r of BRACKET_ROUNDS) out[r] = new Set(initial[r] ?? []);
    return out;
  });
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggle(round: BracketRound, team: string) {
    if (locked) return;
    setSaved(false);
    setPicks((prev) => {
      const next = { ...prev, [round]: new Set(prev[round]) };
      const set = next[round];
      if (set.has(team)) set.delete(team);
      else if (set.size < ROUND_PICKS[round]) set.add(team);
      return next;
    });
  }

  function save() {
    setError("");
    startTransition(async () => {
      const payload = Object.fromEntries(
        BRACKET_ROUNDS.map((r) => [r, [...picks[r]]]),
      ) as Record<BracketRound, string[]>;
      const res = await saveBracket(payload);
      if (!res.ok) return setError(res.error ?? t.common.error);
      setSaved(true);
    });
  }

  return (
    <div className="space-y-5">
      {locked && (
        <div className="rounded-xl bg-gold/10 px-4 py-2 text-center text-sm">
          🔒 {t.bracket.locked}
        </div>
      )}

      {BRACKET_ROUNDS.map((round) => {
        const set = picks[round];
        return (
          <section key={round} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-pitch-600">
                {ROUND_LABEL_FA[round]}
              </h2>
              <span className="text-xs text-muted">
                {toPersianDigits(set.size)}/{toPersianDigits(ROUND_PICKS[round])}{" "}
                · +{toPersianDigits(ROUND_BONUS[round])}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {pool.map((team) => {
                const active = set.has(team);
                return (
                  <button
                    key={team}
                    onClick={() => toggle(round, team)}
                    disabled={locked || (!active && set.size >= ROUND_PICKS[round])}
                    className={`rounded-full px-3 py-1.5 text-xs transition ${
                      active
                        ? "bg-pitch-500 text-white"
                        : "bg-white text-ink ring-1 ring-black/10 disabled:opacity-40"
                    }`}
                  >
                    <span className="flex items-center gap-1 select-none">
                      <span>{teamFlag(team)}</span>
                      <span>{teamFa(team)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {!locked && (
        <div className="sticky bottom-16 z-10">
          <button
            onClick={save}
            disabled={pending}
            className="w-full rounded-xl bg-pitch-500 py-3 font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {pending ? t.common.loading : saved ? "✓ " + t.bracket.save : t.bracket.save}
          </button>
        </div>
      )}
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
    </div>
  );
}
