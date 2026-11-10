import { z } from "zod";
import type { CheckType, Manufacturer, ServiceStatus } from "@prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { audit } from "../audit";
import { requirePermission, type Actor } from "../rbac";
import { SETTING_DEFAULTS, type SettingKey } from "../settings";
import { checkbox, enumOf, intIn, optStr, parse, reqStr } from "../validation";


// ───────────────────── Overview ─────────────────────

export async function adminOverview(actor: Actor) {
  const a = requirePermission(actor, "review:access");
  const mine = a.role === "REVIEWER" ? { assignedReviewerId: a.id } : a.role === "BROKER" ? { OR: [{ assignedReviewerId: a.id }, { brokerId: a.id }] } : {};
  const myCases = a.role === "ADMIN" ? {} : { brokerId: a.id };
  const now = new Date();
  const [introsPending, feesOverdue, feesDue, commissionsDue, upcomingInspections, disputes, newCases] = await Promise.all([
    prisma.introduction.count({ where: { status: "PENDING_REVIEW", ...(a.role === "ADMIN" ? {} : { brokerId: a.id }) } }),
    a.role === "ADMIN" ? prisma.listingFee.count({ where: { status: "OVERDUE" } }) : Promise.resolve(0),
    a.role === "ADMIN" ? prisma.listingFee.count({ where: { status: "DUE" } }) : Promise.resolve(0),
    prisma.transaction.count({ where: { commissionStatus: { in: ["DUE", "OVERDUE"] }, ...myCases } }),
    prisma.inspection.count({ where: { scheduledAt: { gte: now }, outcome: "SCHEDULED", ...myCases } }),
    prisma.transaction.count({ where: { disputeStatus: "OPEN", ...myCases } }),
    prisma.enquiry.count({ where: { status: { in: ["NEW", "BUYER_VERIFICATION_REQUIRED"] }, ...myCases } }),
  ]);
  const [pendingCompanies, underReview, needsInfo, onHold, published, escalated, swaps, requests, enquiries, reports, contacts, partners, pendingDocs] = await Promise.all([
    prisma.company.count({ where: { verificationStatus: "PENDING" } }),
    prisma.listing.count({ where: { publicationStatus: "UNDER_REVIEW", ...mine } }),
    prisma.listing.count({ where: { publicationStatus: "NEEDS_INFO", ...mine } }),
    prisma.listing.count({ where: { publicationStatus: "ON_HOLD", ...mine } }),
    prisma.listing.count({ where: { publicationStatus: "PUBLISHED" } }),
    prisma.listing.count({ where: { escalated: true, ...mine } }),
    prisma.swapProposal.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.buyerRequest.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
    prisma.enquiry.count({ where: { status: { notIn: ["CLOSED", "CANCELLED"] }, ...myCases } }),
    prisma.contactSubmission.count({ where: { type: "REPORT_LISTING", status: { in: ["NEW", "IN_PROGRESS"] } } }),
    prisma.contactSubmission.count({ where: { type: { not: "REPORT_LISTING" }, status: "NEW" } }),
    prisma.partnerEnquiry.count({ where: { status: "NEW" } }),
    prisma.document.count({ where: { reviewStatus: "PENDING", retentionStatus: "ACTIVE", ...(a.role === "REVIEWER" ? { listing: mine } : {}) } }),
  ]);
  return {
    newCases, enquiries, introsPending, upcomingInspections, commissionsDue, disputes, feesDue, feesOverdue,
    pendingCompanies, underReview, needsInfo, onHold, published, escalated, swaps, requests, reports, contacts, partners, pendingDocs,
  };
}

// ───────────────────── Audit log ─────────────────────

export async function listAudit(actor: Actor, opts: { resourceType?: string; take?: number } = {}) {
  requirePermission(actor, "admin:audit");
  return prisma.auditEvent.findMany({
    where: opts.resourceType ? { resourceType: opts.resourceType } : {},
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 200,
    include: { actor: { select: { name: true, role: true } } },
  });
}

// ───────────────────── Catalogue ─────────────────────

export async function getCatalog() {
  const [categories, models, locations] = await Promise.all([
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.gpuModel.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.location.findMany({ orderBy: [{ sortOrder: "asc" }, { nameVi: "asc" }] }),
  ]);
  return { categories, models, locations };
}

export async function getActiveCatalog() {
  const [categories, models, locations] = await Promise.all([
    prisma.category.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.gpuModel.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.location.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { nameVi: "asc" }] }),
  ]);
  return { categories, models, locations };
}

const slug = z.string().trim().regex(/^[a-z0-9-]{2,50}$/, "validation.slug");

export async function upsertCategory(actor: Actor, id: string | null, input: unknown) {
  const a = requirePermission(actor, "admin:catalog");
  const d = parse(z.object({ slug, nameVi: reqStr(120), nameEn: reqStr(120), sortOrder: intIn(0, 999), active: checkbox }), input);
  const row = id ? await prisma.category.update({ where: { id }, data: d }) : await prisma.category.create({ data: d });
  await audit(a, id ? "CATEGORY_UPDATED" : "CATEGORY_CREATED", "Category", row.id, { metadata: d });
}

