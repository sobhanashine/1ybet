import { toPersianDigits } from "@/lib/format";

/**
 * Custom badge artwork — pure SVG, no client hooks, safe to render from server
 * components. Two families:
 *   - <TournamentCrest>: the named podium crests (الماسخاله / آرسنال / مشکات),
 *     a gold/silver/bronze shield with a motif tied to each name.
 *   - <RankMedal>: a generic numbered medal that replaces the 🥇🥈🥉 emojis in
 *     the leaderboards.
 * <BadgeArt> renders a tournament crest by badge code, falling back to an emoji
 * for the older catalog badges.
 */

type Tier = "gold" | "silver" | "bronze";

// Shield fill / rim per podium tier.
const TIER: Record<Tier, { from: string; to: string; rim: string; ink: string }> = {
  gold: { from: "#FFE07A", to: "#C8901F", rim: "#FFF0B4", ink: "#5A3A02" },
  silver: { from: "#EEF2F7", to: "#97A2B1", rim: "#FCFDFF", ink: "#374151" },
  bronze: { from: "#F1B677", to: "#9E5E26", rim: "#F8D5AC", ink: "#4A2A0C" },
};

const TIER_BY_CODE: Record<string, Tier> = {
  tournament_1st: "gold",
  tournament_2nd: "silver",
  tournament_3rd: "bronze",
};

const SHIELD = "M20 3 L36 8 V21 C36 31 29 38 20 41 C11 38 4 31 4 21 V8 Z";

function Motif({ code }: { code: string }) {
  // Light, semi-transparent motifs sit on the colored shield.
  const stroke = "rgba(255,255,255,0.95)";
  const fill = "rgba(255,255,255,0.92)";
  if (code === "tournament_1st") {
    // Diamond gem (الماس).
    return (
      <g
        fill={fill}
        stroke="rgba(0,0,0,0.18)"
        strokeWidth={0.8}
        strokeLinejoin="round"
      >
        <path d="M13 16 H27 L20 28 Z" />
        <path d="M13 16 L16 12 H24 L27 16 Z" />
        <path
          d="M16 12 L18 16 L20 28 L22 16 L24 12 M13 16 H27"
          fill="none"
          stroke="rgba(0,0,0,0.15)"
          strokeWidth={0.7}
        />
      </g>
    );
  }
  if (code === "tournament_2nd") {
    // Cannon (آرسنال).
    return (
      <g fill={fill}>
        <circle cx={15} cy={26} r={4.2} />
        <circle cx={15} cy={26} r={1.6} fill="rgba(0,0,0,0.25)" />
        <rect
          x={14}
          y={11}
          width={5}
          height={15}
          rx={1.6}
          transform="rotate(-38 16 18)"
        />
        <circle cx={26} cy={14} r={1.7} />
      </g>
    );
  }
  // Lantern of light (مشکات).
  return (
    <g fill={fill} stroke={stroke} strokeWidth={0.6}>
      <path d="M17 11 H23 V13 H17 Z" />
      <path
        d="M16 13 H24 L22.5 27 H17.5 Z"
        fill="rgba(255,255,255,0.9)"
      />
      <path
        d="M20 16 C18.4 18 18.4 20.4 20 22 C21.6 20.4 21.6 18 20 16 Z"
        fill="#FFD66B"
        stroke="none"
      />
      <path d="M16 27 H24" strokeWidth={1.4} />
    </g>
  );
}

export function TournamentCrest({
  code,
  size = 28,
}: {
  code: string;
  size?: number;
}) {
  const tier = TIER_BY_CODE[code] ?? "gold";
  const c = TIER[tier];
  const gid = `crest-${tier}`;
  return (
    <svg
      width={size}
      height={(size * 44) / 40}
      viewBox="0 0 40 44"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="20" y1="3" x2="20" y2="41" gradientUnits="userSpaceOnUse">
          <stop stopColor={c.from} />
          <stop offset="1" stopColor={c.to} />
        </linearGradient>
      </defs>
      <path
        d={SHIELD}
        fill={`url(#${gid})`}
        stroke={c.rim}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <Motif code={code} />
    </svg>
  );
}

export function RankMedal({ rank, size = 26 }: { rank: number; size?: number }) {
  const tier: Tier = rank === 1 ? "gold" : rank === 2 ? "silver" : "bronze";
  const c = TIER[tier];
  const gid = `medal-${tier}`;
  return (
    <svg
      width={size}
      height={(size * 44) / 40}
      viewBox="0 0 40 44"
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="20" y1="8" x2="20" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor={c.from} />
          <stop offset="1" stopColor={c.to} />
        </linearGradient>
      </defs>
      {/* ribbon tails */}
      <path d="M14 6 L11 22 L16 19 L20 24 Z" fill={c.to} opacity={0.85} />
      <path d="M26 6 L29 22 L24 19 L20 24 Z" fill={c.from} opacity={0.85} />
      {/* medal disc */}
      <circle cx={20} cy={28} r={12} fill={`url(#${gid})`} stroke={c.rim} strokeWidth={2} />
      <circle cx={20} cy={28} r={8.5} fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth={1} />
      <text
        x={20}
        y={28}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={900}
        fill={c.ink}
      >
        {toPersianDigits(rank)}
      </text>
    </svg>
  );
}

/** Profile/anywhere: a tournament crest by code, else the emoji fallback. */
export function BadgeArt({
  code,
  fallback,
  size = 40,
}: {
  code: string;
  fallback?: string | null;
  size?: number;
}) {
  if (code in TIER_BY_CODE) return <TournamentCrest code={code} size={size} />;
  return <span style={{ fontSize: size * 0.62 }}>{fallback}</span>;
}
