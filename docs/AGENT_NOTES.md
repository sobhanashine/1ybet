# Agent Notes — operational playbook for 1ybet

Non-obvious, repo-specific knowledge for an AI agent working on this codebase.
Read this alongside `AGENTS.md` (which points you at `node_modules/next/dist/docs/`
before writing any Next.js code — this is Next 16, not the version you remember).

---

## Stack at a glance
- **Next.js 16** (App Router, Turbopack), **React 19**, **Tailwind v4** (`@theme` in `app/globals.css`).
- **Supabase Postgres** via **Drizzle ORM**. Schema: `lib/db/schema.ts`. Client: `lib/db/index.ts`.
- Single language: Persian (RTL). All copy lives in `lib/i18n.ts` (`t.*`). Dates are Jalali (`lib/format.ts`), timezone `Asia/Tehran`.
- Auth: phone + fixed mock OTP `1111` (`lib/config.ts` `OTP_CODE`). Sessions are JWTs in a cookie. Telegram Mini App auto-logs in via `initData` HMAC.

## Design tokens (use these, don't hardcode)
- Colors via Tailwind from `@theme`: `pitch-500` (primary green), `gold` / `gold-dim` (prize/podium), `ink` / `ink-dim` / `muted`, `surface` / `surface-2`, `line` / `line-strong`, `danger`. Opacity modifiers work (`bg-gold/10`).
- Radii: `var(--radius-sm|md|lg|xl)`. Z-index: `var(--z-nav|sticky|backdrop|modal|toast)`.
- Reusable classes: `.card`, `.btn .btn-primary|btn-secondary|btn-ghost`, `.field`. Persian digits via `toPersianDigits()`; numeric alignment class `tnum`.

## Talking to the database from a script / one-off
`lib/db`, `lib/email`, `lib/telegram` all `import "server-only"`, so they **cannot** be imported from a `tsx` script (ESM hoists the import before any `server-only` mock runs — it throws). Two options:
1. Inline the dependency (see `scripts/announce-guide.ts` — it instantiates Resend and calls the Telegram Bot API directly).
2. For raw SQL, read `DATABASE_URL` straight from `.env.local` and use `postgres`:
   ```js
   const url = require("fs").readFileSync(".env.local","utf8").match(/^DATABASE_URL=(.+)$/m)[1].trim();
   const sql = require("postgres")(url, { ssl: "require" });
   ```
   Note: `postgres-js` does **not** serialize a JS `Date` passed as a raw `sql``` param — bind ISO strings when comparing against `timestamptz` (see `lib/leaderboard.ts`).

## Migrations
- Generate: `npm run db:generate` (drizzle-kit, offline — reads `lib/db/schema.ts`). Apply: `npm run db:migrate`.
- **The harness may block `db:migrate`** (it mutates the shared/live DB). If so and the user explicitly approves applying directly, you can:
  1. Run the `CREATE TABLE …` from the generated `drizzle/NNNN_*.sql` against the DB with `postgres-js`.
  2. **Record it** in drizzle's tracker so a future `db:migrate` won't re-run it:
     insert into `drizzle.__drizzle_migrations (hash, created_at)` where
     `hash = sha256(fileContentsOf the .sql)` and `created_at = the journal "when"` from `drizzle/meta/_journal.json`.
     Verify the hash method against an already-applied migration first (it matched `0004` exactly when done this way).

## Next 16 gotchas already hit
- **`next/script` with `strategy="beforeInteractive"` renders a real inline `<script>`** that React re-encounters on the client → console error *"Encountered a script tag while rendering React component."* Fix: load with `afterInteractive` (or `lazyOnload`) which injects via the DOM API, and run init in `onReady`. The Telegram SDK now loads this way in `components/TelegramProvider.tsx`.
- `redirect()` in an event handler isn't allowed — use `useRouter().push()` in client handlers; `redirect()` is fine in server components / actions.

