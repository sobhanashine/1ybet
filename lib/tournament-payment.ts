import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

export const TOURNAMENT_PAYMENT_STATUSES = ["PENDING", "PAID", "UNPAID"] as const;
export type TournamentPaymentStatus = (typeof TOURNAMENT_PAYMENT_STATUSES)[number];

const CALLBACK_PREFIX = "tp";
const CALLBACK_SIGNATURE_LENGTH = 24;

function statusCode(status: Exclude<TournamentPaymentStatus, "PENDING">): string {
  return status === "PAID" ? "paid" : "unpaid";
}

function callbackSignature(
  telegramId: string,
  status: Exclude<TournamentPaymentStatus, "PENDING">,
  botToken: string,
): string {
  return createHmac("sha256", botToken)
    .update(`${telegramId}:${statusCode(status)}`)
    .digest("hex")
    .slice(0, CALLBACK_SIGNATURE_LENGTH);
}

export function buildPaymentCallbackData(
  telegramId: string,
  status: Exclude<TournamentPaymentStatus, "PENDING">,
  botToken: string,
): string {
  return `${CALLBACK_PREFIX}:${statusCode(status)}:${callbackSignature(telegramId, status, botToken)}`;
}

export function parsePaymentCallbackData(
  data: string,
  telegramId: string,
  botToken: string,
): Exclude<TournamentPaymentStatus, "PENDING"> | null {
  const [prefix, rawStatus, suppliedSignature, extra] = data.split(":");
  if (prefix !== CALLBACK_PREFIX || extra !== undefined || !suppliedSignature) return null;

  const status = rawStatus === "paid" ? "PAID" : rawStatus === "unpaid" ? "UNPAID" : null;
  if (!status) return null;

  const expectedSignature = callbackSignature(telegramId, status, botToken);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  return status;
}
