import { getCurrentUser } from "@/lib/auth";
import {
  getTeamPool,
  getUserBracket,
  isBracketLocked,
} from "@/lib/bracket-server";
import BracketEditor from "@/components/BracketEditor";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BracketPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [pool, initial, locked] = await Promise.all([
    getTeamPool(),
    getUserBracket(user.id),
    isBracketLocked(),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold">{t.bracket.title}</h1>
        <p className="text-sm text-muted">{t.bracket.fill}</p>
      </div>

      {pool.length === 0 ? (
        <p className="text-sm text-muted">{t.leaderboard.empty}</p>
      ) : (
        <BracketEditor pool={pool} initial={initial} locked={locked} />
      )}
    </div>
  );
}
