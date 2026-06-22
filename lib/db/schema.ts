import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// --- enums ---
export const matchStage = pgEnum("match_stage", [
  "GROUP",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "THIRD_PLACE",
  "FINAL",
]);

export const matchStatus = pgEnum("match_status", [
  "SCHEDULED",
  "LIVE",
  "FINISHED",
]);

// --- users ---
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  email: text("email"),
  isAdmin: boolean("is_admin").notNull().default(false),
  bestStreak: integer("best_streak").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
});

// --- matches ---
export const matches = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    extId: text("ext_id").unique(),
    stage: matchStage("stage").notNull(),
    groupName: text("group_name"),
    homeTeam: text("home_team").notNull(),
    awayTeam: text("away_team").notNull(),
    homeCode: text("home_code"),
    awayCode: text("away_code"),
    homeFlag: text("home_flag"),
    awayFlag: text("away_flag"),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    status: matchStatus("status").notNull().default("SCHEDULED"),
    // regulation (90-minute) score — used for score predictions
    homeScore: integer("home_score"),
    awayScore: integer("away_score"),
    // actual advancing team (incl. extra time / penalties) — used for the bracket
    winnerTeam: text("winner_team"),
    scoredAt: timestamp("scored_at", { withTimezone: true }),
  },
  (t) => [
    index("matches_kickoff_idx").on(t.kickoffAt),
    index("matches_stage_idx").on(t.stage),
  ],
);

// --- predictions ---
export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    predHome: integer("pred_home").notNull(),
    predAway: integer("pred_away").notNull(),
    points: integer("points").notNull().default(0),
    scored: boolean("scored").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("predictions_user_match_idx").on(t.userId, t.matchId),
    index("predictions_match_idx").on(t.matchId),
    index("predictions_user_idx").on(t.userId),
  ],
);

// --- bracket bonus ---
export const bracketPicks = pgTable(
  "bracket_picks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slot: text("slot").notNull(),
    teamCode: text("team_code").notNull(),
    points: integer("points").notNull().default(0),
    locked: boolean("locked").notNull().default(false),
  },
  (t) => [
    uniqueIndex("bracket_user_slot_idx").on(t.userId, t.slot),
    index("bracket_user_idx").on(t.userId),
  ],
);

export const bracketResults = pgTable("bracket_results", {
  slot: text("slot").primaryKey(),
  teamCode: text("team_code").notNull(),
});

// --- polls (one vote per user per poll) ---
export const pollVotes = pgTable(
  "poll_votes",
  {
    pollKey: text("poll_key").notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    choice: text("choice").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollKey, t.userId] })],
);

// --- tournament membership (100k prize league) ---
// A user is "in" the tournament only by an explicit opt-in here. Their
// tournament score counts only matches kicking off at/after the tournament
// start (Belgium vs Iran); the regular prediction game is unaffected.
export const tournamentMembers = pgTable("tournament_members", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

// --- Chip Cup (poker-style prediction tournament) ---
// Players opt in for an equal starting stack, then wager chips on match
// predictions. Payout scales with accuracy (scoring tiers) and the odds implied
// by the crowd — backing a correct underdog pays big, the favourite pays little.
// Independent of the regular game and the prize tournament.
export const chipStacks = pgTable("chip_stacks", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Available (un-committed) chips. Chips at stake live in open chip_wagers.
  chips: integer("chips").notNull(),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chipWagers = pgTable(
  "chip_wagers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    predHome: integer("pred_home").notNull(),
    predAway: integer("pred_away").notNull(),
    // Chips committed (already deducted from the stack while the wager is open).
    amount: integer("amount").notNull(),
    settled: boolean("settled").notNull().default(false),
    // Net chip change once settled (gross return − amount); kept for display.
    delta: integer("delta").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("chip_wager_user_match_idx").on(t.userId, t.matchId),
    index("chip_wager_user_idx").on(t.userId),
    index("chip_wager_settled_idx").on(t.settled),
  ],
);

// --- streaks & badges ---
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  titleFa: text("title_fa").notNull(),
  descFa: text("desc_fa").notNull(),
  icon: text("icon"),
});

export const userBadges = pgTable(
  "user_badges",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: integer("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeId] })],
);

// --- reminders ---
export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_user_idx").on(t.userId)],
);

export const reminderLog = pgTable(
  "reminder_log",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    matchId: integer("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    channel: text("channel").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.matchId, t.channel] })],
);

export type User = typeof users.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
