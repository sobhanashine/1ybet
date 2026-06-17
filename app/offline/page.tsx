import { t } from "@/lib/i18n";

export const metadata = { title: t.common.offline };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="text-5xl">📡</div>
      <h1 className="text-lg font-bold text-pitch-700">{t.common.offline}</h1>
      <p className="text-sm text-muted">
        لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.
      </p>
    </main>
  );
}
