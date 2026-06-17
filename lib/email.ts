import "server-only";
import { Resend } from "resend";

let client: Resend | null = null;
function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null; // email is optional — silently skip if unconfigured
  if (!client) client = new Resend(key);
  return client;
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const resend = getClient();
  if (!resend) return false;
  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  try {
    await resend.emails.send({ from, to, subject, html });
    return true;
  } catch {
    return false;
  }
}