export async function upsertGpuModel(actor: Actor, id: string | null, input: unknown) {
  const a = requirePermission(actor, "admin:catalog");
  const d = parse(
    z.object({
      name: reqStr(120),
      manufacturer: enumOf(["NVIDIA", "AMD", "INTEL", "SERVER_MANUFACTURER", "OTHER"]),
      memoryGb: z.union([z.literal(""), intIn(1, 4096)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
      exportReviewFlag: checkbox,
      sortOrder: intIn(0, 999),
      active: checkbox,
    }),
    input,
  );
  const data = { ...d, manufacturer: d.manufacturer as Manufacturer };
  const row = id ? await prisma.gpuModel.update({ where: { id }, data }) : await prisma.gpuModel.create({ data });
  await audit(a, id ? "GPU_MODEL_UPDATED" : "GPU_MODEL_CREATED", "GpuModel", row.id, { metadata: d });
}

export async function upsertLocation(actor: Actor, id: string | null, input: unknown) {
  const a = requirePermission(actor, "admin:catalog");
  const d = parse(z.object({ code: slug, nameVi: reqStr(120), nameEn: reqStr(120), sortOrder: intIn(0, 999), active: checkbox }), input);
  const row = id ? await prisma.location.update({ where: { id }, data: d }) : await prisma.location.create({ data: d });
  await audit(a, id ? "LOCATION_UPDATED" : "LOCATION_CREATED", "Location", row.id, { metadata: d });
}

// ───────────────────── Services, badges, pages, settings ─────────────────────

export const listServices = () => prisma.service.findMany({ orderBy: { sortOrder: "asc" } });
export const listBadgeDefinitions = () => prisma.badgeDefinition.findMany({ orderBy: { sortOrder: "asc" } });

export async function updateService(actor: Actor, id: string, input: unknown) {
  const a = requirePermission(actor, "admin:content");
  const d = parse(
    z.object({
      status: enumOf(["AVAILABLE", "AVAILABLE_THROUGH_PARTNER", "COMING_SOON", "CONTACT_US"]),
      nameVi: reqStr(200),
      nameEn: reqStr(200),
      descriptionVi: reqStr(2000),
      descriptionEn: reqStr(2000),
      certificationNote: optStr(500),
      certificationEvidenceRef: optStr(500),
    }),
    input,
  );
  // A certification claim needs an evidence reference recorded by an administrator.
  if (d.certificationNote && !d.certificationEvidenceRef) {
    throw new AppError("VALIDATION", "errors.validation", { certificationEvidenceRef: "validation.evidenceRequired" });
  }
  const before = await prisma.service.findUnique({ where: { id } });
  if (!before) throw notFound();
  await prisma.service.update({ where: { id }, data: { ...d, status: d.status as ServiceStatus } });
  await audit(a, "SERVICE_UPDATED", "Service", id, { metadata: { from: before.status, to: d.status, certified: !!d.certificationNote } });
}

export async function updateBadgeDefinition(actor: Actor, checkType: string, input: unknown) {
  const a = requirePermission(actor, "admin:content");
  const d = parse(
    z.object({ nameVi: reqStr(120), nameEn: reqStr(120), meaningVi: reqStr(1000), meaningEn: reqStr(1000), notMeaningVi: reqStr(1000), notMeaningEn: reqStr(1000) }),
    input,
  );
  await prisma.badgeDefinition.update({ where: { checkType: checkType as CheckType }, data: d });
  await audit(a, "BADGE_DEFINITION_UPDATED", "BadgeDefinition", checkType);
}

export const getContentPage = (slugValue: string) => prisma.contentPage.findUnique({ where: { slug: slugValue } });
export const listContentPages = () => prisma.contentPage.findMany({ orderBy: { slug: "asc" } });

export async function updateContentPage(actor: Actor, slugValue: string, input: unknown) {
  const a = requirePermission(actor, "admin:content");
  const d = parse(z.object({ titleVi: reqStr(200), titleEn: reqStr(200), bodyVi: reqStr(50000), bodyEn: reqStr(50000), isLegalDraft: checkbox }), input);
  await prisma.contentPage.update({ where: { slug: slugValue }, data: { ...d, updatedById: a.id } });
  await audit(a, "CONTENT_PAGE_UPDATED", "ContentPage", slugValue, { metadata: { isLegalDraft: d.isLegalDraft } });
}

export async function updateSettings(actor: Actor, input: Record<string, string>) {
  const a = requirePermission(actor, "admin:content");
  const changes: Record<string, string> = {};
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    if (!(key in input)) continue;
    const value = String(input[key] ?? "").trim().slice(0, 500);
    if (key.startsWith("policy.") && ["policy.holdOnUnknownAnswers", "policy.requireExportReviewForFlaggedModels"].includes(key) && !["true", "false"].includes(value)) {
      throw new AppError("VALIDATION", "errors.validation", { [key]: "validation.choose" });
    }
    if (key === "fx.usdVndRate" && value && !(Number(value) > 0)) throw new AppError("VALIDATION", "errors.validation", { [key]: "validation.number" });
    changes[key] = value;
  }
  // FX: all three fields together, or none.
  const merged = { ...changes };
  const fx = ["fx.usdVndRate", "fx.rateDate", "fx.source"].map((k) => merged[k]);
  if (fx.some(Boolean) && !fx.every(Boolean)) throw new AppError("VALIDATION", "errors.validation", { "fx.source": "validation.fxIncomplete" });
  for (const [key, value] of Object.entries(changes)) {
    await prisma.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  }
  await audit(a, "SETTINGS_UPDATED", "SiteSetting", null, { metadata: changes });
}
