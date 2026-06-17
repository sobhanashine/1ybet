"use client";

import { useState, useEffect, useTransition } from "react";
import { votePoll } from "@/app/actions/poll";
import { saveEmail } from "@/app/actions/profile";
import { PRIZE_POOL_POLL } from "@/lib/polls-shared";
import { t } from "@/lib/i18n";
import { X, Mail, Trophy, Check } from "lucide-react";

type Props = {
  initialHasVoted: boolean;
  initialHasEmail: boolean;
};

export default function StickyWidget({ initialHasVoted, initialHasEmail }: Props) {
  const [dismissed, setDismissed] = useState(true); // Hidden on first hydration to avoid layout shift
  const [step, setStep] = useState<"poll" | "email" | "none">("none");
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

    if (!initialHasVoted) {
      setStep("poll");
      setDismissed(false);
    } else if (!initialHasEmail) {
      setStep("email");
      setDismissed(false);
    } else {
      setStep("none");
      setDismissed(true);
    }
  }, [initialHasVoted, initialHasEmail]);

  if (dismissed || step === "none") return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("sticky_widget_dismissed", "true");
  };

  const handleVote = (choice: "yes" | "no") => {
    setError("");
    startTransition(async () => {
      const res = await votePoll(PRIZE_POOL_POLL, choice);
      if (res.ok) {
        setSuccessMsg(t.poll.thanks);
        setTimeout(() => {
          setSuccessMsg("");
          if (!initialHasEmail) {
            setStep("email");
          } else {
            handleDismiss();
          }
        }, 1500);
      } else {
        setError(res.error || t.common.error);
      }
    });
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
      className="fixed bottom-[68px] left-1/2 z-30 w-[calc(100%-2rem)] max-w-[416px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-surface/90 p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5"
    >
      <div className="absolute top-2.5 left-2.5 z-10">
        <button
          onClick={handleDismiss}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5 text-muted transition hover:bg-white/10 hover:text-ink cursor-pointer"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {successMsg ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pitch-500/10 text-pitch-700 shadow-[0_0_15px_rgba(22,224,127,0.2)]">
            <Check className="h-6 w-6" strokeWidth={3} />
          </div>
          <p className="mt-3 text-sm font-bold text-ink">{successMsg}</p>
        </div>
      ) : step === "poll" ? (
        <div className="relative">
          <div className="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-gold/10 blur-2xl" />
          <div className="flex items-center gap-2 text-gold">
            <Trophy className="h-4.5 w-4.5" />
            <h4 className="text-xs font-black tracking-wide uppercase">
              {t.poll.prizeTitle}
            </h4>
          </div>
          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-muted pl-4">
            {t.poll.prizeQuestion}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleVote("yes")}
              disabled={pending}
              className="flex-1 rounded-xl bg-gradient-to-r from-pitch-500 to-pitch-600 py-2 text-xs font-bold text-[#08140e] shadow-[0_2px_10px_rgba(22,224,127,0.2)] transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {t.poll.yes}
            </button>
            <button
              onClick={() => handleVote("no")}
              disabled={pending}
              className="flex-1 rounded-xl bg-white/5 py-2 text-xs font-bold text-muted ring-1 ring-white/10 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {t.poll.no}
            </button>
          </div>
          {error && <p className="mt-2 text-[10px] text-red-400 font-semibold">{error}</p>}
        </div>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute -top-12 -right-12 h-24 w-24 rounded-full bg-pitch-500/10 blur-2xl" />
          <div className="flex items-center gap-2 text-pitch-700">
            <Mail className="h-4.5 w-4.5" />
            <h4 className="text-xs font-black tracking-wide uppercase">
              یادآور ایمیلی بازی‌ها
            </h4>
          </div>
          <p className="mt-1.5 text-[11px] font-semibold leading-relaxed text-muted pl-4">
            ایمیلت را وارد کن تا قبل از شروع بازی‌هایی که فراموش کرده‌ای پیش‌بینی کنی، برات یادآوری بفرستیم.
          </p>
          <div className="mt-3.5 flex gap-2">
            <input
              dir="ltr"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@gmail.com"
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-ink outline-none focus:border-pitch-500 focus:bg-white/10"
              onKeyDown={(e) => e.key === "Enter" && handleSaveEmail()}
            />
            <button
              onClick={handleSaveEmail}
              disabled={pending}
              className="rounded-xl bg-pitch-500 px-4 text-xs font-bold text-[#08140e] transition hover:bg-pitch-600 disabled:opacity-50 cursor-pointer"
            >
              ثبت
            </button>
          </div>
          {error && <p className="mt-2 text-[10px] text-red-400 font-semibold">{error}</p>}
        </div>
      )}
    </div>
  );
}
