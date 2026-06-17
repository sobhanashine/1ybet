"use client";

import { useState, useTransition } from "react";
import { saveEmail } from "@/app/actions/profile";
import { subscribeToPush } from "@/app/actions/push";
import { t } from "@/lib/i18n";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const out = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotificationToggle({
  hasEmail,
}: {
  hasEmail: boolean;
}) {
  const [email, setEmail] = useState("");
  const [pushState, setPushState] = useState<"idle" | "on" | "denied" | "error">(
    "idle",
  );
  const [savedEmail, setSavedEmail] = useState(false);
  const [pending, startTransition] = useTransition();

  function submitEmail() {
    startTransition(async () => {
      const res = await saveEmail(email);
      if (res.ok) setSavedEmail(true);
    });
  }

  async function enablePush() {
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        return setPushState("error");
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setPushState("denied");

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });
      const json = sub.toJSON();
      const res = await subscribeToPush({
        endpoint: json.endpoint!,
        p256dh: json.keys!.p256dh,
        auth: json.keys!.auth,
      });
      setPushState(res.ok ? "on" : "error");
    } catch {
      setPushState("error");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl bg-surface p-4 ring-1 ring-white/10">
      <h2 className="text-sm font-bold text-pitch-600">
        {t.profile.enableNotifications}
      </h2>

      <button
        onClick={enablePush}
        disabled={pushState === "on"}
        className="w-full rounded-xl bg-pitch-500 py-2.5 text-sm font-semibold text-[#08140e] transition hover:bg-pitch-600 disabled:opacity-60"
      >
        {pushState === "on"
          ? "✓ " + t.profile.notificationsOn
          : pushState === "denied"
            ? "اجازه اعلان داده نشد"
            : t.profile.enableNotifications}
      </button>

      <div>
        <label className="mb-1 block text-xs text-muted">{t.profile.email}</label>
        <p className="mb-2 text-[11px] leading-5 text-muted">
          قبل از شروع بازی‌هایی که پیش‌بینی نکرده‌ای برات ایمیل یادآوری می‌فرستیم.
        </p>
        <div className="flex gap-2">
          <input
            dir="ltr"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={hasEmail ? "••••••" : "name@example.com"}
            className="flex-1 rounded-xl border border-pitch-200 bg-pitch-50 px-3 py-2 text-sm outline-none focus:border-pitch-500"
          />
          <button
            onClick={submitEmail}
            disabled={pending}
            className="rounded-xl bg-pitch-600 px-4 text-sm font-semibold text-[#08140e] disabled:opacity-50"
          >
            {savedEmail ? "✓" : t.profile.save}
          </button>
        </div>
      </div>
    </section>
  );
}
