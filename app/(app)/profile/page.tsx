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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-line-strong bg-surface-2 text-2xl">
          👤
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-extrabold text-ink">{user.displayName}</h1>
          {user.country && (
            <p className="text-sm text-muted" dir="ltr">
              {user.country}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4 text-center">
          <p className="text-3xl font-black text-pitch-700 tnum">
            {toPersianDigits(total)}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">{t.profile.totalPoints}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-3xl font-black text-gold tnum">
            {toPersianDigits(user.bestStreak)}
          </p>
          <p className="mt-1 text-xs font-semibold text-muted">{t.profile.bestStreak}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="section-label">{t.profile.badges}</h2>
        {earned.length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-sm text-muted">{t.leaderboard.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {earned.map((b) => (
              <div
                key={b.code}
                className="card flex flex-col items-center gap-1.5 p-3 text-center"
                title={b.descFa}
              >
                <span className="text-2xl">{b.icon}</span>
                <span className="text-[11px] font-semibold leading-tight text-ink-dim">
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
