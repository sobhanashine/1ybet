"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp } from "@/app/actions/auth";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpHint, setOtpHint] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submitPhone() {
    setError("");
    startTransition(async () => {
      const res = await requestOtp(phone);
      if (!res.ok) return setError(res.error ?? t.common.error);
      setOtpHint(res.otp ?? "");
      setStep("otp");
    });
  }

  function submitOtp() {
    setError("");
    startTransition(async () => {
      const res = await verifyOtp(phone, code);
      if (!res.ok) return setError(res.error ?? t.common.error);
      router.replace(res.needsOnboarding ? "/onboarding" : "/");
    });
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-gradient-to-br from-surface to-surface-2 p-7 shadow-2xl ring-1 ring-white/10">
        <div className="pointer-events-none absolute -top-20 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-pitch-500/20 blur-3xl" />
        <div className="relative mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-pitch-500/15 text-3xl shadow-[0_0_30px_-6px_var(--color-pitch-500)] ring-1 ring-pitch-500/30">
            ⚽️
          </div>
          <h1 className="text-xl font-extrabold text-ink">{t.appName}</h1>
          <p className="mt-1 text-sm text-muted">{t.tagline}</p>
        </div>

        {step === "phone" ? (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm text-muted">
                {t.auth.phoneLabel}
              </span>
              <input
                dir="ltr"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.auth.phonePlaceholder}
                className="w-full rounded-xl border border-pitch-200 bg-pitch-50 px-4 py-3 text-center text-lg outline-none focus:border-pitch-500"
                onKeyDown={(e) => e.key === "Enter" && submitPhone()}
              />
            </label>
            <button
              onClick={submitPhone}
              disabled={pending}
              className="w-full rounded-xl bg-pitch-500 py-3 font-semibold text-[#08140e] transition hover:bg-pitch-600 disabled:opacity-60"
            >
              {pending ? t.common.loading : t.auth.sendCode}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-gold/10 px-4 py-3 text-center text-sm text-ink">
              {t.auth.otpHint}{" "}
              <span className="font-bold tracking-widest">
                {toPersianDigits(otpHint)}
              </span>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-muted">
                {t.auth.otpLabel}
              </span>
              <input
                dir="ltr"
                inputMode="numeric"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="● ● ● ●"
                className="w-full rounded-xl border border-pitch-200 bg-pitch-50 px-4 py-3 text-center text-2xl tracking-[0.5em] outline-none focus:border-pitch-500"
                onKeyDown={(e) => e.key === "Enter" && submitOtp()}
                autoFocus
              />
            </label>
            <button
              onClick={submitOtp}
              disabled={pending}
              className="w-full rounded-xl bg-pitch-500 py-3 font-semibold text-[#08140e] transition hover:bg-pitch-600 disabled:opacity-60"
            >
              {pending ? t.common.loading : t.auth.verify}
            </button>
            <button
              onClick={() => {
                setStep("phone");
                setCode("");
                setError("");
              }}
              className="w-full text-sm text-muted hover:text-ink"
            >
              {t.common.back}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-center text-sm text-red-400">{error}</p>
        )}
      </div>
    </main>
  );
}
