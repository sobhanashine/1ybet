// Knockout bracket bonus (pure helpers — safe to import on the client).
//
// Model: for each knockout round the user picks the set of teams they think
// will *reach* that round. A pick scores the round bonus if that team actually
// reaches the round (for CHAMPION: actually wins the final, incl. ET/penalties).
//
// A pick/result is stored as one row with slot = `${round}#${teamCode}`.

export type BracketRound =
  | "LAST_16"
  | "QUARTER_FINAL"
  | "SEMI_FINAL"
  | "FINAL"
  | "CHAMPION";

export const BRACKET_ROUNDS: BracketRound[] = [
  "LAST_16",
  "QUARTER_FINAL",
  "SEMI_FINAL",
  "FINAL",
  "CHAMPION",
];

// Escalating per-round bonus (deeper runs worth more).
export const ROUND_BONUS: Record<BracketRound, number> = {
  LAST_16: 5,
  QUARTER_FINAL: 8,
  SEMI_FINAL: 13,
  FINAL: 21,
  CHAMPION: 34,
};

// How many teams the user picks for each round (the size of that round).
export const ROUND_PICKS: Record<BracketRound, number> = {
  LAST_16: 16,
  QUARTER_FINAL: 8,
  SEMI_FINAL: 4,
  FINAL: 2,
  CHAMPION: 1,
};

export const ROUND_LABEL_FA: Record<BracketRound, string> = {
  LAST_16: "یک‌هشتم نهایی",
  QUARTER_FINAL: "یک‌چهارم نهایی",
  SEMI_FINAL: "نیمه‌نهایی",
  FINAL: "فینال",
  CHAMPION: "قهرمان",
};

export function slotFor(round: BracketRound, teamCode: string): string {
  return `${round}#${teamCode}`;
}

export function roundOfSlot(slot: string): BracketRound {
  return slot.split("#")[0] as BracketRound;
}

export function teamOfSlot(slot: string): string {
  return slot.slice(slot.indexOf("#") + 1);
}

export function bonusForSlot(slot: string): number {
  return ROUND_BONUS[roundOfSlot(slot)] ?? 0;
}
