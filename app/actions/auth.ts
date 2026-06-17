"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  createSession,
  destroySession,
  getCurrentUser,
  isValidOtp,
  isValidPhone,
  normalizePhone,
  upsertUserByPhone,
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
): Promise<ActionResult & { needsOnboarding?: boolean }> {
  if (!isValidPhone(phone)) return { ok: false, error: t.auth.invalidPhone };
  if (!isValidOtp(code)) return { ok: false, error: t.auth.invalidOtp };

  const user = await upsertUserByPhone(normalizePhone(phone));
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

/** Step 4: Login via Telegram initData */
export async function loginViaTelegram(initData: string): Promise<ActionResult & { needsOnboarding?: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return { ok: false, error: "تنظیمات ربات تلگرام انجام نشده است." };
  }

  const { verifyTelegramHash, upsertUserByTelegram, createSession } = await import("@/lib/auth");
  const isValid = verifyTelegramHash(initData, token);
  if (!isValid) {
    return { ok: false, error: "اعتبارسنجی تلگرام ناموفق بود." };
  }

  try {
    const params = new URLSearchParams(initData);
    const userString = params.get("user");
    if (!userString) return { ok: false, error: "اطلاعات کاربر یافت نشد." };

    const tgUser = JSON.parse(userString) as {
      id: number;
      username?: string;
      first_name: string;
      last_name?: string;
    };

    const telegramId = String(tgUser.id);
    const telegramUsername = tgUser.username ?? null;
    const displayName = tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : "");

    const user = await upsertUserByTelegram(telegramId, telegramUsername, displayName);
    await createSession(user.id, user.phone);

    return { ok: true, needsOnboarding: !user.displayName };
  } catch {
    return { ok: false, error: "خطا در پردازش اطلاعات حساب تلگرام." };
  }
}
