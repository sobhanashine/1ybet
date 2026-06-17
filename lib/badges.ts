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
    code: "group_winner",
    titleFa: "قهرمان گروه",
    descFa: "صدرنشین یکی از گروه‌های شما",
    icon: "👑",
  },
  {
    code: "bracket_master",
    titleFa: "استاد جدول",
    descFa: "قهرمان جام را درست پیش‌بینی کرد",
    icon: "🧠",
  },
];
