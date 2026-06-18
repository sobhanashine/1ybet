import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getPollBreakdown, PRIZE_POOL_POLL } from "@/lib/polls";
import AdminTools from "@/components/AdminTools";
import AdminMatchEditor from "@/components/AdminMatchEditor";
import AdminPollResults from "@/components/AdminPollResults";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const [allMatches, pollBreakdown] = await Promise.all([
    db
      .select({
        id: matches.id,
        homeTeam: matches.homeTeam,
        awayTeam: matches.awayTeam,
        kickoffAt: matches.kickoffAt,
        status: matches.status,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
      })
      .from(matches)
      .orderBy(desc(matches.kickoffAt)),
    getPollBreakdown(PRIZE_POOL_POLL),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-ink">{t.nav.admin}</h1>

      <AdminTools />

      <AdminPollResults data={pollBreakdown} />

      <section className="space-y-3">
        <h2 className="section-label">{t.nav.fixtures}</h2>
        <AdminMatchEditor matches={allMatches} />
      </section>
    </div>
  );
}
