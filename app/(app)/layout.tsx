import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import BottomNav from "@/components/BottomNav";
import { t } from "@/lib/i18n";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.displayName) redirect("/onboarding");

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-black/5 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/" className="flex items-center gap-2 font-bold text-pitch-700">
          <span>⚽️</span>
          <span className="text-sm">{t.appName}</span>
        </Link>
        <div className="flex items-center gap-3">
          {user.isAdmin && (
            <Link href="/admin" className="text-xs text-muted hover:text-ink">
              {t.nav.admin}
            </Link>
          )}
          <form action={logout}>
            <button className="text-xs text-muted hover:text-ink">
              {t.nav.logout}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-4">{children}</main>

      <BottomNav />
    </div>
  );
}
