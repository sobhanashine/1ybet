"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Swords, Trophy, User } from "lucide-react";
import { t } from "@/lib/i18n";

// Two tabs on each side of the raised center Tournament button.
const LEFT = [
  { href: "/", label: t.nav.home, Icon: Home },
  { href: "/bracket", label: t.nav.bracket, Icon: Swords },
];
const RIGHT = [
  { href: "/leaderboard", label: t.nav.leaderboard, Icon: Trophy },
  { href: "/profile", label: t.nav.profile, Icon: User },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Tab({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  active: boolean;
}) {
  return (
    <li className="flex-1">
      <Link
        href={href}
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
        <span>{label}</span>
      </Link>
    </li>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const tournamentActive = pathname.startsWith("/tournament");

  return (
    <nav className="sticky bottom-0 z-[var(--z-nav)] border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className="mx-auto flex max-w-md items-stretch justify-between px-1">
        {LEFT.map((item) => (
          <Tab
            key={item.href}
            {...item}
            active={isActive(pathname, item.href)}
          />
        ))}

        {/* Raised center call-to-action — the tournament prize league. */}
        <li className="flex-1">
          <Link
            href="/tournament"
            aria-current={tournamentActive ? "page" : undefined}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1"
          >
            <span className="relative -mt-9">
              {!tournamentActive && (
                <span
                  className="absolute inset-0 rounded-full bg-gold/40 animate-ping"
                  aria-hidden
                />
              )}
              <span
                className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-gold text-pitch-ink shadow-[0_8px_24px_rgba(246,201,69,0.5)] ring-4 ring-surface transition-transform duration-[var(--dur)] ${
                  tournamentActive ? "scale-105" : "hover:scale-105"
                }`}
              >
                <Trophy
                  className="h-7 w-7"
                  strokeWidth={tournamentActive ? 2.6 : 2.3}
                  aria-hidden
                />
              </span>
            </span>
            <span
              className={`-mt-0.5 text-[11px] font-bold ${
                tournamentActive ? "text-gold" : "text-gold/90"
              }`}
            >
              {t.nav.tournament}
            </span>
          </Link>
        </li>

        {RIGHT.map((item) => (
          <Tab
            key={item.href}
            {...item}
            active={isActive(pathname, item.href)}
          />
        ))}
      </ul>
    </nav>
  );
}
