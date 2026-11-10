import { z } from "zod";
import type { CheckType, Listing, Prisma, PublicationStatus } from "@prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { audit } from "../audit";
import { requireActor, requirePermission, type Actor } from "../rbac";
import { getSettings, publicSellerFields, type PublicDisclosureField } from "../settings";
import { ALL_CHECKS, computeReviewFlags, statusOnSubmit } from "../policy";
import { publicBadges } from "../badges";
import { intIn, optEnum, optStr, parse, str, vnd, checkbox } from "../validation";
import { assertCompanyMember, requireMyCompanyId } from "./companies";
import { notifyStaff } from "./notifications";

export const EDITABLE_STATUSES: PublicationStatus[] = ["DRAFT", "NEEDS_INFO", "ON_HOLD"];
export const SUBMITTABLE_STATUSES: PublicationStatus[] = ["DRAFT", "NEEDS_INFO", "ON_HOLD"];
/** Categories where a GPU model and GPU quantity are required. */
export const GPU_CATEGORIES = ["gpu-cards", "gpu-servers", "gpu-workstations", "gpu-clusters"];
export const WIZARD_STEPS = 10;

// ───────────────────── Access helpers ─────────────────────

async function loadOwnListing(actor: Actor, id: string) {
  const a = requireActor(actor);
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) throw notFound();
  await assertCompanyMember(a, listing.sellerCompanyId);
  return { a, listing };
}

export async function canViewPrivateListing(actor: Actor, listing: Pick<Listing, "sellerCompanyId" | "assignedReviewerId" | "brokerId">) {
  if (!actor || actor.status !== "ACTIVE") return false;
  if (actor.role === "ADMIN") return true;
  if (actor.role === "REVIEWER") return listing.assignedReviewerId === actor.id;
  if (actor.role === "BROKER") return listing.assignedReviewerId === actor.id || listing.brokerId === actor.id;
  const m = await prisma.companyMembership.findUnique({ where: { userId_companyId: { userId: actor.id, companyId: listing.sellerCompanyId } } });
  return !!m && m.authorizationStatus !== "REVOKED";
}

// ───────────────────── Draft lifecycle ─────────────────────

export async function createDraft(actor: Actor) {
  const a = requirePermission(actor, "listing:create");
  const companyId = await requireMyCompanyId(a);
  const listing = await prisma.listing.create({ data: { sellerCompanyId: companyId, createdById: a.id } });
  await audit(a, "LISTING_DRAFT_CREATED", "Listing", listing.id);
  return listing;
}

const STEP_SCHEMAS: Record<number, z.ZodTypeAny> = {
  1: z.object({ contentLanguage: z.enum(["vi", "en"]).default("vi") }),
  2: z.object({
    title: str(140),
    categoryId: optStr(50),
    manufacturer: optEnum(["NVIDIA", "AMD", "INTEL", "SERVER_MANUFACTURER", "OTHER"]),
    gpuModelId: optStr(50),
    gpuModelOther: optStr(120),
    gpuQuantity: z.union([z.literal(""), intIn(0, 100000)]).optional().transform((v) => (v === "" || v === undefined ? 0 : v)),
    gpuMemory: optStr(60),
    description: str(5000),
  }),
  3: z.object({
    serverManufacturer: optStr(120),
    serverModel: optStr(120),
    cpu: optStr(200),
    systemRam: optStr(120),
    storage: optStr(200),
    networking: optStr(300),
    powerRequirements: optStr(200),
    coolingRequirements: optStr(200),
    serialNumbers: optStr(2000),
  }),
  4: z.object({
    condition: optEnum(["NEW", "UNUSED", "USED", "REFURBISHED"]),
    hasKnownFaults: optEnum(["YES", "NO", "UNKNOWN"]),
    knownDefects: optStr(2000),
    usageDetails: optStr(2000),
    equipmentAge: optStr(120),
    warrantyStatus: optEnum(["MANUFACTURER", "SELLER", "NONE", "UNKNOWN"]),
    warrantyDetails: optStr(1000),
  }),
  5: z.object({
    locationId: optStr(50),
    inVietnam: optEnum(["YES", "NO", "UNKNOWN"]),
    transactionType: optEnum(["SALE", "SWAP", "SALE_OR_SWAP"]),
    deliveryOptions: optStr(1000),
    installationOptions: optStr(1000),
  }),
  6: z.object({
    ownership: optEnum(["OWNS", "AUTHORIZED", "NO", "UNKNOWN"]),
    encumbrance: optEnum(["NONE", "LEASED", "FINANCED", "OTHER_RIGHTS", "UNKNOWN"]),
    customsStatus: optEnum(["CLEARED_DOMESTIC", "OTHER_KNOWN", "UNKNOWN"]),
    customsNotes: optStr(2000),
  }),
  9: z.object({ priceVnd: vnd, priceOnRequest: checkbox }),
};

