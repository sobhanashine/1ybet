// Client-safe tournament constants & types (no DB / server-only imports), so
// they can be imported from client components.

/** Entry fee each player pays to join, in toman. The whole pot (fee × members)
 *  goes to the winner — there is no fixed prize. */
export const TOURNAMENT_ENTRY_FEE_TOMAN = 100_000;

export type TournamentMatch = {
  homeTeam: string;
  awayTeam: string;
  homeFlag: string | null;
  awayFlag: string | null;
  kickoffAt: string; // ISO
};
