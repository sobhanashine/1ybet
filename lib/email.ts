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
    // The Resend SDK does NOT throw on API errors (e.g. recipient not allowed on
    // the free sender) — it returns them in `error`. Check it explicitly.
    const { data, error } = await resend.emails.send({ from, to, subject, html });
    if (error) {
      console.error("Resend send error:", error.name, "-", error.message);
      return false;
    }
    if (data?.id) console.log("Resend accepted message id:", data.id);
    return true;
  } catch (e) {
    console.error("Resend threw:", e instanceof Error ? e.message : String(e));
    return false;
  }
}
