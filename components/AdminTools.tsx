"use client";

import { useState, useTransition } from "react";
import { triggerSync, triggerReminders, broadcast } from "@/app/actions/admin";

export default function AdminTools() {
  const [msg, setMsg] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string; info?: string }>) {
    setMsg("");
    startTransition(async () => {
      const res = await fn();
      setMsg(res.ok ? (res.info ?? "انجام شد") : (res.error ?? "خطا"));
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => run(triggerSync)}
          disabled={pending}
          className="flex-1 rounded-xl bg-pitch-500 py-2.5 text-sm font-semibold text-[#08140e] disabled:opacity-50"
        >
          همگام‌سازی نتایج
        </button>
        <button
          onClick={() => run(triggerReminders)}
          disabled={pending}
          className="flex-1 rounded-xl bg-pitch-600 py-2.5 text-sm font-semibold text-[#08140e] disabled:opacity-50"
        >
          ارسال یادآوری‌ها
        </button>
      </div>

      <div className="space-y-2 rounded-2xl bg-surface p-4 ring-1 ring-white/10">
        <p className="text-sm font-semibold">اطلاعیه همگانی</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان"
          className="w-full rounded-xl border border-pitch-200 bg-pitch-50 px-3 py-2 text-sm outline-none focus:border-pitch-500"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="متن"
          rows={2}
          className="w-full rounded-xl border border-pitch-200 bg-pitch-50 px-3 py-2 text-sm outline-none focus:border-pitch-500"
        />
        <button
          onClick={() => run(() => broadcast(title, body))}
          disabled={pending}
          className="w-full rounded-xl bg-gold py-2 text-sm font-semibold text-[#1a1400] disabled:opacity-50"
        >
          ارسال اطلاعیه
        </button>
      </div>

      {msg && <p className="text-center text-sm text-pitch-700">{msg}</p>}
    </div>
  );
}
