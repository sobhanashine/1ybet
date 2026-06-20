// Static badge catalog (seeded into the `badges` table). Award logic lives in
// the sync job (M8) and references badges by `code`.
export type BadgeDef = {
  code: string;
  titleFa: string;
  descFa: string;
  icon: string;
};

export const BADGE_CATALOG: BadgeDef[] = [
  {
    code: "first_exact",
    titleFa: "اولین نتیجه دقیق",
    descFa: "اولین پیش‌بینی دقیق نتیجه یک بازی",
    icon: "🎯",
  },
  {
    code: "streak_3",
    titleFa: "استریک ۳",
    descFa: "۳ پیش‌بینی موفق پیاپی",
    icon: "🔥",
  },
  {
    code: "streak_5",
    titleFa: "استریک ۵",
    descFa: "۵ پیش‌بینی موفق پیاپی",
    icon: "⚡",
  },
  {
    code: "streak_10",
    titleFa: "استریک ۱۰",
    descFa: "۱۰ پیش‌بینی موفق پیاپی",
    icon: "🌟",
  },
  {
    code: "perfect_day",
    titleFa: "روز بی‌نقص",
    descFa: "تمام پیش‌بینی‌های یک روز موفق بود",
    icon: "🏆",
  },
  {
    code: "bracket_master",
    titleFa: "استاد جدول",
    descFa: "قهرمان جام را درست پیش‌بینی کرد",
    icon: "🧠",
  },
  // Tournament podium badges — awarded to the top 3 of the prize-tournament
  // standings. Rendered as custom crests (see components/BadgeArt.tsx); the
  // emoji here is only a fallback if the SVG art is unavailable.
  {
    code: "tournament_1st",
    titleFa: "الماسخاله",
    descFa: "نفر اول تورنمنت جایزه‌دار 🥇",
    icon: "💎",
  },
  {
    code: "tournament_2nd",
    titleFa: "آرسنال",
    descFa: "نفر دوم تورنمنت جایزه‌دار 🥈",
    icon: "⚙️",
  },
  {
    code: "tournament_3rd",
    titleFa: "مشکات",
    descFa: "نفر سوم تورنمنت جایزه‌دار 🥉",
    icon: "🏮",
  },
];

// Badge code for each tournament podium place (index 0 = 1st).
export const TOURNAMENT_PODIUM_CODES = [
  "tournament_1st",
  "tournament_2nd",
  "tournament_3rd",
] as const;
