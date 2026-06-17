import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/groups";
import GroupForms from "@/components/GroupForms";
import { t } from "@/lib/i18n";
import { toPersianDigits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const myGroups = await getUserGroups(user.id);

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold">{t.groups.title}</h1>

      <GroupForms />

      <section className="space-y-2">
        <h2 className="text-sm font-bold text-pitch-600">{t.groups.myGroups}</h2>
        {myGroups.length === 0 ? (
          <p className="text-sm text-muted">{t.groups.empty}</p>
        ) : (
          myGroups.map((g) => (
            <Link
              key={g.id}
              href={`/groups/${g.id}`}
              className="flex items-center justify-between rounded-xl bg-surface px-4 py-3 ring-1 ring-white/10"
            >
              <span className="font-medium">{g.name}</span>
              <span className="text-xs text-muted">
                {toPersianDigits(g.memberCount)} {t.groups.members}
              </span>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}
