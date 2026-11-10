import { z } from "zod";
import type { CompanyType, CompanyVerification } from "@prisma/client";
import { prisma } from "../db";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "../audit";
import { requireActor, requirePermission, type Actor } from "../rbac";
import { checkbox, enumOf, optStr, parse, reqStr } from "../validation";
import { companyMemberIds, notify, notifyStaff } from "./notifications";

export const COMPANY_TYPES = ["DATA_CENTRE", "CLOUD_PROVIDER", "AI_STARTUP", "ENTERPRISE", "SYSTEM_INTEGRATOR", "RESELLER", "RESEARCH_INSTITUTION", "OTHER"] as const;

const companySchema = z.object({
  legalName: reqStr(200, 2),
  displayName: reqStr(120, 2),
  registrationNumber: z.string().trim().regex(/^[0-9A-Za-z\-]{6,20}$/, "validation.registrationNumber"),
  companyType: enumOf([...COMPANY_TYPES]),
  address: reqStr(300, 5),
  locationId: reqStr(50),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\/[^\s]+$/.test(v), "validation.url"),
  foreignInvested: checkbox,
  contactName: optStr(120),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v ? v.toLowerCase() : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "validation.email"),
  contactPhone: optStr(40),
});

/** Generates a unique alias such as VN-S-1024 (seller side) or VN-B-2048 (buyer side). */
export async function generateAlias(side: "S" | "B", db: Pick<typeof prisma, "company"> = prisma) {
  for (let i = 0; i < 20; i++) {
    const n = 1000 + Math.floor(Math.random() * 9000);
    const alias = `VN-${side}-${n}`;
    if (!(await db.company.findUnique({ where: { alias } }))) return alias;
  }
  return `VN-${side}-${Date.now().toString().slice(-6)}`;
}

/** Returns the company the user belongs to (MVP: one company per user). */
export async function getMyCompany(actor: Actor) {
  const a = requireActor(actor);
  const m = await prisma.companyMembership.findFirst({
    where: { userId: a.id, authorizationStatus: { not: "REVOKED" } },
    include: { company: { include: { location: true, documents: { where: { retentionStatus: "ACTIVE" }, orderBy: { uploadedAt: "desc" } } } } },
    orderBy: { createdAt: "asc" },
  });
  return m ? { ...m.company, membership: { roleInCompany: m.roleInCompany, authorizationStatus: m.authorizationStatus } } : null;
}

export async function requireMyCompanyId(actor: Actor): Promise<string> {
  const c = await getMyCompany(actor);
  if (!c) throw new AppError("POLICY", "errors.companyRequired");
  return c.id;
}

export async function saveMyCompany(actor: Actor, input: unknown) {
  const a = requireActor(actor);
  const d = parse(companySchema, input);
  const loc = await prisma.location.findUnique({ where: { id: d.locationId } });
  if (!loc) throw new AppError("VALIDATION", "errors.validation", { locationId: "validation.choose" });
  const existing = await getMyCompany(a);
  const data = { ...d, companyType: d.companyType as CompanyType };
  if (!existing) {
    const alias = await generateAlias(a.role === "SELLER" ? "S" : "B");
    const company = await prisma.company.create({
      data: { ...data, alias, verificationStatus: "PENDING", memberships: { create: { userId: a.id, roleInCompany: "Owner", authorizationStatus: "PENDING" } } },
    });
    await audit(a, "COMPANY_CREATED", "Company", company.id);
    await notifyStaff("notif.companyPending", { company: company.alias }, `/admin/companies`, { adminsOnly: true });
    return company;
  }
  // Changing identifying details after verification sends the company back for review.
  const identityChanged = existing.legalName !== d.legalName || existing.registrationNumber !== d.registrationNumber;
  const reverify = identityChanged && existing.verificationStatus === "VERIFIED";
  const company = await prisma.company.update({
    where: { id: existing.id },
    data: { ...data, ...(reverify ? { verificationStatus: "PENDING" as CompanyVerification } : {}) },
  });
  await audit(a, "COMPANY_UPDATED", "Company", company.id, { metadata: { reverify } });
  return company;
}

// ── Admin ──

export async function listCompanies(actor: Actor, status?: CompanyVerification) {
  requirePermission(actor, "admin:companies");
  return prisma.company.findMany({
    where: status ? { verificationStatus: status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      location: true,
      memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
      documents: { where: { retentionStatus: "ACTIVE" } },
      _count: { select: { listings: true } },
    },
  });
}

export async function setCompanyVerification(actor: Actor, companyId: string, input: unknown) {
  const a = requirePermission(actor, "admin:companies");
  const d = parse(
    z.object({ status: enumOf(["PENDING", "NEEDS_INFO", "VERIFIED", "REJECTED"]), note: optStr(1000), authorizeMembers: checkbox }),
    input,
  );
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw notFound();
  if ((d.status === "REJECTED" || d.status === "NEEDS_INFO") && !d.note) {
    throw new AppError("VALIDATION", "errors.validation", { note: "validation.reasonRequired" });
  }
  await prisma.$transaction(async (tx) => {
    await tx.company.update({ where: { id: companyId }, data: { verificationStatus: d.status as CompanyVerification, verificationNote: d.note } });
    if (d.status === "VERIFIED" && d.authorizeMembers) {
      await tx.companyMembership.updateMany({ where: { companyId, authorizationStatus: "PENDING" }, data: { authorizationStatus: "AUTHORIZED" } });
    }
    await audit(a, "COMPANY_VERIFICATION_SET", "Company", companyId, { reason: d.note, metadata: { from: company.verificationStatus, to: d.status } }, tx);
  });
  await notify(await companyMemberIds(companyId), "notif.companyStatus", { company: company.alias, status: d.status }, "/dashboard/company");
}

export async function assertCompanyMember(actor: Actor, companyId: string) {
  const a = requireActor(actor);
  const m = await prisma.companyMembership.findUnique({ where: { userId_companyId: { userId: a.id, companyId } } });
  if (!m || m.authorizationStatus === "REVOKED") throw forbidden();
  return m;
}
