import { getCurrentUser } from "@/lib/auth";
import { getUserTotalPoints, getUserBadges } from "@/lib/profile";
import NotificationToggle from "@/components/NotificationToggle";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [total, earned] = await Promise.all([
    getUserTotalPoints(user.id),
    getUserBadges(user.id),
  ]);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-pitch-100 text-2xl">
          👤
        </div>
        <div>
          <h1 className="text-lg font-bold">{user.displayName}</h1>
          {user.country && (
            <p className="text-sm text-muted" dir="ltr">
              {user.country}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-black/5">
          <p className="text-2xl font-bold text-pitch-600">
            {toPersianDigits(total)}
          </p>
          <p className="text-xs text-muted">{t.profile.totalPoints}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center ring-1 ring-black/5">
          <p className="text-2xl font-bold text-gold">
            {toPersianDigits(user.bestStreak)}
          </p>
          <p className="text-xs text-muted">{t.profile.bestStreak}</p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-pitch-600">{t.profile.badges}</h2>
        {earned.length === 0 ? (
          <p className="text-sm text-muted">{t.leaderboard.empty}</p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {earned.map((b) => (
              <div
                key={b.code}
                className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center ring-1 ring-black/5"
                title={b.descFa}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[11px] leading-tight text-muted">
                  {b.titleFa}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <NotificationToggle hasEmail={!!user.email} />
    </div>
  );
}
