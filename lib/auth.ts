import "server-only";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { users, type User } from "./db/schema";
import {
  OTP_CODE,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  requireEnv,
} from "./config";

function secretKey() {
  return new TextEncoder().encode(requireEnv("SESSION_SECRET"));
}

export type SessionPayload = { uid: number; phone: string };

export async function createSession(uid: number, phone: string) {
  const token = await new SignJWT({ uid, phone })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secretKey());

  const isProd = process.env.NODE_ENV === "production";
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Telegram Mini Apps load the site inside a cross-origin iframe (Desktop/Web
    // clients). A SameSite=Strict/Lax cookie is dropped there, which would break
    // the session and bounce the user back to /login. SameSite=None + Secure is
    // required to keep the session alive inside Telegram. (Secure needs HTTPS,
    // which Telegram requires anyway; locally we fall back to Lax over HTTP.)
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { uid: payload.uid as number, phone: payload.phone as string };
  } catch {
    return null;
  }
}

/** Full user row for the current session, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.uid))
    .limit(1);
  return user ?? null;
}

export function isValidOtp(code: string): boolean {
  return code.trim() === OTP_CODE;
}

export function normalizePhone(input: string): string {
  // Convert Persian and Arabic digits to English digits
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let normalized = input;
  for (let i = 0; i < 10; i++) {
    normalized = normalized.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  // keep digits only; tolerate spaces/dashes and a leading +.
  const digits = normalized.replace(/[^\d]/g, "");
  return digits;
}

export function isValidPhone(phone: string): boolean {
  // Iranian mobile: 09xxxxxxxxx (11 digits) or with country code.
  const d = normalizePhone(phone);
  return d.length >= 10 && d.length <= 13;
}

/** Upsert a user by phone, returning the row. */
export async function upsertUserByPhone(phone: string): Promise<User> {
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.phone, phone))
    .limit(1);
  if (existing[0]) return existing[0];

  const [created] = await db.insert(users).values({ phone }).returning();
  return created;
}

/** Verify Telegram WebApp initData cryptographic hash */
export function verifyTelegramHash(initData: string, botToken: string): boolean {
  try {
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
  } catch {
    return false;
  }
}

export type TelegramUser = { id: string; username: string | null; displayName: string };

/** Parse the `user` field out of a (already hash-verified) Telegram initData string. */
export function parseTelegramUser(initData: string): TelegramUser | null {
  try {
    const userString = new URLSearchParams(initData).get("user");
    if (!userString) return null;
    const tg = JSON.parse(userString) as {
      id: number;
      username?: string;
      first_name: string;
      last_name?: string;
    };
    return {
      id: String(tg.id),
      username: tg.username ?? null,
      displayName: tg.first_name + (tg.last_name ? ` ${tg.last_name}` : ""),
    };
  } catch {
    return null;
  }
}

/** Look up the account a Telegram identity is already linked to, if any. */
export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  const [u] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  return u ?? null;
}

/**
 * Attach a Telegram identity to an existing (phone-based) account so the two
 * stay in sync. Idempotent and non-destructive: if the Telegram id is already
 * linked to a different account we never move data — we return that account so
 * the caller logs into it instead.
 */
export async function linkTelegramToUser(
  userId: number,
  telegramId: string,
  telegramUsername: string | null,
  fallbackDisplayName?: string,
): Promise<User> {
  const existingByTg = await getUserByTelegramId(telegramId);
  if (existingByTg && existingByTg.id !== userId) return existingByTg;

  const [target] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const [updated] = await db
    .update(users)
    .set({
      telegramId,
      telegramUsername,
      // Pre-fill a display name from Telegram only if the account has none yet,
      // letting Telegram users skip the onboarding name prompt.
      displayName: target?.displayName ?? fallbackDisplayName ?? null,
    })
    .where(eq(users.id, userId))
    .returning();
  return updated;
}
