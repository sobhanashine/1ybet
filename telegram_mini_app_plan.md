# Integration Plan: Telegram Mini App Container & Website Synchronization

This document outlines the architecture, database adjustments, security verification, and frontend scripts required to run the **1ybet** prediction web application seamlessly inside a Telegram bot as a **Telegram Mini App (TMA)**, keeping it completely synchronized with the main website.

---

## 1. How Synchronization Works

The Telegram Mini App is a secure webview wrapper loading our existing Next.js web application. To ensure user accounts are synchronized between the web browser and Telegram:

1. **Shared Database**: Both the desktop website and the Telegram Web App access the same database (Postgres via Drizzle).
2. **Unified Accounts**: We link profiles using the user's phone number or a new `telegramId` column.
3. **Session Auto-Sync**: When a user opens the app inside Telegram, the Telegram Web App SDK provides client-side `initData`. The backend cryptographically validates this data.
   - If the user is found, they are **logged in instantly** (via standard cookie creation) without needing an OTP code.
   - If they are a new user, they are onboarded and linked.

---

## 2. Step-by-Step Implementation Flow

### Step A: Database Schema Update
We will add `telegramId` and `telegramUsername` columns to the `users` table in `lib/db/schema.ts` to link Telegram accounts.

```typescript
// in lib/db/schema.ts
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  phone: text("phone").notNull().unique(), // kept as primary credential
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  country: text("country"),
  email: text("email"),
  isAdmin: boolean("is_admin").notNull().default(false),
  bestStreak: integer("best_streak").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // New Columns:
  telegramId: text("telegram_id").unique(),
  telegramUsername: text("telegram_username"),
});
```

### Step B: Load the Telegram SDK
We will add the official Telegram WebApp JS library to the root layout in `app/layout.tsx` so that client components can interact with the Telegram client.

```tsx
// in app/layout.tsx
import Script from "next/script";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} h-full antialiased`}>
      <head>
        {/* Load Telegram WebApp SDK */}
        <Script 
          src="https://telegram.org/js/telegram-web-app.js" 
          strategy="beforeInteractive" 
        />
      </head>
      <body className="min-h-full flex flex-col text-ink">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
```

### Step C: Secure Telegram Authentication Action
We will add a secure Server Action `verifyTelegramLogin` in `app/actions/auth.ts`.
1. It validates the cryptographic signature of `initData` using our `TELEGRAM_BOT_TOKEN`.
2. It checks if a user with that `telegramId` already exists.
   - If yes: logs them in by setting the `session` cookie.
   - If no: redirects them to a linking screen (to enter their phone number and merge accounts) or registers them.

```typescript
// Authentication validation snippet:
import { createHmac } from "crypto";

export function verifyTelegramHash(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const sortedPairs = Array.from(params.entries())
    .map(([key, val]) => `${key}=${val}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const calculatedHash = createHmac("sha256", secretKey)
    .update(sortedPairs)
    .digest("hex");

  return calculatedHash === hash;
}
```

### Step D: Frontend Auto-Login Component
We will build a simple component (`components/TelegramLoginProvider.tsx`) that runs on the client-side when the app launches:
1. Detects if running inside Telegram: `window.Telegram?.WebApp`.
2. Automatically sends `window.Telegram.WebApp.initData` to our validation action.
3. Silently signs the user in and refreshes the page view.

---

## 3. Review & Feedback Required

> [!IMPORTANT]
> Let's align on these details before we start editing code:
>
> 1. **Registration Flow**: When a new user launches the app inside Telegram for the first time, should we automatically create an account using their Telegram Name/ID, or should we prompt them to link a **Phone Number** first to ensure we can match their account with the website?
> 2. **Telegram Bot Token**: Please prepare your `TELEGRAM_BOT_TOKEN` so we can configure it in `.env.local`.
