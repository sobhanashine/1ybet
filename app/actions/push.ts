"use server";

import { db } from "@/lib/db";
import { pushSubscriptions } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";

export type PushSubInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export async function subscribeToPush(
  sub: PushSubInput,
): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };

  await db
    .insert(pushSubscriptions)
    .values({
      userId: session.uid,
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId: session.uid, p256dh: sub.p256dh, auth: sub.auth },
    });

  return { ok: true };
}
