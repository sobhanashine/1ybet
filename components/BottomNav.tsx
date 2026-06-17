"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Trophy, Users, User } from "lucide-react";
import { t } from "@/lib/i18n";

const ITEMS = [
  { href: "/", label: t.nav.home, Icon: Home },
  { href: "/bracket", label: t.nav.bracket, Icon: Swords },
  { href: "/leaderboard", label: t.nav.leaderboard, Icon: Trophy },
  { href: "/groups", label: t.nav.groups, Icon: Users },
  { href: "/profile", label: t.nav.profile, Icon: User },
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
          const { Icon } = item;
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
                <Icon
                  className={`h-5 w-5 transition ${active ? "drop-shadow-[0_0_8px_var(--color-pitch-500)]" : ""}`}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
