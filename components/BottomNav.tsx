"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Trophy, Users, User } from "lucide-react";
import { t } from "@/lib/i18n";

const ITEMS = [
  { href: "/", label: t.nav.home, Icon: Home },
  { href: "/bracket", label: t.nav.bracket, Icon: Swords },
  { href: "/leaderboard", label: t.nav.leaderboard, Icon: Trophy },
  { href: "/h2h", label: t.nav.compare, Icon: Users },
  { href: "/profile", label: t.nav.profile, Icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="sticky bottom-0 z-[var(--z-nav)] border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
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
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[52px] flex-col items-center justify-center gap-1 py-2 text-[11px] font-semibold transition-colors duration-[var(--dur)] ${
                  active ? "text-pitch-700" : "text-muted hover:text-ink"
                }`}
              >
                {active && (
                  <span className="absolute inset-x-5 top-0 h-[2px] rounded-full bg-pitch-500" />
                )}
                <Icon
                  className="h-[22px] w-[22px]"
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
