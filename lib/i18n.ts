// Single-language (fa) dictionary. Centralized so copy is consistent and the
// app stays trivially extensible to more locales later.
export const fa = {
  appName: "پیش‌بینی جام جهانی ۲۰۲۶",
  tagline: "پیش‌بینی کن، امتیاز بگیر، بالای جدول برو",

  // nav
  nav: {
    home: "خانه",
    fixtures: "بازی‌ها",
    leaderboard: "جدول امتیازات",
    compare: "مقایسه",
    bracket: "جدول حذفی",
    profile: "پروفایل",
    admin: "مدیریت",
    logout: "خروج",
  },

  // auth
  auth: {
    phoneLabel: "شماره موبایل",
    phonePlaceholder: "۰۹۱۲۳۴۵۶۷۸۹",
    sendCode: "ارسال کد",
    otpLabel: "کد تأیید",
    otpHint: "کد تأیید شما:",
    verify: "تأیید",
    nameLabel: "نام نمایشی",
    namePlaceholder: "نام شما",
    finish: "ورود به برنامه",
    invalidPhone: "شماره موبایل معتبر نیست",
    invalidOtp: "کد تأیید اشتباه است",
    welcome: "خوش آمدید",
  },

  // predictions / matches
  match: {
    predict: "ثبت پیش‌بینی",
    save: "ذخیره",
    locked: "بسته شد",
    yourPrediction: "پیش‌بینی شما",
    result: "نتیجه",
    points: "امتیاز",
    notPredicted: "پیش‌بینی نکرده‌اید",
    vs: "–",
    today: "امروز",
    upcoming: "بازی‌های پیش رو",
    finished: "تمام‌شده",
    live: "در حال انجام",
    awaitingResult: "در انتظار نتیجه",
    predictionSaved: "پیش‌بینی شما ثبت شد",
    predictionMissed: "فرصت پیش‌بینی تمام شد",
    details: "جزئیات و آمار",
  },

  matchStats: {
    title: "آمار بازی",
    crowd: "نظر جمعی هواداران",
    win: "برد",
    draw: "مساوی",
    topScores: "محبوب‌ترین نتایج",
    avgGoals: "میانگین گل پیش‌بینی‌شده",
    predictors: "نفر پیش‌بینی کرده‌اند",
    lockedHint: "برای جلوگیری از تأثیرگذاری، آمار پس از بسته شدن پیش‌بینی‌ها نمایش داده می‌شود",
    noPredictions: "هنوز پیش‌بینی‌ای برای این بازی ثبت نشده است",
  },

  stage: {
    GROUP: "گروهی",
    LAST_32: "یک‌شانزدهم نهایی",
    LAST_16: "یک‌هشتم نهایی",
    QUARTER_FINAL: "یک‌چهارم نهایی",
    SEMI_FINAL: "نیمه‌نهایی",
    THIRD_PLACE: "رده‌بندی",
    FINAL: "فینال",
  } as Record<string, string>,

  // leaderboard
  leaderboard: {
    title: "جدول امتیازات",
    daily: "روزانه",
    weekly: "هفتگی",
    stage: "مرحله",
    total: "کل",
    rank: "رتبه",
    player: "بازیکن",
    points: "امتیاز",
    empty: "هنوز امتیازی ثبت نشده است",
  },

  // compare (head-to-head)
  compare: {
    title: "مقایسه بازیکنان",
    compare: "مقایسه",
    pickOpponent: "یک بازیکن را برای مقایسه با خودتان انتخاب کنید",
    search: "جستجوی بازیکن…",
    noPlayers: "بازیکنی برای مقایسه وجود ندارد",
    you: "شما",
    matchByMatch: "بازی‌به‌بازی",
    noCommonMatches: "هنوز بازی مشترکی برای مقایسه نیست",
    yourPick: "پیش‌بینی شما",
    notPredicted: "—",
    win: "برد",
    draw: "مساوی",
    overall: "کلی",
    predictions: "پیش‌بینی‌ها",
    exact: "نتایج دقیق",
    accuracy: "دقت",
  },

  // prize-pool poll
  poll: {
    prizeTitle: "صندوق جایزه قهرمانی 🏆",
    prizeQuestion:
      "آیا با این که ورودی برای این جام قرار بدیم که مبلغ اون ۱۰۰ هزار تومان باشه و پول در آخر به برنده برسه موافق هستید؟",
    gateSubtitle: "برای ادامه، لطفاً به این سؤال پاسخ دهید 👇",
    yes: "بله، موافقم",
    no: "خیر، مخالفم",
    yesShare: "موافق",
    noShare: "مخالف",
    voters: "نفر رأی داده‌اند",
    thanks: "ممنون! رأی شما ثبت شد ✅",
    changeVote: "تغییر رأی",
  },

  // bracket
  bracket: {
    title: "جدول حذفی",
    fill: "جدول حذفی خود را پر کنید",
    locked: "جدول حذفی بسته شده است",
    save: "ذخیره جدول",
    champion: "قهرمان",
  },

  // profile
  profile: {
    title: "پروفایل",
    totalPoints: "مجموع امتیاز",
    bestStreak: "بهترین استریک",
    badges: "نشان‌ها",
    email: "ایمیل (اختیاری)",
    enableNotifications: "فعال‌سازی اعلان‌ها",
    notificationsOn: "اعلان‌ها فعال است",
    save: "ذخیره",
  },

  common: {
    loading: "در حال بارگذاری…",
    error: "خطایی رخ داد",
    offline: "اتصال اینترنت برقرار نیست",
    back: "بازگشت",
    save: "ذخیره",
    cancel: "انصراف",
  },
} as const;

export type Dict = typeof fa;
export const t = fa;
