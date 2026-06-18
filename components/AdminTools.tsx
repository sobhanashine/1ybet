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
          className="btn btn-primary flex-1 py-2.5"
        >
          همگام‌سازی نتایج
        </button>
        <button
          onClick={() => run(triggerReminders)}
          disabled={pending}
          className="btn btn-secondary flex-1 py-2.5"
        >
          ارسال یادآوری‌ها
        </button>
      </div>

      <div className="card space-y-2 p-4">
        <p className="text-sm font-bold text-ink">اطلاعیه همگانی</p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان"
          className="field py-2 text-sm"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="متن"
          rows={2}
          className="field py-2 text-sm"
        />
        <button
          onClick={() => run(() => broadcast(title, body))}
          disabled={pending}
          className="btn w-full bg-gold py-2 text-[#1a1400] hover:bg-gold-dim"
        >
          ارسال اطلاعیه
        </button>
      </div>

      {msg && <p className="text-center text-sm font-semibold text-pitch-700">{msg}</p>}
    </div>
  );
}
