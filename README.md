# ⚽️ 1ybet · World Cup 2026 Predictor

[![Next.js](https://img.shields.io/badge/Next.js-16--Turbopack-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-v0.45-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Telegram WebApp](https://img.shields.io/badge/Telegram_Mini_App-Active-26A5E4?style=for-the-badge&logo=telegram&logoColor=white)](https://core.telegram.org/bots/webapps)

A premium, fully Persian (RTL layout), installable PWA and **Telegram Mini App** where users predict World Cup 2026 match scores, fill dynamic knockout brackets, earn achievements/badges, climb high-contrast leaderboards, and compete in private leagues.

---

## 📸 Core Features

* ⚽️ **Match Score Predictions**: Submit scorelines for every group-stage and knockout fixture, with cards auto-locking at kickoff.
* 🏟️ **Dynamic Bracket Progression**: Interactive select-and-advance knockout bracket prediction grid with scaling stage rewards (3 / 5 / 8 / 13 / 21 / 34 for each round reached, from the Round of 32 up to champion).
* 🏆 **Granular Scoring Metric**: Rewarding statistical prediction accuracy (floor scoring ensures active participation yields points):
  - **10 Points**: Exact score prediction.
  - **7 Points**: Correct goal difference (including a correct draw).
  - **5 Points**: Correct winner (incorrect scoreline/margin).
  - **2 Points**: Participation points (floor margin — no zero).
  - *Knockouts are scored on the 90-minute regulation result; bracket advancement uses the real winner including ET/penalties.*
* 👥 **Private Leagues**: Build or join customized mini-competitions with friends using shareable invitation codes.
* ⚔️ **Head-to-Head**: Compare your predictions and points against any other player.
* 🥇 **Leaderboards & Badges**: High-contrast global rankings plus an achievement/badge catalog.
* 💎 **Telegram Mini App Integration**: Runs the *same* Next.js app inside a Telegram Bot WebApp with auto-login via `initData` HMAC hash verification and mobile viewport optimization (`expand()`). Accounts are linked by phone, so web and Telegram share one identity.
* 🔔 **Push & Email Reminders**: VAPID Web Push notifications plus optional Resend email reminders before matches kick off.
* 🗓️ **Jalali Date System**: Dates render as Shamsi (Jalali) with Persian digits in the `Asia/Tehran` timezone (Sat–Fri week).
* 🎨 **RTL-First "Tactical Turf" Theme**: Energy-packed pitch-green accents tailored for optimal Persian readability utilizing the premium `Vazirmatn` font.
* 🛠️ **Full Admin Control Panel**: Manual result overrides, API synchronization triggers, and push notification broadcast tools.

---

## 📐 System Architecture

The project serves both standard web browsers (PWA) and Telegram Mini App webviews from the **same** Next.js app, backed by a single PostgreSQL database.

```mermaid
graph TD
    subgraph "Clients"
        WEB[Browser / Installable PWA]
        TG[Telegram Bot] -->|Open Mini App| TMA[Telegram Mini App webview]
    end

    subgraph "Next.js 16 App (Vercel)"
        WEB --> APP[App Router · Server Actions]
        TMA -->|Auto-login via initData HMAC| APP
        APP -->|Read/Write| DB[(Supabase Postgres · Drizzle ORM)]
        APP -->|Web Push| PUSH[VAPID]
        APP -->|Reminder emails| MAIL[Resend]
    end

    subgraph "Scheduled Jobs (GitHub Actions, ~20 min)"
        CRON[Cron Runner] -->|x-cron-secret| SYNC["/api/cron/sync"]
        CRON -->|x-cron-secret| REM["/api/cron/reminders"]
        SYNC -->|Fetch fixtures & results| FD[football-data.org API]
        SYNC --> DB
        REM --> DB
    end
```

---

## 🛠️ Stack & Infrastructure

Everything is designed to deploy on free tiers:

* **Hosting**: Vercel (Hobby)
* **Database**: Supabase Postgres (managed serverless pool)
* **Football Feed**: [football-data.org](https://www.football-data.org) API key
* **Notifications**: VAPID Web Push + optional Resend Email SMTP
* **Synchronizer Cron**: GitHub Actions workflow runner every ~20 mins

---

## 🚀 Installation & Local Development

### 1. Prerequisite Accounts
1. Create a database at [Supabase](https://supabase.com). Copy the pooled connection string (port `6543`) for your `.env.local`.
2. Grab an API credential key from [football-data.org](https://www.football-data.org/client/register).
3. If running inside a Telegram bot, message `@BotFather` on Telegram to create a new bot and copy the **HTTP API Bot Token**.

### 2. Environment Configurations
Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

### 3. Dependencies & Database Setup
```bash
# Install NPM packages
npm install

# Run Drizzle migrations to configure PostgreSQL tables
npm run db:migrate

# Seed badge catalogs and sample mock matches for immediate testing
npm run seed

# Start the local development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your app.

### 4. Admin Privileges
Sign in using your phone number (default mock OTP is **1111**). Run the following statement in your Supabase SQL editor to activate your admin control panel:

```sql
UPDATE users SET is_admin = true WHERE phone = 'your_phone_number_digits';
```
*(Once updated, the Admin Panel tab will appear in your profile menu dashboard, letting you edit scores manually).*

---

## 🤖 Telegram Webhook Configuration

Once you deploy your application (to Vercel, or via local tunnels like `ngrok` using `https`), you can link your bot webhook to parse `/start` commands and display the WebApp launcher card:

```bash
npm run bot:setup https://your-deployed-domain.com
```

---

## 🔒 Authentication & OTP Provider Note
The authentication logic is configured to show a fixed OTP code on the login page to avoid SMS charging. To switch to a real provider in production (e.g. Twilio, Kavenegar, etc.), simply swap the `requestOtp` and `isValidOtp` validation checks in:
* **[auth.ts (actions)](file:///Users/sobhan/Desktop/1ybet/app/actions/auth.ts)**
* **[auth.ts (library)](file:///Users/sobhan/Desktop/1ybet/lib/auth.ts)**
