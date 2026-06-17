import "server-only";
import { eq, sql, and } from "drizzle-orm";
import { db } from "./db";
import { groups, groupMembers, users } from "./db/schema";

export type GroupSummary = {
  id: number;
  name: string;
  inviteCode: string;
  ownerId: number;
  memberCount: number;
};

export async function getUserGroups(userId: number): Promise<GroupSummary[]> {
  const rows = await db
    .select({
      id: groups.id,
      name: groups.name,
      inviteCode: groups.inviteCode,
      ownerId: groups.ownerId,
      memberCount: sql<number>`(select count(*) from ${groupMembers} gm where gm.group_id = ${groups.id})::int`,
    })
    .from(groups)
    .innerJoin(
      groupMembers,
      and(eq(groupMembers.groupId, groups.id), eq(groupMembers.userId, userId)),
    )
    .orderBy(groups.createdAt);
  return rows;
}

export async function getGroup(groupId: number) {
  const [group] = await db
    .select()
    .from(groups)
    .where(eq(groups.id, groupId))
    .limit(1);
  return group ?? null;
}

export async function isGroupMember(
  groupId: number,
  userId: number,
): Promise<boolean> {
  const [row] = await db
    .select({ userId: groupMembers.userId })
    .from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.userId, userId)))
    .limit(1);
  return !!row;
}

export async function getGroupMembers(groupId: number) {
  return db
    .select({
      id: users.id,
      displayName: users.displayName,
      country: users.country,
    })
    .from(groupMembers)
    .innerJoin(users, eq(users.id, groupMembers.userId))
    .where(eq(groupMembers.groupId, groupId));
}
