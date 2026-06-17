"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroup } from "@/app/actions/groups";
import { t } from "@/lib/i18n";

export default function GroupForms() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function doCreate() {
    setError("");
    startTransition(async () => {
      const res = await createGroup(name);
      if (!res.ok) return setError(res.error ?? t.common.error);
      setName("");
      if (res.groupId) router.push(`/groups/${res.groupId}`);
    });
  }

  function doJoin() {
    setError("");
    startTransition(async () => {
      const res = await joinGroup(code);
      if (!res.ok) return setError(res.error ?? t.common.error);
      setCode("");
      if (res.groupId) router.push(`/groups/${res.groupId}`);
    });
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <p className="mb-2 text-sm font-semibold">{t.groups.create}</p>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.groups.nameLabel}
            className="flex-1 rounded-xl border border-pitch-200 bg-pitch-50 px-3 py-2 text-sm outline-none focus:border-pitch-500"
          />
          <button
            onClick={doCreate}
            disabled={pending}
            className="rounded-xl bg-pitch-500 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t.groups.create}
          </button>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <p className="mb-2 text-sm font-semibold">{t.groups.join}</p>
        <div className="flex gap-2">
          <input
            dir="ltr"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t.groups.codeLabel}
            maxLength={6}
            className="flex-1 rounded-xl border border-pitch-200 bg-pitch-50 px-3 py-2 text-center text-sm tracking-widest outline-none focus:border-pitch-500"
          />
          <button
            onClick={doJoin}
            disabled={pending}
            className="rounded-xl bg-pitch-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t.groups.join}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