## The prize tournament (added 2026-06)
- **Membership** is explicit opt-in: table `tournament_members` (one row per joined user). Action: `joinTournament()` in `app/actions/tournament.ts`. This is separate from the old `prize_pool_100k` poll (`pollVotes`), which is now historical (kept only for the admin view).
- **Server logic**: `lib/tournament.ts` — `getStartMatch()` (looks up Belgium–Iran by team codes `BEL`/`IRN`, never hardcodes an id), `isMember()`, `getMemberCount()`, `getTournamentLeaderboard(startIso)` (members only, points summed only for matches with `kickoffAt >= start`). Entry fee constant `TOURNAMENT_ENTRY_FEE_TOMAN` lives in `lib/tournament-shared.ts` (client-safe).
- **Page**: `app/(app)/tournament/page.tsx` (force-dynamic). Pot = `memberCount × fee`, formatted with `Intl.NumberFormat("fa-IR")`. Non-members get `components/TournamentJoinModal.tsx` (Yes joins, No → `/`). Countdown is `components/Countdown.tsx` (hydration-safe: deterministic placeholder, ticks via `setInterval`/`setTimeout`, never synchronous `setState` in an effect — eslint `react-hooks/set-state-in-effect` is on).
- **Start match fact**: Belgium vs Iran, match id 44, kickoff `2026-06-21T19:00:00Z` (22:30 Tehran, Sunday). Everything from this kickoff counts.
- **Bottom nav** (`components/BottomNav.tsx`): raised gold center FAB → `/tournament`. Compare (`/h2h`) was dropped from the bar but is still reachable from leaderboard rows.
- Removed the app-wide blocking `PollGate`; `StickyWidget` is now email-reminder only.
- **Guide-video popup** (`components/GuideVideoPopup.tsx`, mounted in `app/(app)/layout.tsx`): on app open it offers the tournament guide video (Yes → plays inline with a close button, No → suppressed). It keeps offering until the user picks **No** — only then is `localStorage["guide-video-dismissed"]` set. Stages `hidden → prompt → video`; the reveal is deferred via `setTimeout(…, 0)` to satisfy eslint `react-hooks/set-state-in-effect` (same pattern as `Countdown.tsx`). Video URL: `NEXT_PUBLIC_TOURNAMENT_VIDEO_URL` (falls back to `/tournament-guide.mp4`). Copy lives in `t.tournament.guidePopup*`.

## Tournament podium badges + custom rank artwork (added 2026-06)
- **Three named podium badges** awarded to the live tournament top 3: `tournament_1st` = **الماسخاله** (gold), `tournament_2nd` = **آرسنال** (silver), `tournament_3rd` = **الو مشکات** (bronze). Catalog entries + helpers in `lib/badges.ts` (`TOURNAMENT_PODIUM_CODES`, `tournamentPodiumTitle(rank)`). Seed them with `scripts/seed.ts` (onConflictDoUpdate) — already seeded to the live DB.
- **Award logic**: `lib/tournament-badges.ts` `awardTournamentTop3()` — reads `getTournamentLeaderboard`, takes the top 3 **with `points > 0`** (never awards a podium badge to someone at zero before any results), inserts `user_badges` with `onConflictDoNothing` (idempotent — a player keeps a badge once earned, badges are never revoked). Called best-effort from `runSync()` in `lib/sync.ts` (try/catch, folded into `badgesAwarded`).
- **Custom SVG art** replaces the old 🥇🥈🥉 emojis — `components/BadgeArt.tsx`, pure SVG with no client hooks so it renders from server components:
  - `<RankMedal rank={1|2|3} />` — numbered gold/silver/bronze medal with ribbon. **Now unused** — its only consumer was the general leaderboard page, removed in the bottom-nav revamp (see below). Still exported in `BadgeArt.tsx` if a future page wants it.
  - `<TournamentCrest code={…} />` — a tiered shield with a per-name motif (diamond / cannon / lantern), used for the top 3 on the **tournament standings** (`app/(app)/tournament/page.tsx`) where each podium row also shows the badge name label under the display name.
  - `<BadgeArt code fallback size />` — renders a crest for podium codes, else the emoji fallback; used on the **profile** badge grid (`app/(app)/profile/page.tsx`).
  - SVG gradient ids are unique per tier (`crest-gold`, `medal-gold`, …) to avoid id collisions when several render on one page.