/** Saves one wizard step. Drafts accept partial data; completeness is checked on submit. */
export async function saveDraftStep(actor: Actor, id: string, step: number, input: unknown) {
  const { a, listing } = await loadOwnListing(actor, id);
  if (!EDITABLE_STATUSES.includes(listing.publicationStatus)) throw new AppError("POLICY", "errors.listingNotEditable");
  const schema = STEP_SCHEMAS[step];
  if (!schema) return listing; // steps 7, 8, 10 have no form fields of their own
  const data = parse(schema, input) as Prisma.ListingUncheckedUpdateInput;

  if (step === 2) {
    if (data.categoryId && !(await prisma.category.findFirst({ where: { id: String(data.categoryId), active: true } }))) {
      throw new AppError("VALIDATION", "errors.validation", { categoryId: "validation.choose" });
    }
    if (data.gpuModelId) {
      const m = await prisma.gpuModel.findFirst({ where: { id: String(data.gpuModelId), active: true } });
      if (!m) throw new AppError("VALIDATION", "errors.validation", { gpuModelId: "validation.choose" });
      data.exportReviewRequired = m.exportReviewFlag;
    } else {
      data.exportReviewRequired = false;
    }
  }
  if (step === 5 && data.locationId && !(await prisma.location.findFirst({ where: { id: String(data.locationId), active: true } }))) {
    throw new AppError("VALIDATION", "errors.validation", { locationId: "validation.choose" });
  }
  const updated = await prisma.listing.update({ where: { id }, data });
  await audit(a, "LISTING_DRAFT_SAVED", "Listing", id, { metadata: { step } });
  return updated;
}

type MissingCheckInput = Listing & { category: { slug: string } | null; _count: { images: number }; agreements?: { status: string }[] };

/** Returns i18n keys of required information still missing (shown to the seller). */
export function missingFields(l: MissingCheckInput): { step: number; field: string }[] {
  const m: { step: number; field: string }[] = [];
  const add = (step: number, field: string) => m.push({ step, field });
  if (!l.title || l.title.length < 10) add(2, "title");
  if (!l.categoryId) add(2, "categoryId");
  if (!l.description || l.description.length < 30) add(2, "description");
  const gpuCat = !!l.category && GPU_CATEGORIES.includes(l.category.slug);
  if (gpuCat) {
    if (!l.manufacturer) add(2, "manufacturer");
    if (!l.gpuModelId && !l.gpuModelOther) add(2, "gpuModelId");
    if (!l.gpuQuantity || l.gpuQuantity < 1) add(2, "gpuQuantity");
  }
  if (!l.condition) add(4, "condition");
  if (!l.hasKnownFaults) add(4, "hasKnownFaults");
  if (l.hasKnownFaults === "YES" && !l.knownDefects) add(4, "knownDefects");
  if (!l.warrantyStatus) add(4, "warrantyStatus");
  if (!l.locationId) add(5, "locationId");
  if (!l.inVietnam) add(5, "inVietnam");
  if (!l.transactionType) add(5, "transactionType");
  if (!l.ownership) add(6, "ownership");
  if (!l.encumbrance) add(6, "encumbrance");
  if (!l.customsStatus) add(6, "customsStatus");
  if (l._count.images < 1) add(8, "photos");
  if (!l.priceOnRequest && !l.priceVnd && l.transactionType !== "SWAP") add(9, "priceVnd");
  if (!l.agreements?.some((a) => a.status === "ACCEPTED" || a.status === "ACTIVE")) add(10, "brokerageTerms");
  return m;
}

