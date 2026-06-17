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
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/5 bg-surface/75 px-4 py-3.5 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <Link href="/" className="flex items-center gap-2 font-bold text-ink transition-opacity hover:opacity-90">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-pitch-500/10 to-pitch-600/20 border border-pitch-500/30 text-lg shadow-[0_0_12px_rgba(22,224,127,0.2)]">
            ⚽
          </div>
          <div className="flex flex-col text-start">
            <span className="bg-gradient-to-r from-pitch-500 to-pitch-700 bg-clip-text text-base font-black text-transparent select-none leading-none tracking-tight">
              1ybet
            </span>
            <span className="text-[9px] text-muted font-bold mt-0.5 tracking-tight">
              {t.appName}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {user.isAdmin && (
            <Link
              href="/admin"
              className="flex items-center justify-center h-7 w-7 rounded-full border border-pitch-500/30 bg-pitch-500/10 text-xs font-bold text-pitch-700 shadow-[0_0_12px_rgba(22,224,127,0.15)] transition hover:bg-pitch-500/20"
              title={t.nav.admin}
            >
              🛠️
            </Link>
          )}


          <form action={logout}>
            <button className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-bold text-red-400 transition hover:bg-red-500/20 cursor-pointer">
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