## Bottom-nav revamp: Games Analyze + live World Cup standings (added 2026-06)
The bottom nav (`components/BottomNav.tsx`) is now **Home · WC Table · [Tournament FAB] · Games Analyze · Profile**. Two prediction surfaces were taken off the bar and replaced with free, read-only data pages.
- **General leaderboard deleted**: `app/(app)/leaderboard/page.tsx` is gone. The user-facing ranking is now the prize-tournament standings (`/tournament`). The home "rank" stat (`app/(app)/page.tsx`) reads `getTournamentLeaderboard()` (label `t.tournament.rankLabel`), not the old general leaderboard. `lib/leaderboard.ts` is **kept** — it still powers the home points/predicted stats and the h2h compare picker. `admin.ts` now `revalidatePath("/tournament")` instead of `/leaderboard`.
- **Bracket (KO prediction) unlinked**: the `/bracket` route still exists (predictions preserved) but was removed from the nav.
- **`/analyze` — تحلیل بازی‌ها** (`app/(app)/analyze/page.tsx`, force-dynamic): per upcoming/live match shows each team's group standing, recent W/D/L form, the crowd's home/draw/away split, and a computed **lean**. Logic in `lib/analyze.ts` `getGamesAnalysis(userId)`: form is derived from our **own** finished-match results (the WC free tier returns `form: null`), standings come from football-data.org, crowd from `getMatchPredictionStats`. The lean is three equal votes (group points / form / crowd) → favourite or "even". Bounded to the next `MAX_GAMES` (12) to cap per-match crowd queries.
- **`/standings` — جدول جام جهانی** (`app/(app)/standings/page.tsx`, force-dynamic): live group tables, read-only, **no prediction**. Top two per group highlighted as qualifying.
- **Free-data note**: both pages reuse the existing `FOOTBALL_DATA_API_KEY` (football-data.org free tier). `lib/football-api.ts` `fetchGroupTables()` (ordered groups for the table) and `fetchStandings()` (lookup Map for analyze) share **one** cached `/standings` fetch (30-min TTL) — no extra calls, nothing paid. API-Football's richer Predictions endpoint was evaluated and rejected (free plan ~100 req/day, unlikely to cover the live WC season, adds a key).