export async function getOwnListingForEdit(actor: Actor, id: string) {
  const { listing } = await loadOwnListing(actor, id);
  const full = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: {
      category: true,
      gpuModel: true,
      location: true,
      sellerCompany: true,
      images: { orderBy: { sortOrder: "asc" } },
      documents: { where: { retentionStatus: "ACTIVE" }, orderBy: { uploadedAt: "desc" } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      checks: true,
      agreements: { orderBy: { createdAt: "desc" } },
      fees: { orderBy: { periodStart: "desc" } },
      _count: { select: { images: true } },
    },
  });
  return { listing: full, missing: missingFields(full) };
}

export async function submitListing(actor: Actor, id: string) {
  const { a, listing } = await loadOwnListing(actor, id);
  if (!SUBMITTABLE_STATUSES.includes(listing.publicationStatus)) throw new AppError("POLICY", "errors.listingNotSubmittable");
  const full = await prisma.listing.findUniqueOrThrow({
    where: { id },
    include: { category: true, gpuModel: true, agreements: { select: { status: true } }, _count: { select: { images: true } } },
  });
  const missing = missingFields(full);
  if (missing.length) throw new AppError("VALIDATION", "errors.listingIncomplete", undefined, missing.map((x) => x.field));

  const settings = await getSettings();
  const exportReviewRequired = !!full.gpuModel?.exportReviewFlag;
  const flags = computeReviewFlags({ ...full, exportReviewRequired });
  const status = statusOnSubmit(flags, settings);

  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id },
      data: { publicationStatus: status, reviewFlags: flags, exportReviewRequired, submittedAt: new Date(), reviewStatus: full.reviewStatus === "COMPLETED" ? "IN_PROGRESS" : full.reviewStatus },
    });
    // Create one review check row per check type (idempotent).
    const existing = await tx.reviewCheck.findMany({ where: { listingId: id }, select: { checkType: true } });
    const have = new Set(existing.map((e) => e.checkType));
    const toCreate = ALL_CHECKS.filter((c) => !have.has(c)).map((checkType: CheckType) => ({ listingId: id, checkType }));
    if (toCreate.length) await tx.reviewCheck.createMany({ data: toCreate });
    await audit(a, "LISTING_SUBMITTED", "Listing", id, { metadata: { status, flags } }, tx);
  });
  await notifyStaff("notif.listingSubmitted", { title: full.title }, `/admin/listings/${id}`);
  return { status, flags };
}

export async function archiveOwnListing(actor: Actor, id: string) {
  const { a, listing } = await loadOwnListing(actor, id);
  if (listing.publicationStatus === "ARCHIVED") return;
  await prisma.listing.update({ where: { id }, data: { publicationStatus: "ARCHIVED" } });
  await audit(a, "LISTING_ARCHIVED_BY_SELLER", "Listing", id);
}

export async function replyToReview(actor: Actor, id: string, body: string) {
  const { a } = await loadOwnListing(actor, id);
  const text = parse(z.string().trim().min(2, "validation.required").max(4000, "validation.tooLong"), body);
  await prisma.reviewMessage.create({ data: { listingId: id, authorId: a.id, fromStaff: false, body: text } });
  await audit(a, "REVIEW_MESSAGE_SELLER", "Listing", id);
  await notifyStaff("notif.sellerReplied", { id }, `/admin/listings/${id}`);
}

export async function listMyListings(actor: Actor) {
  const a = requireActor(actor);
  const companyIds = (await prisma.companyMembership.findMany({ where: { userId: a.id, authorizationStatus: { not: "REVOKED" } }, select: { companyId: true } })).map((m) => m.companyId);
  return prisma.listing.findMany({
    where: { sellerCompanyId: { in: companyIds } },
    orderBy: { updatedAt: "desc" },
    include: { gpuModel: true, category: true, _count: { select: { enquiries: true, images: true } } },
  });
}

// ───────────────────── Public view (strict whitelist) ─────────────────────

