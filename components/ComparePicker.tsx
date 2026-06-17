"use client";

import { useState } from "react";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export type PickablePlayer = {
  id: number;
  displayName: string;
  points: number;
};

export default function ComparePicker({
  players,
}: {
  players: PickablePlayer[];
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const filtered = query
    ? players.filter((p) => p.displayName.toLowerCase().includes(query))
    : players;

  return (
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.compare.search}
        className="w-full rounded-xl border border-white/10 bg-surface px-4 py-2.5 text-sm text-ink outline-none transition focus:border-pitch-500 focus:ring-2 focus:ring-pitch-500/20"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-muted">{t.compare.noPlayers}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/h2h?b=${p.id}`}
                className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 ring-1 ring-white/10 transition hover:ring-pitch-500/40"
              >
                <span className="truncate text-sm font-medium">{p.displayName}</span>
                <span className="flex items-center gap-2">
                  <span className="text-sm font-bold text-pitch-700">
                    {toPersianDigits(p.points)}
                  </span>
                  <span className="rounded-lg bg-pitch-50/5 px-2 py-1 text-xs text-pitch-600 ring-1 ring-pitch-500/20">
                    {t.compare.compare}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
