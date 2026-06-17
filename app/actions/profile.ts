"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { t } from "@/lib/i18n";

export type ProfileResult = { ok: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function saveEmail(email: string): Promise<ProfileResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  const value = email.trim();
  if (value && !EMAIL_RE.test(value)) {
    return { ok: false, error: "ایمیل معتبر نیست" };
  }

  await db
    .update(users)
    .set({ email: value || null })
    .where(eq(users.id, session.uid));

  revalidatePath("/profile");
  return { ok: true };
}