## Tournament onboarding redesign + analyze→match move (added 2026-06)
A reshuffle around the prize tournament. The nav is now **Home · WC Table · [Tournament FAB] · Leaderboard · Profile**.
- **`/analyze` deleted.** Its per-match content (each side's group standing + recent form, crowd lean, computed verdict) moved **inline into the match detail page** (`app/(app)/match/[id]/page.tsx`), as a "تحلیل و فرم" section above the crowd stats. `lib/analyze.ts` now exports **`getMatchAnalysis(matchId, userId)`** (single match, returns `GameAnalysis | null`); the old `getGamesAnalysis()` and `MAX_GAMES` were removed. The crowd-split bar isn't repeated there — the match page already renders full crowd stats below.
- **Bottom nav** (`components/BottomNav.tsx`): the right "تحلیل بازی‌ها" tab is replaced by **Leaderboard** (`/leaderboard`, `Medal` icon, `t.nav.leaderboard`). The gold Tournament FAB still points at `/tournament`.
- **`/leaderboard` (new)** = the **tournament standings**, moved out of `/tournament` (`app/(app)/leaderboard/page.tsx`, force-dynamic). Same podium crests / your-rank / points list as before, plus a compact pot header. Note: this reuses the `/leaderboard` route name that the *general* leaderboard once held (that page was deleted earlier); it has nothing to do with `lib/leaderboard.ts`.
- **`/tournament` redesigned** into a pure "why + how to join + register" page: pot/fee/members/guide hero, a 3-step "چطور وارد تورنمنت بشم؟" list, the start-match countdown, then a CTA. Non-members get **`components/TournamentRegister.tsx`** (client): tap register → `joinTournament()` → in-page congrats card → auto-redirect to `/` after 2s (+ a "start predicting" button). Members see a "you're in ✅" state with a link to `/leaderboard`. The old **`TournamentJoinModal` is deleted** (registration is now inline, no blocking modal).
- **First-visit onboarding**: `components/FirstVisitTournamentGate.tsx` — `FirstVisitTournamentGate` is mounted on the home page and, on the **very first** app open of a **not-yet-registered** user, sets `localStorage["tournament-intro-seen"]` and `router.replace("/tournament")`; every later open lands on home normally. It takes `isMember` (home passes `userRank > 0`, which reliably means a member since `getTournamentLeaderboard` lists every member even at 0 points) — **members are never redirected**, opening the app keeps them on home (we just mark the intro seen). `MarkTournamentIntroSeen` (same file) is mounted on `/tournament` so reaching it via the FAB also marks the intro seen (no later bounce). Client-side flag, same pattern as the guide popup — no DB/server state.
- **`joinTournament()`** (`app/actions/tournament.ts`) now `revalidatePath`s `/tournament`, `/leaderboard`, **and** `/` (a new member changes the pot, the standings, and the home rank stat). New members appear on the leaderboard immediately at 0 points (`getTournamentLeaderboard` is `from(tournamentMembers)` with coalesced sums).
- **Profile is fully tournament-scoped** (`app/(app)/profile/page.tsx`): the hero number is **tournament points** (not all-time, no bracket) — `lib/profile.ts` `getUserTournamentBreakdown(userId, startIso)` sums prediction points for matches with `kickoffAt >= start`, so it equals the user's `getTournamentLeaderboard` points. It also buckets scored predictions by tier (`scoring.ts` `POINTS`: exact 10 / diff 7 / winner 5 / floor 2) for a "امتیازها از کجا میاد؟" breakdown (contribution bar + per-tier counts). Mini-stats are **Rank · Predictions · Accuracy** (best-streak/all-time total dropped). Window comparison binds the ISO string in raw `sql` (not a `Date`), same caveat as the leaderboard. The old all-time `getUserTotalPoints` is kept (still used by `lib/h2h.ts`).

## Chip Cup — poker-style wagering (added 2026-06, MVP)
A second, independent prediction mode: opt in for an equal chip stack and **wager chips on match predictions** (poker-with-chips), separate from the regular game and the prize tournament.
- **Schema** (`lib/db/schema.ts`, migration `drizzle/0006_*`): `chip_stacks` (one row/member: `chips` = *available* balance) and `chip_wagers` (one open wager per `(user, match)` via a unique index; `amount` committed, `settled`, `delta`). Chips committed to open wagers are **deducted up front** from `chips`, so available is always real; editing a wager refunds the old stake first (handled in a `SELECT … FOR UPDATE` transaction in `placeChipWager`).
- **Server logic**: `lib/chip-cup.ts`. `STARTING_STACK = 1000`, `MIN_WAGER = 50`. **Payout** = `amount × (1 + profitTier × oddsMult)` on a win, lose the stake on a wrong outcome. `profitTier` keys off the existing `scorePrediction` tiers (exact 2.0 / diff 1.2 / winner 0.6). `oddsMult` = `clamp(0.5 / max(p, 0.2), 0.6, 2.0)` where `p` is the crowd's probability of the *predicted outcome* from `getMatchPredictionStats` — **fade the crowd correctly → up to 2× payout**. Odds are read at settlement (final crowd), not snapshotted at bet time (MVP simplification).
- **Settlement** is lazy + idempotent: `settlePendingWagers()` runs on each `/chip-cup` load (after `maybeAutoSync`) and flips `settled=false → true` in the *same* UPDATE it reads (guarded `.where(settled=false).returning()`), crediting the stack only if the row actually flipped — a stake can never pay out twice even under concurrent loads. No cron needed.
- **Leaderboard** ranks by **total holdings** = available `chips` + sum of open-wager `amount` (so committing chips to a bet doesn't drop your rank).
- **UI**: `app/(app)/chip-cup/page.tsx` (force-dynamic) — non-members get a how-to + `ChipJoinButton`; members get a stack hero (total · available · at-stake · rank), a wager board (`ChipWagerForm`: ± score steppers + chip-amount presets/all-in), a settled-results feed, and the chip leaderboard. Entry point is a gold promo card on the home page (`t.chipCup`, `t.common.new`). Constants are passed as props (the lib is `server-only`; client imports only the **type** `ChipOpenMatch`).
- **Not yet built** (v2 ideas from the design): group→top-32 cut, heads-up knockout bracket mirroring the WC, escalating blinds/antes, re-buys/add-ons, tiered payouts. Today it's the chip-leaderboard MVP.

## Sending email / Telegram to users
- Scripts: `scripts/announce-guide.ts` (guide-video broadcast) and `scripts/announce-video.ts` follow the same dual-channel (email + Telegram) pattern with `--telegram-only` / `--email-only`, `--only <id>`, `--admins`. Newer **Telegram-only** one-offs are simpler — `scripts/remind-join-tournament.ts`, `scripts/remind-tournament-starting-soon.ts` (`--all` = every telegram user vs. default non-members) and `scripts/announce-analyze-standings.ts` (feature announcement to all telegram users). **Default to dry-run** (print recipients, send nothing); pass `--send` to deliver. Always dry-run first and confirm content + counts with the user — this is irreversible outward messaging to real people.
- Reachability is small: most users have a `telegram_id`, few have a real `email` (some `email` values are the literal string `"NULL"` — filter on `includes("@")`).
- **Email caveat**: `RESEND_FROM` is `onboarding@resend.dev` (Resend's free sender), which only delivers to the Resend **account owner's** address. To email everyone, verify a domain at resend.com/domains and set `RESEND_FROM` to it. Telegram has no such limit.
- **Telegram network caveat**: `api.telegram.org` is often **blocked from the user's machine** (Iran) — sends time out with `ConnectTimeoutError`. It works only when the user has a VPN/proxy active. Resend and Supabase remain reachable. If a Telegram send times out, ask the user to enable their VPN and retry, rather than assuming the token/code is wrong.

## Git workflow used here
Feature branch off `dev` → PR to `dev` → check PR is `CLEAN`/`MERGEABLE` (GitGuardian + Vercel preview must pass) → merge to `dev`, delete the feature branch → merge `dev` into `main`. **Never delete `dev` or `main`.** Commit messages end with the `Co-Authored-By: Claude` trailer; PR bodies end with the Claude Code trailer.
