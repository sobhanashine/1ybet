"use client";

import { useState, useTransition } from "react";
import { saveMatchResult } from "@/app/actions/admin";
import { teamFa } from "@/lib/teams-fa";
import { formatJalaliDate, formatTime, toPersianDigits } from "@/lib/format";

type AdminMatch = {
  id: number;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: Date;
  status: "SCHEDULED" | "LIVE" | "FINISHED";
  homeScore: number | null;
  awayScore: number | null;
};

function Row({ match }: { match: AdminMatch }) {
  const [status, setStatus] = useState(match.status);
  const [home, setHome] = useState(match.homeScore?.toString() ?? "");
  const [away, setAway] = useState(match.awayScore?.toString() ?? "");
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setSaved(false);
    startTransition(async () => {
      const res = await saveMatchResult(
        match.id,
        status,
        status === "FINISHED" && home !== "" ? Number(home) : null,
        status === "FINISHED" && away !== "" ? Number(away) : null,
      );
      if (res.ok) setSaved(true);
    });
  }

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-black/5">
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span>
          {teamFa(match.homeTeam)} - {teamFa(match.awayTeam)}
        </span>
        <span>
          {formatJalaliDate(match.kickoffAt)} {toPersianDigits(formatTime(match.kickoffAt))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as AdminMatch["status"])}
          className="rounded-lg border border-pitch-200 bg-pitch-50 px-2 py-1.5 text-xs"
        >
          <option value="SCHEDULED">برنامه‌ریزی‌شده</option>
          <option value="LIVE">در حال انجام</option>
          <option value="FINISHED">تمام‌شده</option>
        </select>
        <input
          type="number"
          min={0}
          value={home}
          onChange={(e) => setHome(e.target.value)}
          disabled={status !== "FINISHED"}
          className="h-9 w-12 rounded-lg border border-pitch-200 bg-pitch-50 text-center disabled:opacity-50"
        />
        <span className="text-muted">-</span>
        <input
          type="number"
          min={0}
          value={away}
          onChange={(e) => setAway(e.target.value)}
          disabled={status !== "FINISHED"}
          className="h-9 w-12 rounded-lg border border-pitch-200 bg-pitch-50 text-center disabled:opacity-50"
        />
        <button
          onClick={save}
          disabled={pending}
          className="ms-auto rounded-lg bg-pitch-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saved ? "✓" : "ذخیره"}
        </button>
      </div>
    </div>
  );
}

export default function AdminMatchEditor({ matches }: { matches: AdminMatch[] }) {
  return (
    <div className="space-y-2">
      {matches.map((m) => (
        <Row key={m.id} match={m} />
      ))}
    </div>
  );
}
