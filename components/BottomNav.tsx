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
    <nav className="sticky bottom-0 z-20 border-t border-black/5 bg-white/95 backdrop-blur">
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
                className={`flex flex-col items-center gap-0.5 py-2 text-xs transition ${
                  active ? "text-pitch-600" : "text-muted hover:text-ink"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
