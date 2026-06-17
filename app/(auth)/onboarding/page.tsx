"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/auth";
import { t } from "@/lib/i18n";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    setError("");
    startTransition(async () => {
      const res = await completeOnboarding(name, country);
      if (!res.ok) return setError(res.error ?? t.common.error);
      router.replace("/");
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-7 shadow-2xl ring-1 ring-white/10">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-pitch-500/20 blur-3xl" />
        <h1 className="relative mb-1 text-center text-xl font-extrabold text-ink">
          {t.auth.welcome} 👋
        </h1>
        <p className="relative mb-6 text-center text-sm text-muted">
          {t.auth.nameLabel}
        </p>
        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.auth.namePlaceholder}
            className="w-full rounded-xl border border-pitch-200 bg-pitch-50 px-4 py-3 text-center text-lg outline-none focus:border-pitch-500"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="🇮🇷 کشور (اختیاری)"
            className="w-full rounded-xl border border-pitch-200 bg-pitch-50 px-4 py-3 text-center outline-none focus:border-pitch-500"
          />
          <button
            onClick={submit}
            disabled={pending}
            className="w-full rounded-xl bg-pitch-500 py-3 font-semibold text-[#08140e] transition hover:bg-pitch-600 disabled:opacity-60"
          >
            {pending ? t.common.loading : t.auth.finish}
          </button>
        </div>
        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </main>
  );
}
