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
        className="field py-2.5 text-sm"
      />

      {filtered.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">{t.compare.noPlayers}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((p) => (
            <li key={p.id}>
              <Link
                href={`/h2h?b=${p.id}`}
                className="card flex items-center justify-between px-4 py-3 transition-colors duration-[var(--dur)] hover:border-pitch-200"
              >
                <span className="truncate text-sm font-bold text-ink">{p.displayName}</span>
                <span className="flex items-center gap-2.5">
                  <span className="text-sm font-extrabold text-pitch-700 tnum">
                    {toPersianDigits(p.points)}
                  </span>
                  <span className="chip border-pitch-200 bg-pitch-50 text-pitch-700">
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
