"use client";

import { useState, useEffect, useTransition } from "react";
import { saveEmail } from "@/app/actions/profile";
import { t } from "@/lib/i18n";
import { X, Mail, Check } from "lucide-react";

type Props = {
  initialHasEmail: boolean;
};

export default function StickyWidget({ initialHasEmail }: Props) {
  const [dismissed, setDismissed] = useState(true); // Hidden on first hydration to avoid layout shift
  const [step, setStep] = useState<"email" | "none">("none");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    // Check localStorage to see if user has already dismissed this widget
    const isDismissed = localStorage.getItem("sticky_widget_dismissed") === "true";
    if (isDismissed) {
      setStep("none");
      setDismissed(true);
      return;
    }

    if (!initialHasEmail) {
      setStep("email");
      setDismissed(false);
    } else {
      setStep("none");
      setDismissed(true);
    }
  }, [initialHasEmail]);

  if (dismissed || step === "none") return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("sticky_widget_dismissed", "true");
  };

  const handleSaveEmail = () => {
    setError("");
    if (!email || !email.includes("@")) {
      setError("ایمیل معتبر نیست");
      return;
    }
    startTransition(async () => {
      const res = await saveEmail(email);
      if (res.ok) {
        setSuccessMsg("ایمیلت ثبت شد! ✅");
        setTimeout(() => {
          handleDismiss();
        }, 1500);
      } else {
        setError(res.error || t.common.error);
      }
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed bottom-[72px] left-1/2 z-[var(--z-sticky)] w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2 rounded-[var(--radius-xl)] border border-line-strong bg-surface/95 p-4 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md transition-all duration-[var(--dur)] animate-in slide-in-from-bottom-5"
    >
      <div className="absolute end-2.5 top-2.5 z-10">
        <button
          onClick={handleDismiss}
          aria-label="بستن"
          className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-surface-2 text-muted transition-colors hover:bg-elevated hover:text-ink"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {successMsg ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-pitch-200 bg-pitch-50 text-pitch-700">
            <Check className="h-6 w-6" strokeWidth={3} />
          </div>
          <p className="mt-3 text-sm font-bold text-ink">{successMsg}</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 text-pitch-700">
            <Mail className="h-[18px] w-[18px]" aria-hidden />
            <h4 className="text-sm font-extrabold">یادآور ایمیلی بازی‌ها</h4>
          </div>
          <p className="mt-1.5 pe-1 text-[11px] font-medium leading-relaxed text-ink-dim">
            ایمیلت را وارد کن تا قبل از شروع بازی‌هایی که فراموش کرده‌ای پیش‌بینی کنی، برات یادآوری بفرستیم.
          </p>
          <div className="mt-3.5 flex gap-2">
            <input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="field flex-1 py-2 text-xs"
              onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
            />
            <button
              onClick={handleSaveEmail}
              disabled={pending}
              className="btn btn-primary px-4 text-xs"
            >
              ثبت
            </button>
          </div>
          {error && <p className="mt-2 text-[10px] font-semibold text-danger">{error}</p>}
        </div>
      )}
    </div>
  );
}
