"use client";

import { useState, useTransition } from "react";
import { setTournamentPaymentStatus } from "@/app/actions/admin";
import { formatJalaliDateFull, formatTime, toPersianDigits } from "@/lib/format";
import { t } from "@/lib/i18n";

type PaymentStatus = "PENDING" | "PAID" | "UNPAID";

export type TournamentPaymentRow = {
  userId: number;
  name: string;
  phone: string;
  telegramUsername: string | null;
  hasTelegram: boolean;
  status: PaymentStatus;
  respondedAt: Date | null;
};

const statusCopy: Record<PaymentStatus, string> = {
  PENDING: t.tournament.paymentPending,
  PAID: t.tournament.paymentPaid,
  UNPAID: t.tournament.paymentUnpaid,
};

const statusTone: Record<PaymentStatus, string> = {
  PENDING: "border-warn/30 bg-warn/10 text-warn",
  PAID: "border-pitch-200 bg-pitch-50 text-pitch-700",
  UNPAID: "border-danger/25 bg-danger/10 text-danger",
};

function PaymentRow({ member }: { member: TournamentPaymentRow }) {
  const [status, setStatus] = useState<PaymentStatus>(member.status);
  const [savedStatus, setSavedStatus] = useState<PaymentStatus>(member.status);
  const [respondedAt, setRespondedAt] = useState<Date | null>(member.respondedAt);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    setMessage("");
    startTransition(async () => {
      const result = await setTournamentPaymentStatus(member.userId, status);
      if (result.ok) {
        setSavedStatus(status);
        setRespondedAt(status === "PENDING" ? null : new Date());
        setMessage(t.tournament.paymentSaved);
      } else {
        setMessage(result.error ?? t.tournament.paymentSaveError);
      }
    });
  }

  return (
    <li className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-ink">{member.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span dir="ltr">{member.phone}</span>
            {member.telegramUsername ? <span dir="ltr">@{member.telegramUsername}</span> : null}
            {!member.hasTelegram ? (
              <span className="font-bold text-warn">{t.tournament.paymentNoTelegram}</span>
            ) : null}
          </div>
        </div>
        <span className={`chip shrink-0 ${statusTone[savedStatus]}`}>
          <span className="chip-dot" />
          {statusCopy[savedStatus]}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <select
          aria-label={`${t.tournament.paymentStatusFor} ${member.name}`}
          value={status}
          onChange={(event) => setStatus(event.target.value as PaymentStatus)}
          className="field min-w-0 flex-1 py-2 text-xs"
        >
          <option value="PENDING">{statusCopy.PENDING}</option>
          <option value="PAID">{statusCopy.PAID}</option>
          <option value="UNPAID">{statusCopy.UNPAID}</option>
        </select>
        <button
          type="button"
          onClick={save}
          disabled={pending || status === savedStatus}
          className="btn btn-primary shrink-0 px-3 py-2 text-xs"
        >
          {pending ? t.tournament.paymentSaving : t.match.save}
        </button>
      </div>

      <div className="flex min-h-4 items-center justify-between gap-2 text-[10px] text-muted">
        <span>
          {respondedAt && savedStatus !== "PENDING"
            ? `${t.tournament.paymentLastResponse}: ${formatJalaliDateFull(respondedAt)}، ${formatTime(respondedAt)}`
            : t.tournament.paymentAwaitingResponse}
        </span>
        {message ? <span className="shrink-0 font-bold text-pitch-700">{message}</span> : null}
      </div>
    </li>
  );
}

export default function AdminTournamentPayments({ members }: { members: TournamentPaymentRow[] }) {
  const paid = members.filter((member) => member.status === "PAID").length;
  const unpaid = members.filter((member) => member.status === "UNPAID").length;
  const pending = members.length - paid - unpaid;

  return (
    <section className="space-y-3" aria-labelledby="tournament-payment-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="tournament-payment-heading" className="section-label">
            {t.tournament.paymentAdminTitle}
          </h2>
          <p className="mt-1 text-[11px] text-muted">{t.tournament.paymentAdminHint}</p>
        </div>
        <span className="chip">{toPersianDigits(members.length)} {t.tournament.members}</span>
      </div>

      <dl className="grid grid-cols-3 gap-2">
        <div className="card p-3 text-center">
          <dd className="text-xl font-black text-pitch-700">{toPersianDigits(paid)}</dd>
          <dt className="mt-1 text-[10px] font-bold text-muted">{t.tournament.paymentPaid}</dt>
        </div>
        <div className="card p-3 text-center">
          <dd className="text-xl font-black text-danger">{toPersianDigits(unpaid)}</dd>
          <dt className="mt-1 text-[10px] font-bold text-muted">{t.tournament.paymentUnpaid}</dt>
        </div>
        <div className="card p-3 text-center">
          <dd className="text-xl font-black text-warn">{toPersianDigits(pending)}</dd>
          <dt className="mt-1 text-[10px] font-bold text-muted">{t.tournament.paymentPending}</dt>
        </div>
      </dl>

      <ul className="card divide-y divide-line overflow-hidden">
        {members.map((member) => <PaymentRow key={member.userId} member={member} />)}
      </ul>
    </section>
  );
}
