# پیش‌بینی جام جهانی ۲۰۲۶ · WC 2026 Prediction

A fully Persian (RTL), installable PWA where users predict World Cup 2026 match
scores, earn points, climb daily / weekly / per-stage / all-time leaderboards,
fill a knockout bracket, earn badges, and compete in private groups.

Built with **Next.js 16 (App Router) + React 19 + Tailwind v4 + Drizzle/Postgres**.
Everything runs on free tiers.

## Scoring

| Result | Points |
|---|---|
| Exact score | **10** |
| Correct goal difference (incl. a correct draw) | **7** |
| Correct winner (wrong margin) | **5** |
| Wrong prediction (still submitted) | **2** (floor — no zero) |

Knockout matches are scored on the **90-minute (regulation) result only**. The
bracket bonus is separate and escalates per round (5 / 8 / 13 / 21 / 34).

## Stack (all free)

- **Hosting:** Vercel (Hobby)
- **Database:** Supabase Postgres (used as plain Postgres)
- **Football data:** [football-data.org](https://www.football-data.org) free tier (includes the World Cup)
- **Reminders:** Web Push (VAPID) + optional email via Resend
- **Cron:** GitHub Actions (`.github/workflows/sync.yml`) every ~20 min

## Setup

### 1. Database (Supabase)
1. Create a free project at https://supabase.com.
2. Project → Settings → Database → Connection string → **URI** (use the pooled
   connection, port `6543`). Put it in `.env.local` as `DATABASE_URL`.

### 2. Football data
1. Register free at https://www.football-data.org/client/register.
2. Put the key in `.env.local` as `FOOTBALL_DATA_API_KEY`.

### 3. Env vars
Copy `.env.example` → `.env.local` and fill it in. `SESSION_SECRET`, the VAPID
keys, and `CRON_SECRET` are pre-generated in `.env.local` already. Regenerate
VAPID keys anytime with `npx web-push generate-vapid-keys`.

### 4. Migrate + seed
```bash
npm install
npm run db:migrate     # apply the schema to Supabase
npm run seed           # badge catalog + sample matches for local dev
npm run dev            # http://localhost:3000
```

### 5. Make yourself admin
Log in once (phone + OTP **1111** + name), then in the Supabase SQL editor:
```sql
update users set is_admin = true where phone = '<your digits>';
```
The admin dashboard appears at `/admin` (manual sync, score overrides, broadcasts).

## Deploy (Vercel)
1. Push to GitHub, import the repo in Vercel.
2. Add all `.env.local` vars to Vercel → Project → Settings → Environment Variables.
3. Run the SQL migration against Supabase (`npm run db:migrate` locally with the
   prod `DATABASE_URL`, or paste `drizzle/*.sql`).
4. Add GitHub repo secrets `APP_URL` (your Vercel URL) and `CRON_SECRET` so the
   scheduled workflow can drive result syncing and reminders.

## Auth note
OTP is intentionally a fixed **1111** shown on screen (no SMS cost). To switch to
real SMS later, replace `isValidOtp` / `requestOtp` in `lib/auth.ts` &
`app/actions/auth.ts` with a provider (e.g. Twilio) — the rest is unchanged.