const publicInclude = {
  category: true,
  gpuModel: true,
  location: true,
  sellerCompany: {
    select: {
      id: true,
      alias: true,
      legalName: true,
      displayName: true,
      registrationNumber: true,
      address: true,
      website: true,
      companyType: true,
      isDemo: true,
      location: { select: { nameVi: true, nameEn: true } },
    },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
  checks: true,
} satisfies Prisma.ListingInclude;

type ListingWithPublic = Prisma.ListingGetPayload<{ include: typeof publicInclude }>;

/**
 * Seller information that MUST be shown publicly, as configured by an administrator
 * (to be confirmed by Vietnamese counsel). Everything else stays behind the alias.
 */
export function legallyRequiredSellerInfo(c: ListingWithPublic["sellerCompany"], fields: PublicDisclosureField[]) {
  const out: { field: PublicDisclosureField; value: string; valueEn?: string }[] = [];
  for (const f of fields) {
    if (f === "city") {
      if (c.location) out.push({ field: f, value: c.location.nameVi, valueEn: c.location.nameEn });
    } else if (f === "companyType") {
      out.push({ field: f, value: c.companyType });
    } else {
      const v = c[f];
      if (v) out.push({ field: f, value: v });
    }
  }
  return out;
}

/**
 * Builds the public DTO. Only whitelisted fields are copied — seller identity (except
 * configured legally-required fields), contact details, serial numbers, customs notes,
 * review flags, reviewer notes, evidence references and documents never leave the
 * server through this path.
 */
export function toPublicDto(l: ListingWithPublic, opts: { includePendingImages?: boolean; disclosureFields?: PublicDisclosureField[] } = {}) {
  const badges = publicBadges(l, l.checks);
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    contentLanguage: l.contentLanguage,
    category: l.category ? { slug: l.category.slug, nameVi: l.category.nameVi, nameEn: l.category.nameEn } : null,
    manufacturer: l.manufacturer,
    gpuModelName: l.gpuModel?.name ?? l.gpuModelOther ?? null,
    gpuQuantity: l.gpuQuantity,
    gpuMemory: l.gpuMemory ?? (l.gpuModel?.memoryGb ? `${l.gpuModel.memoryGb} GB` : null),
    serverManufacturer: l.serverManufacturer,
    serverModel: l.serverModel,
    cpu: l.cpu,
    systemRam: l.systemRam,
    storage: l.storage,
    networking: l.networking,
    powerRequirements: l.powerRequirements,
    coolingRequirements: l.coolingRequirements,
    condition: l.condition,
    hasKnownFaults: l.hasKnownFaults,
    knownDefects: l.knownDefects,
    usageDetails: l.usageDetails,
    equipmentAge: l.equipmentAge,
    location: l.location ? { code: l.location.code, nameVi: l.location.nameVi, nameEn: l.location.nameEn } : null,
    priceVnd: l.priceVnd === null ? null : Number(l.priceVnd),
    priceOnRequest: l.priceOnRequest,
    priceIllustrative: l.priceIllustrative,
    transactionType: l.transactionType,
    warrantyStatus: l.warrantyStatus,
    warrantyDetails: l.warrantyDetails,
    deliveryOptions: l.deliveryOptions,
    installationOptions: l.installationOptions,
    platformRole: l.platformRole,
    sellerAlias: l.sellerCompany.alias,
    sellerPublicInfo: legallyRequiredSellerInfo(l.sellerCompany, opts.disclosureFields ?? []),
    isDemo: l.isDemo,
    publicationStatus: l.publicationStatus,
    publishedAt: l.publishedAt,
    lastVerifiedAt: badges.length ? new Date(Math.max(...badges.map((b) => b.reviewedAt.getTime()))) : null,
    badges,
    images: l.images
      .filter((i) => i.approvalStatus === "APPROVED" || (opts.includePendingImages && i.approvalStatus === "PENDING"))
      .map((i) => ({ id: i.id, altText: i.altText, isIllustrative: i.isIllustrative, credit: i.credit, approvalStatus: i.approvalStatus })),
  };
}
export type PublicListing = ReturnType<typeof toPublicDto>;

/** Public listing page. Non-published listings are visible only to their seller and authorised staff (as a preview). */
async function disclosureFields() {
  return publicSellerFields(await getSettings());
}

export async function getListingForPage(actor: Actor, id: string) {
  const l = await prisma.listing.findUnique({ where: { id }, include: publicInclude });
  if (!l) return null;
  const fields = await disclosureFields();
  if (l.publicationStatus === "PUBLISHED") return { listing: toPublicDto(l, { disclosureFields: fields }), preview: false };
  if (await canViewPrivateListing(actor, l)) return { listing: toPublicDto(l, { includePendingImages: true, disclosureFields: fields }), preview: true };
  return null;
}

