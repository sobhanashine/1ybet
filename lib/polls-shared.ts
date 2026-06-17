// Client-safe poll constants & types (no DB / server-only imports), so they can
// be imported from client components.
export const PRIZE_POOL_POLL = "prize_pool_100k";

export type PollChoice = "yes" | "no";

export type PollResults = {
  yes: number;
  no: number;
  total: number;
  yesPct: number;
  noPct: number;
  myChoice: PollChoice | null;
};
