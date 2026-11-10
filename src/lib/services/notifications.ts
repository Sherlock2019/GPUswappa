import { prisma } from "../db";
import type { Actor } from "../rbac";
import { requireActor } from "../rbac";

/** Notifications store an i18n key + JSON params so each user sees them in their own language. */
export async function notify(userIds: string[], key: string, params: Record<string, string> = {}, link?: string) {
  const unique = [...new Set(userIds)];
  if (unique.length === 0) return;
  await prisma.notification.createMany({
    data: unique.map((userId) => ({ userId, title: key, body: JSON.stringify(params), link: link ?? null })),
  });
}

export async function notifyStaff(key: string, params: Record<string, string> = {}, link?: string, opts: { adminsOnly?: boolean } = {}) {
  const staff = await prisma.user.findMany({
    where: { status: "ACTIVE", role: opts.adminsOnly ? "ADMIN" : { in: ["ADMIN", "REVIEWER"] } },
    select: { id: true },
  });
  await notify(staff.map((s) => s.id), key, params, link);
}

export async function companyMemberIds(companyId: string) {
  const m = await prisma.companyMembership.findMany({ where: { companyId, authorizationStatus: { not: "REVOKED" } }, select: { userId: true } });
  return m.map((x) => x.userId);
}

export async function listNotifications(actor: Actor) {
  const a = requireActor(actor);
  return prisma.notification.findMany({ where: { userId: a.id }, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function markAllRead(actor: Actor) {
  const a = requireActor(actor);
  await prisma.notification.updateMany({ where: { userId: a.id, readAt: null }, data: { readAt: new Date() } });
}

export async function unreadCount(actor: Actor) {
  if (!actor) return 0;
  return prisma.notification.count({ where: { userId: actor.id, readAt: null } });
}
