"use client";

import { useState, useTransition } from "react";
import { saveEmail } from "@/app/actions/profile";

/**
 * Home-screen promo that announces the email-reminder feature and lets users
 * opt in inline. Rendered only for users who haven't added an email yet.
 */
export default function EmailReminderBanner({ hasEmail }: { hasEmail: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [pending, startTransition] = useTransition();

  if (hasEmail || dismissed) return null;

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await saveEmail(email);
      if (!res.ok) return setError(res.error ?? "خطا");
      setDone(true);
    });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-pitch-500/15 to-surface-2 p-5 ring-1 ring-pitch-500/30">
      <div className="pointer-events-none absolute -top-14 -left-8 h-36 w-36 rounded-full bg-pitch-500/20 blur-3xl" />
      <button
        onClick={() => setDismissed(true)}
        aria-label="بستن"
        className="absolute left-3 top-3 text-lg leading-none text-muted transition hover:text-ink"
      >
        ×
      </button>

      {done ? (
        <div className="relative py-2 text-center">
          <div className="mb-1 text-2xl">✅</div>
          <p className="text-sm font-bold text-ink">ایمیلت ثبت شد!</p>
          <p className="mt-1 text-xs leading-6 text-muted">
            از این به بعد قبل از شروع بازی‌هایی که پیش‌بینی نکرده‌ای برات ایمیل یادآوری می‌فرستیم.
          </p>
        </div>
      ) : (
        <div className="relative">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xl">📧</span>
            <h2 className="text-sm font-extrabold text-ink">
              یادآور ایمیلی بازی‌ها فعال شد!
            </h2>
          </div>
          <p className="mb-3 text-xs leading-6 text-muted">
            ایمیلت را وارد کن تا قبل از شروع هر بازی که هنوز پیش‌بینی نکرده‌ای، یک یادآوری برات بفرستیم و امتیازی از دست ندی.
          </p>
          <div className="flex gap-2">
            <input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="name@example.com"
              className="flex-1 rounded-xl border border-pitch-200 bg-pitch-50 px-3 py-2.5 text-sm outline-none focus:border-pitch-500"
            />
            <button
              onClick={submit}
              disabled={pending}
              className="rounded-xl bg-pitch-500 px-5 text-sm font-semibold text-[#08140e] transition hover:bg-pitch-600 disabled:opacity-60"
            >
              {pending ? "..." : "فعال‌سازی"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
