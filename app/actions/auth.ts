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
