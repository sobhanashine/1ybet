import { redirect } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { matches } from "@/lib/db/schema";
import { getCurrentUser } from "@/lib/auth";
import AdminTools from "@/components/AdminTools";
import AdminMatchEditor from "@/components/AdminMatchEditor";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/");

  const allMatches = await db
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
    .orderBy(desc(matches.kickoffAt));

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">{t.nav.admin}</h1>

      <AdminTools />

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-pitch-600">{t.nav.fixtures}</h2>
        <AdminMatchEditor matches={allMatches} />
      </section>
    </div>
  );
}
