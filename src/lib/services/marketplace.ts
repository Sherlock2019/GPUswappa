import { z } from "zod";
import type { CashDirection, Condition, InboxStatus, PartnerCategory, RequestStatus, SwapStatus, ContactType } from "@prisma/client";
import { prisma } from "../db";
import { AppError, notFound } from "../errors";
import { audit } from "../audit";
import { requireActor, requirePermission, type Actor } from "../rbac";
import { checkbox, email, enumOf, intIn, optStr, parse, reqStr, vnd } from "../validation";
import { companyMemberIds, notify, notifyStaff } from "./notifications";
import { getMyCompany } from "./companies";

// ───────────────────── Swap proposals ─────────────────────

const swapSchema = z.object({
  listingId: optStr(50),
  offeredEquipment: reqStr(300, 5),
  offeredCondition: enumOf(["NEW", "UNUSED", "USED", "REFURBISHED"]),
  offeredDetails: reqStr(4000, 10),
  offeredEstimatedValue: vnd,
  requestedEquipment: reqStr(300, 5),
  requestedEstimatedValue: vnd,
  cashDirection: enumOf(["NONE", "PROPOSER_PAYS", "PROPOSER_RECEIVES"]),
  cashAdjustment: vnd,
  preferredLocationId: optStr(50),
  proposedTiming: optStr(300),
  acknowledgeChecks: z.literal("on", { errorMap: () => ({ message: "validation.acknowledge" }) }),
});

export async function createSwap(actor: Actor, input: unknown) {
  const a = requirePermission(actor, "swap:create");
  const d = parse(swapSchema, input);
  if (d.cashDirection !== "NONE" && d.cashAdjustment === null) throw new AppError("VALIDATION", "errors.validation", { cashAdjustment: "validation.required" });
  if (d.listingId) {
    const l = await prisma.listing.findUnique({ where: { id: d.listingId } });
    if (!l || l.publicationStatus !== "PUBLISHED") throw notFound();
    if (l.transactionType !== "SWAP" && l.transactionType !== "SALE_OR_SWAP") throw new AppError("POLICY", "errors.notSwapEligible");
  }
  if (d.preferredLocationId && !(await prisma.location.findUnique({ where: { id: d.preferredLocationId } }))) {
    throw new AppError("VALIDATION", "errors.validation", { preferredLocationId: "validation.choose" });
  }
  const company = await getMyCompany(a);
  const { acknowledgeChecks: _ack, ...rest } = d;
  void _ack;
  const swap = await prisma.swapProposal.create({
    data: {
      ...rest,
      offeredCondition: d.offeredCondition as Condition,
      cashDirection: d.cashDirection as CashDirection,
      cashAdjustment: d.cashDirection === "NONE" ? null : d.cashAdjustment,
      proposerId: a.id,
      proposerCompanyId: company?.id ?? null,
    },
  });
  await audit(a, "SWAP_CREATED", "SwapProposal", swap.id, { metadata: { listingId: d.listingId } });
  await notifyStaff("notif.newSwap", { offered: d.offeredEquipment }, `/admin/swaps`);
  return swap;
}

