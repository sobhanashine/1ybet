"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { groups, groupMembers } from "@/lib/db/schema";
import { getSession } from "@/lib/auth";
import { t } from "@/lib/i18n";

export type GroupResult = { ok: boolean; error?: string; groupId?: number };

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createGroup(name: string): Promise<GroupResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  const trimmed = name.trim();
  if (trimmed.length < 2) return { ok: false, error: t.groups.nameLabel };

  // retry on rare invite-code collision
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [group] = await db
        .insert(groups)
        .values({ name: trimmed, inviteCode: genCode(), ownerId: session.uid })
        .returning();
      await db
        .insert(groupMembers)
        .values({ groupId: group.id, userId: session.uid })
        .onConflictDoNothing();
      revalidatePath("/groups");
      return { ok: true, groupId: group.id };
    } catch {
      // likely unique violation on invite_code — try again
    }
  }
  return { ok: false, error: t.common.error };
}

export async function joinGroup(code: string): Promise<GroupResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: t.common.error };

  const normalized = code.trim().toUpperCase();
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.inviteCode, normalized))
    .limit(1);
  if (!group) return { ok: false, error: "کد دعوت معتبر نیست" };

  await db
    .insert(groupMembers)
    .values({ groupId: group.id, userId: session.uid })
    .onConflictDoNothing();

  revalidatePath("/groups");
  revalidatePath(`/groups/${group.id}`);
  return { ok: true, groupId: group.id };
}
