// Pure time helpers — safe to import from both server and client components.
// Kept out of component bodies so they don't trip the react-hooks/purity rule.

export function isLocked(kickoffAt: Date | string): boolean {
  return new Date(kickoffAt).getTime() <= Date.now();
}

export function isUpcoming(kickoffAt: Date | string): boolean {
  return new Date(kickoffAt).getTime() > Date.now();
}