export async function similarListings(id: string, take = 3) {
  const l = await prisma.listing.findUnique({ where: { id }, select: { categoryId: true, gpuModelId: true } });
  if (!l) return [];
  const rows = await prisma.listing.findMany({
    where: { publicationStatus: "PUBLISHED", id: { not: id }, OR: [{ categoryId: l.categoryId ?? undefined }, { gpuModelId: l.gpuModelId ?? undefined }] },
    include: publicInclude,
    orderBy: { publishedAt: "desc" },
    take,
  });
  const fields = await disclosureFields();
  return rows.map((r) => toPublicDto(r, { disclosureFields: fields }));
}

// ───────────────────── Search ─────────────────────

export const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(50).optional(),
  model: z.string().max(50).optional(),
  manufacturer: z.enum(["NVIDIA", "AMD", "INTEL", "SERVER_MANUFACTURER", "OTHER"]).optional().catch(undefined),
  location: z.string().max(50).optional(),
  // PREOWNED = used + refurbished; NEW_ANY = new + unused
  condition: z.enum(["NEW", "UNUSED", "USED", "REFURBISHED", "PREOWNED", "NEW_ANY"]).optional().catch(undefined),
  priceMin: z.coerce.number().int().min(0).optional().catch(undefined),
  priceMax: z.coerce.number().int().min(0).optional().catch(undefined),
  qtyMin: z.coerce.number().int().min(0).optional().catch(undefined),
  qtyMax: z.coerce.number().int().min(0).optional().catch(undefined),
  verified: z.enum(["any", "SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "CUSTOMS_STATUS", "TECHNICAL_CONDITION", "WARRANTY_EVIDENCE", "DATA_SANITISATION", "EXPORT_CONTROL"]).optional().catch(undefined),
  warranty: z.enum(["MANUFACTURER", "SELLER", "NONE", "UNKNOWN", "ANY_WARRANTY"]).optional().catch(undefined),
  txn: z.enum(["SALE", "SWAP", "SALE_OR_SWAP"]).optional().catch(undefined),
  sort: z.enum(["newest", "price_asc", "price_desc", "relevance"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(1000).optional().catch(undefined),
});
export type SearchParams = z.infer<typeof searchSchema>;
export const PAGE_SIZE = 12;

export async function searchListings(raw: Record<string, string | string[] | undefined>) {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const s = Array.isArray(v) ? v[0] : v;
    if (s !== undefined && s !== "") flat[k] = s;
  }
  const p = searchSchema.parse(flat);
  const now = new Date();
  const and: Prisma.ListingWhereInput[] = [{ publicationStatus: "PUBLISHED" }];
  if (p.q) {
    and.push({
      OR: [
        { title: { contains: p.q, mode: "insensitive" } },
        { description: { contains: p.q, mode: "insensitive" } },
        { serverModel: { contains: p.q, mode: "insensitive" } },
        { gpuModelOther: { contains: p.q, mode: "insensitive" } },
        { gpuModel: { name: { contains: p.q, mode: "insensitive" } } },
      ],
    });
  }
  if (p.category) and.push({ category: { slug: p.category } });
  if (p.model) and.push({ gpuModelId: p.model });
  if (p.manufacturer) and.push({ manufacturer: p.manufacturer });
  if (p.location) and.push({ location: { code: p.location } });
  if (p.condition === "PREOWNED") and.push({ condition: { in: ["USED", "REFURBISHED"] } });
  else if (p.condition === "NEW_ANY") and.push({ condition: { in: ["NEW", "UNUSED"] } });
  else if (p.condition) and.push({ condition: p.condition });
  if (p.priceMin !== undefined) and.push({ priceVnd: { gte: BigInt(p.priceMin) } });
  if (p.priceMax !== undefined) and.push({ priceVnd: { lte: BigInt(p.priceMax) } });
  if (p.qtyMin !== undefined) and.push({ gpuQuantity: { gte: p.qtyMin } });
  if (p.qtyMax !== undefined) and.push({ gpuQuantity: { lte: p.qtyMax } });
  if (p.warranty === "ANY_WARRANTY") and.push({ warrantyStatus: { in: ["MANUFACTURER", "SELLER"] } });
  else if (p.warranty) and.push({ warrantyStatus: p.warranty });
  if (p.txn === "SALE") and.push({ transactionType: { in: ["SALE", "SALE_OR_SWAP"] } });
  if (p.txn === "SWAP") and.push({ transactionType: { in: ["SWAP", "SALE_OR_SWAP"] } });
  if (p.txn === "SALE_OR_SWAP") and.push({ transactionType: "SALE_OR_SWAP" });
  if (p.verified) {
    // Same rule as publicBadges(): PASSED + badge enabled + reviewer recorded + not expired.
    const badgeCond: Prisma.ReviewCheckWhereInput = {
      status: "PASSED",
      publicBadge: true,
      reviewerId: { not: null },
      reviewedAt: { not: null },
      OR: [{ nextReviewAt: null }, { nextReviewAt: { gt: now } }],
    };
    if (p.verified !== "any") badgeCond.checkType = p.verified as CheckType;
    else badgeCond.checkType = { in: ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "CUSTOMS_STATUS", "TECHNICAL_CONDITION", "WARRANTY_EVIDENCE", "DATA_SANITISATION", "EXPORT_CONTROL"] };
    and.push({ checks: { some: badgeCond } });
  }
  const where: Prisma.ListingWhereInput = { AND: and };
  const sort = p.sort ?? (p.q ? "relevance" : "newest");
  const page = p.page ?? 1;
  const total = await prisma.listing.count({ where });

  let rows: ListingWithPublic[];
  if (sort === "relevance") {
    // MVP relevance: title match > model match > description match, then badge count, then newest.
    const all = await prisma.listing.findMany({ where, include: publicInclude, take: 500, orderBy: { publishedAt: "desc" } });
    const q = (p.q ?? "").toLowerCase();
    const score = (l: ListingWithPublic) =>
      (q && l.title.toLowerCase().includes(q) ? 100 : 0) +
      (q && (l.gpuModel?.name ?? "").toLowerCase().includes(q) ? 50 : 0) +
      (q && l.description.toLowerCase().includes(q) ? 10 : 0) +
      publicBadges(l, l.checks, now).length;
    rows = all.sort((a, b) => score(b) - score(a)).slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const orderBy: Prisma.ListingOrderByWithRelationInput[] =
      sort === "price_asc"
        ? [{ priceVnd: { sort: "asc", nulls: "last" } }, { publishedAt: "desc" }]
        : sort === "price_desc"
          ? [{ priceVnd: { sort: "desc", nulls: "last" } }, { publishedAt: "desc" }]
          : [{ publishedAt: "desc" }];
    rows = await prisma.listing.findMany({ where, include: publicInclude, orderBy, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE });
  }
  const fields = await disclosureFields();
  return { items: rows.map((r) => toPublicDto(r, { disclosureFields: fields })), total, page, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)), params: p, sort };
}

