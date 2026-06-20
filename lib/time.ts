// Pure time helpers — safe to import from both server and client components.
// Kept out of component bodies so they don't trip the react-hooks/purity rule.

export function isLocked(kickoffAt: Date | string): boolean {
  return new Date(kickoffAt).getTime() <= Date.now();
}

export function isUpcoming(kickoffAt: Date | string): boolean {
  return new Date(kickoffAt).getTime() > Date.now();
}

/**
 * Is a match plausibly in progress right now — kicked off within the last ~3h
 * and not far in the future? Used to decide whether to poll for live scores.
 */
export function isLiveWindow(kickoffAt: Date | string): boolean {
  const ko = new Date(kickoffAt).getTime();
  const now = Date.now();
  return ko <= now + 5 * 60_000 && ko >= now - 180 * 60_000;
}
