import type { PollBreakdown, PollVoter } from "@/lib/polls";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

function VoterList({ voters, accent }: { voters: PollVoter[]; accent: string }) {
  if (voters.length === 0) {
    return <p className="px-1 py-2 text-xs text-muted">{t.poll.adminEmpty}</p>;
  }
  return (
    <ul className="divide-y divide-white/5">
      {voters.map((v) => (
        <li key={v.userId} className="flex items-center justify-between gap-2 py-2">
          <span className="truncate text-sm font-semibold text-ink">{v.name}</span>
          <span dir="ltr" className={`shrink-0 text-xs font-bold ${accent}`}>
            {v.phone}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function AdminPollResults({ data }: { data: PollBreakdown }) {
  const { yes, no, total } = data;
  const yesPct = total ? Math.round((yes.length / total) * 100) : 0;
  const noPct = total ? Math.round((no.length / total) * 100) : 0;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-pitch-600">{t.poll.adminTitle}</h2>

      {/* Tally bar */}
      <div className="overflow-hidden rounded-2xl bg-surface p-4 ring-1 ring-white/10">
        <div className="mb-2 flex items-center justify-between text-xs font-bold">
          <span className="text-pitch-700">
            {t.poll.yesShare} · {toPersianDigits(yes.length)} ({toPersianDigits(yesPct)}٪)
          </span>
          <span className="text-red-400">
            {t.poll.noShare} · {toPersianDigits(no.length)} ({toPersianDigits(noPct)}٪)
          </span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
          <div className="bg-pitch-500" style={{ width: `${yesPct}%` }} />
          <div className="bg-red-500" style={{ width: `${noPct}%` }} />
        </div>
        <p className="mt-2 text-center text-[10px] font-semibold text-muted">
          {toPersianDigits(total)} {t.poll.voters}
        </p>
      </div>

      {/* Who voted what */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-pitch-500/20">
          <h3 className="mb-1 text-xs font-bold text-pitch-700">
            {t.poll.yesShare} ({toPersianDigits(yes.length)})
          </h3>
          <VoterList voters={yes} accent="text-pitch-700" />
        </div>
        <div className="rounded-2xl bg-surface p-4 ring-1 ring-red-500/20">
          <h3 className="mb-1 text-xs font-bold text-red-400">
            {t.poll.noShare} ({toPersianDigits(no.length)})
          </h3>
          <VoterList voters={no} accent="text-red-400" />
        </div>
      </div>
    </section>
  );
}