export async function featuredListings(take = 6) {
  const rows = await prisma.listing.findMany({ where: { publicationStatus: "PUBLISHED" }, include: publicInclude, orderBy: { publishedAt: "desc" }, take });
  const fields = await disclosureFields();
  return rows.map((r) => toPublicDto(r, { disclosureFields: fields }));
}

// ───────────────────── Saved listings ─────────────────────

export async function toggleSaved(actor: Actor, listingId: string) {
  const a = requireActor(actor);
  const l = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!l || l.publicationStatus !== "PUBLISHED") throw notFound();
  const key = { userId_listingId: { userId: a.id, listingId } };
  const existing = await prisma.savedListing.findUnique({ where: key });
  if (existing) {
    await prisma.savedListing.delete({ where: key });
    return false;
  }
  await prisma.savedListing.create({ data: { userId: a.id, listingId } });
  return true;
}

export async function isSaved(actor: Actor, listingId: string) {
  if (!actor) return false;
  return !!(await prisma.savedListing.findUnique({ where: { userId_listingId: { userId: actor.id, listingId } } }));
}

export async function listSaved(actor: Actor) {
  const a = requireActor(actor);
  const rows = await prisma.savedListing.findMany({ where: { userId: a.id }, include: { listing: { include: publicInclude } }, orderBy: { createdAt: "desc" } });
  const fields = await disclosureFields();
  return rows.map((r) => toPublicDto(r.listing, { disclosureFields: fields }));
}
