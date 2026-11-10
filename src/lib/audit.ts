import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { Actor } from "./rbac";

const SECRET_KEYS = /pass|token|secret|hash|serial/i;

function scrub(meta?: Record<string, unknown>): Prisma.InputJsonValue | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SECRET_KEYS.test(k)) continue;
    out[k] = typeof v === "bigint" ? v.toString() : v;
  }
  return out as Prisma.InputJsonValue;
}

export async function audit(
  actor: Actor,
  action: string,
  resourceType: string,
  resourceId: string | null,
  opts: { reason?: string | null; metadata?: Record<string, unknown> } = {},
  tx: Prisma.TransactionClient = prisma,
) {
  await tx.auditEvent.create({
    data: {
      actorId: actor?.id ?? null,
      action,
      resourceType,
      resourceId,
      reason: opts.reason ?? null,
      metadata: scrub(opts.metadata),
    },
  });
}
