import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import BottomNav from "@/components/BottomNav";
import { t } from "@/lib/i18n";
import StickyWidget from "@/components/StickyWidget";
import GuideVideoPopup from "@/components/GuideVideoPopup";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.displayName) redirect("/onboarding");

  const initialHasEmail = !!user.email;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="sticky top-0 z-[var(--z-nav)] flex items-center justify-between border-b border-line bg-surface/80 px-4 py-3 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5 text-ink transition-opacity hover:opacity-90">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[var(--radius-md)] border border-line-strong bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" aria-hidden className="h-full w-full object-cover" />
          </span>
          <span className="flex flex-col text-start leading-none">
            <span className="text-base font-black tracking-tight text-ink">1ybet</span>
            <span className="mt-1 text-[10px] font-semibold tracking-tight text-muted">
              {t.appName}
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user.isAdmin && (
            <Link
              href="/admin"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-sm transition hover:bg-elevated"
              title={t.nav.admin}
              aria-label={t.nav.admin}
            >
              🛠️
            </Link>
          )}

          <form action={logout}>
            <button className="btn btn-ghost px-3 py-1.5 text-xs">
              {t.nav.logout}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">{children}</main>

      <StickyWidget initialHasEmail={initialHasEmail} />

      <GuideVideoPopup />

      <BottomNav />
    </div>
  );
}
