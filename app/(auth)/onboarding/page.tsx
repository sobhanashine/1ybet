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
      <div className="card w-full max-w-sm p-7">
        <h1 className="mb-1 text-center text-xl font-extrabold text-ink">
          {t.auth.welcome} 👋
        </h1>
        <p className="mb-6 text-center text-sm text-muted">
          {t.auth.nameLabel}
        </p>
        <div className="space-y-4">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.auth.namePlaceholder}
            className="field py-3 text-center text-lg"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          <input
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="🇮🇷 کشور (اختیاری)"
            className="field py-3 text-center"
          />
          <button
            onClick={submit}
            disabled={pending}
            className="btn btn-primary w-full py-3"
          >
            {pending ? t.common.loading : t.auth.finish}
          </button>
        </div>
        {error && (
          <p className="mt-4 text-center text-sm font-semibold text-danger">{error}</p>
        )}
      </div>
    </main>
  );
}
