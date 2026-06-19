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
1. Inline the dependency (see `scripts/announce-tournament.ts` — it instantiates Resend and calls the Telegram Bot API directly).
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

## Sending email / Telegram to users
- Script: `scripts/announce-tournament.ts`. **Defaults to dry-run** (prints recipients, sends nothing); pass `--send` to deliver. Always dry-run first and confirm content + counts with the user — this is irreversible outward messaging to real people.
- Reachability is small: most users have a `telegram_id`, few have a real `email` (some `email` values are the literal string `"NULL"` — filter on `includes("@")`).
- **Email caveat**: `RESEND_FROM` is `onboarding@resend.dev` (Resend's free sender), which only delivers to the Resend **account owner's** address. To email everyone, verify a domain at resend.com/domains and set `RESEND_FROM` to it. Telegram has no such limit.

## Git workflow used here
Feature branch off `dev` → PR to `dev` → check PR is `CLEAN`/`MERGEABLE` (GitGuardian + Vercel preview must pass) → merge to `dev`, delete the feature branch → merge `dev` into `main`. **Never delete `dev` or `main`.** Commit messages end with the `Co-Authored-By: Claude` trailer; PR bodies end with the Claude Code trailer.
