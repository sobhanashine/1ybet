import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGroup, isGroupMember } from "@/lib/groups";
import { getGroupLeaderboard } from "@/lib/leaderboard";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const groupId = Number(id);
  const user = await getCurrentUser();
  if (!user) return null;

  const group = await getGroup(groupId);
  if (!group) notFound();

  const member = await isGroupMember(groupId, user.id);
  if (!member) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-bold">{group.name}</h1>
        <p className="text-sm text-muted">شما عضو این گروه نیستید.</p>
        <Link href="/groups" className="text-sm text-pitch-600">
          {t.common.back}
        </Link>
      </div>
    );
  }

  const rows = await getGroupLeaderboard(groupId, { kind: "total" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{group.name}</h1>
        <div className="rounded-lg bg-gold/10 px-3 py-1 text-sm">
          <span className="text-muted">{t.groups.inviteCode}: </span>
          <span dir="ltr" className="font-bold tracking-widest">
            {group.inviteCode}
          </span>
        </div>
      </div>

      <ol className="space-y-2">
        {rows.map((r, i) => {
          const me = r.userId === user.id;
          return (
            <li
              key={r.userId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${
                me ? "bg-pitch-100 ring-1 ring-pitch-200" : "bg-white ring-1 ring-black/5"
              }`}
            >
              <span
                className={`w-7 text-center text-sm font-bold ${
                  i < 3 ? "text-gold" : "text-muted"
                }`}
              >
                {toPersianDigits(i + 1)}
              </span>
              <span className="flex-1 truncate text-sm font-medium">
                {r.displayName}
                {me && <span className="mr-1 text-xs text-pitch-600"> (شما)</span>}
              </span>
              <span className="text-sm font-bold text-pitch-700">
                {toPersianDigits(r.points)}
              </span>
              {!me && (
                <Link
                  href={`/h2h?a=${user.id}&b=${r.userId}`}
                  className="rounded-lg bg-pitch-50 px-2 py-1 text-xs text-pitch-600 ring-1 ring-pitch-200"
                >
                  {t.groups.compare}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
