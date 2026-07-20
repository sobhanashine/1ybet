import { redirect } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches, tournamentMembers, users } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getPollBreakdown, PRIZE_POOL_POLL } from "@/lib/polls";
import AdminTools from "@/components/AdminTools";
import AdminMatchEditor from "@/components/AdminMatchEditor";
import AdminPollResults from "@/components/AdminPollResults";
import AdminTournamentPayments from "@/components/AdminTournamentPayments";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const [allMatches, pollBreakdown, paymentMembers] = await Promise.all([
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
    db
      .select({
        userId: tournamentMembers.userId,
        name: users.displayName,
        phone: users.phone,
        telegramUsername: users.telegramUsername,
        telegramId: users.telegramId,
        status: tournamentMembers.paymentStatus,
        respondedAt: tournamentMembers.paymentRespondedAt,
      })
      .from(tournamentMembers)
      .innerJoin(users, eq(users.id, tournamentMembers.userId))
      .orderBy(asc(tournamentMembers.joinedAt)),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-extrabold text-ink">{t.nav.admin}</h1>

      <AdminTools />

      <AdminPollResults data={pollBreakdown} />

      <AdminTournamentPayments
        members={paymentMembers.map((member) => ({
          userId: member.userId,
          name: member.name ?? t.poll.adminNoVotes,
          phone: member.phone,
          telegramUsername: member.telegramUsername,
          hasTelegram: Boolean(member.telegramId),
          status: member.status,
          respondedAt: member.respondedAt,
        }))}
      />

      <section className="space-y-3">
        <h2 className="section-label">{t.nav.fixtures}</h2>
        <AdminMatchEditor matches={allMatches} />
      </section>
    </div>
  );
}
