// Centralized config / env access. The OTP code is intentionally fixed and
// surfaced here so it can later be swapped for a real SMS provider.
export const OTP_CODE = process.env.OTP_CODE ?? "1111";
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 60; // 60 days
export const TIMEZONE = "Asia/Tehran";

// Public base URL of the app, used for links in emails/notifications.
export const APP_URL =
  process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://1ybet.vercel.app";

export const FOOTBALL_API_BASE = "https://api.football-data.org/v4";
export const WC_COMPETITION = "WC"; // FIFA World Cup code on football-data.org

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
