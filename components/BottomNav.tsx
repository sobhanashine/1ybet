"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GitBranch, Home, Medal, Trophy, User } from "lucide-react";
import { t } from "@/lib/i18n";

// Two tabs on each side of the raised center Home button.
const LEFT = [
  { href: "/tournament", label: t.nav.tournament, Icon: Trophy },
  { href: "/knockout", label: t.nav.knockout, Icon: GitBranch },
];
const RIGHT = [
  { href: "/leaderboard", label: t.nav.leaderboard, Icon: Medal },
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
        className={`relative flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10.5px] font-semibold transition-colors duration-[var(--dur)] ${
          active ? "text-pitch-700" : "text-muted hover:text-ink"
        }`}
      >
        {/* Soft glass highlight behind the active tab (iOS-style selection). */}
        {active && (
          <span
            className="absolute inset-1 rounded-2xl bg-white/[0.06] ring-1 ring-inset ring-white/10"
            aria-hidden
          />
        )}
        <Icon
          className="relative h-[21px] w-[21px]"
          strokeWidth={active ? 2.4 : 2}
          aria-hidden
        />
        <span className="relative">{label}</span>
      </Link>
    </li>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const homeActive = pathname === "/";

  return (
    <nav className="sticky bottom-0 z-[var(--z-nav)] px-3 pt-2 pb-[max(0.7rem,env(safe-area-inset-bottom))]">
      {/* Liquid-glass pill: translucent surface + heavy backdrop blur, a bright
          top rim and a soft drop shadow so it floats above the content. */}
      <div className="relative mx-auto max-w-md rounded-[28px] border border-white/10 bg-surface/55 shadow-[0_12px_40px_-8px_rgba(0,0,0,0.7)] backdrop-blur-2xl backdrop-saturate-150">
        {/* top edge highlight */}
        <span
          className="pointer-events-none absolute inset-x-6 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-white/25 to-transparent"
          aria-hidden
        />
        <ul className="flex items-stretch justify-between px-1.5">
          {LEFT.map((item) => (
            <Tab
              key={item.href}
              {...item}
              active={isActive(pathname, item.href)}
            />
          ))}

          {/* Raised center Home button. */}
          <li className="flex-1">
            <Link
              href="/"
              aria-current={homeActive ? "page" : undefined}
              className="flex min-h-[54px] flex-col items-center justify-center gap-1"
            >
              <span className="relative -mt-9">
                <span
                  className={`relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-pitch-500 text-pitch-ink shadow-[0_8px_26px_rgba(25,224,131,0.45)] ring-1 ring-white/20 transition-transform duration-[var(--dur)] ${
                    homeActive ? "scale-105" : "hover:scale-105"
                  }`}
                >
                  <Home
                    className="h-7 w-7"
                    strokeWidth={homeActive ? 2.6 : 2.3}
                    aria-hidden
                  />
                </span>
              </span>
              <span
                className={`-mt-0.5 text-[10.5px] font-bold ${
                  homeActive ? "text-pitch-700" : "text-pitch-600/90"
                }`}
              >
                {t.nav.home}
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
      </div>
    </nav>
  );
}
