import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import BottomNav from "@/components/BottomNav";
import StickyWidget from "@/components/StickyWidget";
import GuideVideoPopup from "@/components/GuideVideoPopup";
import TournamentResultsPopup from "@/components/TournamentResultsPopup";
import { getStartMatch, getTournamentLeaderboard, isMember } from "@/lib/tournament";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.displayName) redirect("/onboarding");

  const [startMatch, member] = await Promise.all([getStartMatch(), isMember(user.id)]);
  const winner = startMatch
    ? (await getTournamentLeaderboard(startMatch.kickoffAt))[0] ?? null
    : null;
  const initialHasEmail = !!user.email;

  return (
    <div className="mx-auto flex min-h-full w-full max-w-md flex-1 flex-col">
      {/* No header — navigation lives in the bottom glass nav. Top padding
          respects the device safe area so content clears the status bar/notch. */}
      <main className="flex-1 px-4 pb-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
        {children}
      </main>

      <StickyWidget initialHasEmail={initialHasEmail} />

      <GuideVideoPopup />

      <TournamentResultsPopup
        winnerName={winner?.displayName ?? null}
        isTournamentMember={member}
      />

      <BottomNav />
    </div>
  );
}