export async function listMySwaps(actor: Actor) {
  const a = requireActor(actor);
  const companyIds = (await prisma.companyMembership.findMany({ where: { userId: a.id }, select: { companyId: true } })).map((m) => m.companyId);
  const [mine, onMyListings] = await Promise.all([
    prisma.swapProposal.findMany({ where: { proposerId: a.id }, include: { listing: { select: { id: true, title: true } } }, orderBy: { createdAt: "desc" } }),
    // Sellers see proposals on their listings only after the platform forwards them.
    prisma.swapProposal.findMany({
      where: { listing: { sellerCompanyId: { in: companyIds } }, status: "FORWARDED" },
      // Anonymous until introduced: sellers see only the proposer's alias.
      include: { listing: { select: { id: true, title: true } }, proposerCompany: { select: { alias: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { mine, onMyListings };
}

export async function listAllSwaps(actor: Actor) {
  requirePermission(actor, "admin:inbox");
  return prisma.swapProposal.findMany({
    orderBy: { createdAt: "desc" },
    include: { listing: { select: { id: true, title: true } }, proposer: { select: { name: true, email: true } }, proposerCompany: { select: { displayName: true } }, preferredLocation: true },
  });
}

export async function updateSwapStatus(actor: Actor, id: string, input: unknown) {
  const a = requirePermission(actor, "admin:inbox");
  const d = parse(z.object({ status: enumOf(["SUBMITTED", "UNDER_REVIEW", "FORWARDED", "DECLINED", "CLOSED"]), adminNotes: optStr(4000) }), input);
  const swap = await prisma.swapProposal.findUnique({ where: { id }, include: { listing: true } });
  if (!swap) throw notFound();
  await prisma.swapProposal.update({ where: { id }, data: { status: d.status as SwapStatus, adminNotes: d.adminNotes } });
  await audit(a, "SWAP_STATUS_SET", "SwapProposal", id, { metadata: { from: swap.status, to: d.status } });
  await notify([swap.proposerId], "notif.swapStatus", { status: d.status }, "/dashboard/swaps");
  if (d.status === "FORWARDED" && swap.listing) {
    await notify(await companyMemberIds(swap.listing.sellerCompanyId), "notif.swapForwarded", { title: swap.listing.title }, "/dashboard/swaps");
  }
}

// ───────────────────── Buyer requests ─────────────────────

const requestSchema = z.object({
  categoryId: optStr(50),
  gpuModelId: optStr(50),
  desiredEquipment: reqStr(300, 5),
  quantity: intIn(1, 100000),
  locationId: optStr(50),
  conditionPreference: enumOf(["ANY", "NEW", "USED", "NEW_OR_UNUSED"]),
  budgetMinVnd: vnd,
  budgetMaxVnd: vnd,
  hideBudget: checkbox,
  desiredDeliveryDate: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const dt = new Date(`${v}T00:00:00+07:00`);
      if (Number.isNaN(dt.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.date" });
        return z.NEVER;
      }
      return dt;
    }),
  requirements: optStr(4000),
  contactPreference: enumOf(["PLATFORM", "EMAIL", "PHONE"]),
  visibility: enumOf(["PUBLIC", "PRIVATE"]),
});

export async function createBuyerRequest(actor: Actor, input: unknown) {
  const a = requirePermission(actor, "request:create");
  const d = parse(requestSchema, input);
  if (d.budgetMinVnd !== null && d.budgetMaxVnd !== null && d.budgetMinVnd > d.budgetMaxVnd) {
    throw new AppError("VALIDATION", "errors.validation", { budgetMaxVnd: "validation.budgetOrder" });
  }
  const company = await getMyCompany(a);
  const r = await prisma.buyerRequest.create({ data: { ...d, buyerId: a.id, buyerCompanyId: company?.id ?? null } });
  await audit(a, "BUYER_REQUEST_CREATED", "BuyerRequest", r.id);
  await notifyStaff("notif.newRequest", { equipment: d.desiredEquipment }, "/admin/requests");
  return r;
}

/** Public board: never exposes buyer identity, contact details, or a hidden budget. */
export async function publicRequests() {
  const rows = await prisma.buyerRequest.findMany({
    where: { visibility: "PUBLIC", status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { category: true, gpuModel: true, location: true },
  });
  return rows.map((r) => ({
    id: r.id,
    desiredEquipment: r.desiredEquipment,
    quantity: r.quantity,
    category: r.category,
    gpuModelName: r.gpuModel?.name ?? null,
    location: r.location,
    conditionPreference: r.conditionPreference,
    budgetMinVnd: r.hideBudget ? null : r.budgetMinVnd === null ? null : Number(r.budgetMinVnd),
    budgetMaxVnd: r.hideBudget ? null : r.budgetMaxVnd === null ? null : Number(r.budgetMaxVnd),
    desiredDeliveryDate: r.desiredDeliveryDate,
    createdAt: r.createdAt,
  }));
}

export async function listMyRequests(actor: Actor) {
  const a = requireActor(actor);
  return prisma.buyerRequest.findMany({ where: { buyerId: a.id }, orderBy: { createdAt: "desc" }, include: { gpuModel: true, location: true } });
}

export async function listAllRequests(actor: Actor) {
  requirePermission(actor, "admin:inbox");
  return prisma.buyerRequest.findMany({ orderBy: { createdAt: "desc" }, include: { buyer: { select: { name: true, email: true } }, buyerCompany: { select: { displayName: true } }, gpuModel: true, location: true } });
}

export async function updateRequestStatus(actor: Actor, id: string, input: unknown) {
  const a = requirePermission(actor, "admin:inbox");
  const d = parse(z.object({ status: enumOf(["OPEN", "UNDER_REVIEW", "MATCHED", "CLOSED"]), adminNotes: optStr(4000) }), input);
  const r = await prisma.buyerRequest.findUnique({ where: { id } });
  if (!r) throw notFound();
  await prisma.buyerRequest.update({ where: { id }, data: { status: d.status as RequestStatus, adminNotes: d.adminNotes } });
  await audit(a, "BUYER_REQUEST_STATUS_SET", "BuyerRequest", id, { metadata: { from: r.status, to: d.status } });
  await notify([r.buyerId], "notif.requestStatus", { status: d.status }, "/dashboard/requests");
}

export async function closeMyRequest(actor: Actor, id: string) {
  const a = requireActor(actor);
  const r = await prisma.buyerRequest.findUnique({ where: { id } });
  if (!r || r.buyerId !== a.id) throw notFound();
  await prisma.buyerRequest.update({ where: { id }, data: { status: "CLOSED" } });
}

// ───────────────────── Contact & partner forms (public) ─────────────────────

const contactSchema = z.object({
  type: enumOf(["GENERAL", "REPORT_LISTING", "SELLER_SUPPORT", "BUYER_SUPPORT"]),
  name: reqStr(120, 2),
  email,
  organization: optStr(200),
  subject: optStr(200),
  message: reqStr(4000, 10),
  listingId: optStr(50),
  website: z.string().max(0, "validation.bot").optional(), // honeypot
});

export async function createContact(actor: Actor, input: unknown) {
  const d = parse(contactSchema, input);
  if (d.listingId && !(await prisma.listing.findUnique({ where: { id: d.listingId } }))) d.listingId = null;
  if (d.type === "REPORT_LISTING" && !d.listingId) throw new AppError("VALIDATION", "errors.validation", { listingId: "validation.required" });
  const { website: _hp, ...rest } = d;
  void _hp;
  const c = await prisma.contactSubmission.create({ data: { ...rest, type: d.type as ContactType, userId: actor?.id ?? null } });
  await audit(actor, "CONTACT_SUBMITTED", "ContactSubmission", c.id, { metadata: { type: d.type } });
  await notifyStaff(d.type === "REPORT_LISTING" ? "notif.listingReported" : "notif.newContact", { type: d.type }, "/admin/inbox");
  return c;
}

const PARTNER_CATEGORIES = ["DATA_CENTRE", "SYSTEM_INTEGRATOR", "RESELLER", "ITAD_SANITISATION", "LEGAL_CUSTOMS", "LOGISTICS", "BANK_PAYMENT", "OTHER"] as const;

export async function createPartnerEnquiry(actor: Actor, input: unknown) {
  const d = parse(
    z.object({
      organization: reqStr(200, 2),
      contactName: reqStr(120, 2),
      email,
      phone: optStr(40),
      partnerCategory: enumOf([...PARTNER_CATEGORIES]),
      message: reqStr(4000, 10),
      website: z.string().max(0, "validation.bot").optional(),
    }),
    input,
  );
  const { website: _hp, ...rest } = d;
  void _hp;
  const p = await prisma.partnerEnquiry.create({ data: { ...rest, partnerCategory: d.partnerCategory as PartnerCategory } });
  await audit(actor, "PARTNER_ENQUIRY_SUBMITTED", "PartnerEnquiry", p.id, { metadata: { category: d.partnerCategory } });
  await notifyStaff("notif.newPartner", { org: d.organization }, "/admin/partners", { adminsOnly: true });
  return p;
}

export async function listInbox(actor: Actor) {
  requirePermission(actor, "admin:inbox");
  return prisma.contactSubmission.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { listing: { select: { id: true, title: true } } } });
}

export async function listPartners(actor: Actor) {
  requirePermission(actor, "admin:inbox");
  return prisma.partnerEnquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

const inboxUpdate = z.object({ status: enumOf(["NEW", "IN_PROGRESS", "RESOLVED", "CLOSED"]), adminNotes: optStr(4000) });

export async function updateContactStatus(actor: Actor, id: string, input: unknown) {
  const a = requirePermission(actor, "admin:inbox");
  const d = parse(inboxUpdate, input);
  await prisma.contactSubmission.update({ where: { id }, data: { status: d.status as InboxStatus, adminNotes: d.adminNotes } });
  await audit(a, "CONTACT_STATUS_SET", "ContactSubmission", id, { metadata: { status: d.status } });
}

export async function updatePartnerStatus(actor: Actor, id: string, input: unknown) {
  const a = requirePermission(actor, "admin:inbox");
  const d = parse(inboxUpdate, input);
  await prisma.partnerEnquiry.update({ where: { id }, data: { status: d.status as InboxStatus, adminNotes: d.adminNotes } });
  await audit(a, "PARTNER_STATUS_SET", "PartnerEnquiry", id, { metadata: { status: d.status } });
}
