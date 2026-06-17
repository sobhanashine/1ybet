import "server-only";
import webpush from "web-push";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { pushSubscriptions } from "./db/schema";

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@example.com";
  if (!publicKey || !privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

/** Send a notification to every subscription of a user. Prunes dead endpoints. */
export async function sendPushToUser(
  userId: number,
  payload: PushPayload,
): Promise<number> {
  configure();
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      );
      sent++;
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      // 404/410 = subscription gone — remove it.
      if (status === 404 || status === 410) {
        await db
          .delete(pushSubscriptions)
          .where(eq(pushSubscriptions.endpoint, s.endpoint));
      }
    }
  }
  return sent;
}

export async function userHasPush(userId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: pushSubscriptions.id })
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))
    .limit(1);
  return !!row;
}
