"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t } from "@/lib/i18n";

const ITEMS = [
  { href: "/", label: t.nav.home, icon: "🏠" },
  { href: "/fixtures", label: t.nav.fixtures, icon: "📅" },
  { href: "/bracket", label: t.nav.bracket, icon: "🏟️" },
  { href: "/leaderboard", label: t.nav.leaderboard, icon: "🏆" },
  { href: "/groups", label: t.nav.groups, icon: "👥" },
  { href: "/profile", label: t.nav.profile, icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-20 border-t border-white/10 bg-surface/85 backdrop-blur">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-2">
        {ITEMS.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition ${
                  active ? "text-pitch-700" : "text-muted hover:text-ink"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-pitch-500 shadow-[0_0_10px_0_var(--color-pitch-500)]" />
                )}
                <span className={`text-lg transition ${active ? "drop-shadow-[0_0_8px_var(--color-pitch-500)]" : ""}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
