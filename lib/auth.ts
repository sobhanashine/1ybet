import "server-only";
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

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
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

    const { createHmac } = require("crypto");
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

/** Upsert a user by Telegram ID, linking or auto-registering them */
export async function upsertUserByTelegram(
  telegramId: string,
  telegramUsername: string | null,
  displayName: string,
): Promise<User> {
  // 1. Check if user already exists by telegramId
  const existingByTg = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId))
    .limit(1);
  if (existingByTg[0]) {
    // Update username if it changed
    if (existingByTg[0].telegramUsername !== telegramUsername) {
      const [updated] = await db
        .update(users)
        .set({ telegramUsername })
        .where(eq(users.id, existingByTg[0].id))
        .returning();
      return updated;
    }
    return existingByTg[0];
  }

  // 2. Create new user with a unique phone placeholder
  const placeholderPhone = `tg-${telegramId}`;
  const [created] = await db
    .insert(users)
    .values({
      phone: placeholderPhone,
      telegramId,
      telegramUsername,
      displayName,
    })
    .returning();
  return created;
}
