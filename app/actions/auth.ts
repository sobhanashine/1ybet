"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  createSession,
  destroySession,
  getCurrentUser,
  getUserByTelegramId,
  isValidOtp,
  isValidPhone,
  linkTelegramToUser,
  normalizePhone,
  parseTelegramUser,
  upsertUserByPhone,
  verifyTelegramHash,
} from "@/lib/auth";
import { OTP_CODE } from "@/lib/config";
import { t } from "@/lib/i18n";

export type ActionResult = { ok: boolean; error?: string; otp?: string };

/** Step 1: validate phone. No SMS — the fixed OTP is returned for on-screen display. */
export async function requestOtp(phone: string): Promise<ActionResult> {
  if (!isValidPhone(phone)) {
    return { ok: false, error: t.auth.invalidPhone };
  }
  return { ok: true, otp: OTP_CODE };
}

/** Step 2: verify OTP, upsert user, create session. Returns whether onboarding is needed. */
export async function verifyOtp(
  phone: string,
  code: string,
  telegramInitData?: string,
): Promise<ActionResult & { needsOnboarding?: boolean }> {
  if (!isValidPhone(phone)) return { ok: false, error: t.auth.invalidPhone };
  if (!isValidOtp(code)) return { ok: false, error: t.auth.invalidOtp };

  let user = await upsertUserByPhone(normalizePhone(phone));

  // When the OTP step is part of a Telegram link, re-verify initData server-side
  // and attach the Telegram identity to this (web) account so both stay in sync.
  if (telegramInitData) {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token && verifyTelegramHash(telegramInitData, token)) {
      const tgUser = parseTelegramUser(telegramInitData);
      if (tgUser) {
        user = await linkTelegramToUser(
          user.id,
          tgUser.id,
          tgUser.username,
          tgUser.displayName,
        );
      }
    }
  }

  await createSession(user.id, user.phone);

  return { ok: true, needsOnboarding: !user.displayName };
}

/** Step 3: set display name (and optional country) for a new user. */
export async function completeOnboarding(
  displayName: string,
  country?: string,
): Promise<ActionResult> {
  const current = await getCurrentUser();
  if (!current) return { ok: false, error: t.common.error };

  const name = displayName.trim();
  if (name.length < 2) return { ok: false, error: t.auth.nameLabel };

  await db
    .update(users)
    .set({ displayName: name, country: country?.trim() || null })
    .where(eq(users.id, current.id));

  return { ok: true };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

/**
 * Step 4: Telegram Mini App entry. Verifies initData cryptographically, then:
 *  - if the Telegram id is already linked to an account → logs in instantly;
 *  - otherwise → asks the client to collect a phone number (needsPhoneLink) so
 *    the Telegram identity can be merged into the matching web account.
 */
export async function loginViaTelegram(
  initData: string,
): Promise<ActionResult & { needsOnboarding?: boolean; needsPhoneLink?: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "تنظیمات ربات تلگرام انجام نشده است." };
  }

  if (!verifyTelegramHash(initData, token)) {
    return { ok: false, error: "اعتبارسنجی تلگرام ناموفق بود." };
  }

  const tgUser = parseTelegramUser(initData);
  if (!tgUser) return { ok: false, error: "اطلاعات کاربر یافت نشد." };

  // Already linked → instant, password-less login.
  const existing = await getUserByTelegramId(tgUser.id);
  if (existing) {
    await createSession(existing.id, existing.phone);
    return { ok: true, needsOnboarding: !existing.displayName };
  }

  // Not linked yet → client should show the phone step to merge/create the account.
  return { ok: true, needsPhoneLink: true };
}
