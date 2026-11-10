import { z } from "zod";
import type {
  Company,
  EnquiryStatus,
  FeeTrigger,
  IntroductionStatus,
  MessageChannel,
  Prisma,
  TransactionStatus,
  CommissionStatus,
  InspectionOutcome,
  InspectionType,
  ExistingRelationship,
} from "@prisma/client";
import { prisma } from "../db";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "../audit";
import { can, isAdmin, requireActor, requirePermission, type Actor } from "../rbac";
import { bool, getSettings, type Settings } from "../settings";
import { checkbox, enumOf, intIn, optStr, parse, reqStr } from "../validation";
import { parseVnd } from "../format";
import { computeCommission, containsContactInfo, effectivePct, nextCommissionStatus } from "../commission";
import { companyMemberIds, notify, notifyStaff } from "./notifications";
import { getMyCompany } from "./companies";

// ════════════════════════════ Helpers ════════════════════════════

async function nextReference(prefix: "ENQ" | "TX" | "BA", count: () => Promise<number>) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String((await count()) + 1).padStart(4, "0")}`;
}

/** Identity fields that a broker may approve for disclosure at introduction time. */
export const DISCLOSABLE_FIELDS = ["legalName", "displayName", "registrationNumber", "address", "city", "website", "contactName", "contactEmail", "contactPhone"] as const;
export type DisclosableField = (typeof DISCLOSABLE_FIELDS)[number];

function snapshotCompany(c: Company & { location?: { nameVi: string; nameEn: string } | null }, fields: string[]) {
  const out: Record<string, string> = {};
  for (const f of fields) {
    if (f === "city") {
      if (c.location) out.city = `${c.location.nameVi} / ${c.location.nameEn}`;
      continue;
    }
    const v = (c as unknown as Record<string, unknown>)[f];
    if (typeof v === "string" && v) out[f] = v;
  }
  return out;
}

type CaseRole = "BUYER" | "SELLER" | "BROKER" | "ADMIN";

const caseInclude = {
  listing: { select: { id: true, title: true, publicationStatus: true, sellerCompanyId: true, isDemo: true } },
  buyerCompany: { select: { id: true, alias: true, verificationStatus: true } },
  sellerCompany: { select: { id: true, alias: true, verificationStatus: true } },
  broker: { select: { id: true, name: true } },
} satisfies Prisma.EnquiryInclude;

/**
 * Resolves the caller's role on a case. Access rules:
 *  - ADMIN: every case.
 *  - BROKER: only cases assigned to them.
 *  - BUYER: their own enquiry (or a case of their company).
 *  - SELLER: cases on their company's listing, only after the broker opened the seller channel.
 * Anyone else gets "not found" (no existence leak).
 */
async function loadCase(actor: Actor, enquiryId: string) {
  const a = requireActor(actor);
  const e = await prisma.enquiry.findUnique({ where: { id: enquiryId }, include: caseInclude });
  if (!e) throw notFound();
  let role: CaseRole | null = null;
  if (isAdmin(a)) role = "ADMIN";
  else if (a.role === "BROKER" && e.brokerId === a.id) role = "BROKER";
  else if (e.buyerId === a.id) role = "BUYER";
  else {
    const memberships = await prisma.companyMembership.findMany({ where: { userId: a.id, authorizationStatus: { not: "REVOKED" } }, select: { companyId: true } });
    const ids = memberships.map((m) => m.companyId);
    if (e.buyerCompanyId && ids.includes(e.buyerCompanyId)) role = "BUYER";
    else if (ids.includes(e.sellerCompanyId) && e.sellerChannelOpen) role = "SELLER";
  }
  if (!role) throw notFound();
  return { a, e, role };
}

const isBrokerRole = (r: CaseRole) => r === "BROKER" || r === "ADMIN";

async function completedIntro(enquiryId: string) {
  return prisma.introduction.findFirst({ where: { enquiryId, status: "COMPLETED" }, orderBy: { completedAt: "desc" } });
}

async function brokerOrAdminsIds(brokerId: string | null) {
  if (brokerId) return [brokerId];
  const admins = await prisma.user.findMany({ where: { role: "ADMIN", status: "ACTIVE" }, select: { id: true } });
  return admins.map((x) => x.id);
}

// ════════════════════════════ Enquiries ════════════════════════════

const enquirySchema = z.object({
  message: reqStr(4000, 10),
  representative: reqStr(120, 2),
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "validation.acceptTerms" }) }),
});

/**
 * Buyer submits an enquiry TO THE BROKER (never directly to the seller). Accepting the buyer
 * introduction & privacy terms is recorded with the terms version and timestamp.
 */
export async function createEnquiry(actor: Actor, listingId: string, input: unknown) {
  const a = requirePermission(actor, "enquiry:create");
  const d = parse(enquirySchema, input);
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.publicationStatus !== "PUBLISHED") throw notFound();
  const own = await prisma.companyMembership.findUnique({ where: { userId_companyId: { userId: a.id, companyId: listing.sellerCompanyId } } });
  if (own) throw new AppError("POLICY", "errors.ownListing");
  const settings = await getSettings();
  const company = await getMyCompany(a);
  const status: EnquiryStatus = company && company.verificationStatus === "VERIFIED" ? "NEW" : "BUYER_VERIFICATION_REQUIRED";
  const reference = await nextReference("ENQ", () => prisma.enquiry.count());
  const enquiry = await prisma.$transaction(async (tx) => {
    const e = await tx.enquiry.create({
      data: {
        reference,
        listingId,
        buyerId: a.id,
        buyerCompanyId: company?.id ?? null,
        sellerCompanyId: listing.sellerCompanyId,
        brokerId: listing.brokerId,
        message: d.message,
        status,
      },
    });
    await tx.message.create({ data: { enquiryId: e.id, channel: "BUYER_BROKER", authorId: a.id, body: d.message, flaggedContactInfo: containsContactInfo(d.message) } });
    await tx.buyerIntroAgreement.create({
      data: {
        buyerUserId: a.id,
        buyerCompanyId: company?.id ?? null,
        authorizedRepresentative: d.representative,
        listingId,
        enquiryId: e.id,
        termsVersion: settings["terms.buyerIntroVersion"],
        brokerId: listing.brokerId,
      },
    });
    await audit(a, "ENQUIRY_CREATED", "Enquiry", e.id, { metadata: { listingId, status, termsVersion: settings["terms.buyerIntroVersion"] } }, tx);
    return e;
  });
  // Notification carries only the reference and listing title — no buyer identity.
  await notify(await brokerOrAdminsIds(listing.brokerId), "notif.newEnquiry", { ref: reference, title: listing.title }, `/admin/cases/${enquiry.id}`);
  return enquiry;
}

/** Enquiries visible to a buyer or seller, with aliases only. */
export async function listMyCases(actor: Actor) {
  const a = requireActor(actor);
  const companyIds = (await prisma.companyMembership.findMany({ where: { userId: a.id, authorizationStatus: { not: "REVOKED" } }, select: { companyId: true } })).map((m) => m.companyId);
  const [asBuyer, asSeller] = await Promise.all([
    prisma.enquiry.findMany({
      where: { OR: [{ buyerId: a.id }, ...(companyIds.length ? [{ buyerCompanyId: { in: companyIds } }] : [])] },
      include: { listing: { select: { id: true, title: true } }, sellerCompany: { select: { alias: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.enquiry.findMany({
      where: { sellerCompanyId: { in: companyIds }, sellerChannelOpen: true },
      include: { listing: { select: { id: true, title: true } }, buyerCompany: { select: { alias: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);
  return {
    asBuyer: asBuyer.map((e) => ({ id: e.id, reference: e.reference, status: e.status, listing: e.listing, counterpartyAlias: e.sellerCompany.alias, updatedAt: e.updatedAt })),
    asSeller: asSeller.map((e) => ({ id: e.id, reference: e.reference, status: e.status, listing: e.listing, counterpartyAlias: e.buyerCompany?.alias ?? "VN-B-····", updatedAt: e.updatedAt })),
  };
}

export const caseFilterSchema = z.object({
  status: z.string().optional(),
  broker: z.string().optional(),
  listing: z.string().optional(),
  seller: z.string().optional(),
  buyer: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

/** Broker dashboard: assigned cases only (admins see all). */
export async function listBrokerCases(actor: Actor, raw: Record<string, string | undefined> = {}) {
  const a = requirePermission(actor, "broker:handle");
  const f = caseFilterSchema.parse(raw);
  const where: Prisma.EnquiryWhereInput = {};
  if (!can(a, "broker:all")) where.brokerId = a.id;
  else if (f.broker === "none") where.brokerId = null;
  else if (f.broker) where.brokerId = f.broker;
  if (f.status) where.status = f.status as EnquiryStatus;
  if (f.listing) where.listingId = f.listing;
  if (f.seller) where.sellerCompany = { alias: f.seller };
  if (f.buyer) where.buyerCompany = { alias: f.buyer };
  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = new Date(`${f.from}T00:00:00+07:00`);
    if (f.to) where.createdAt.lte = new Date(`${f.to}T23:59:59+07:00`);
  }
  return prisma.enquiry.findMany({
    where,
    include: { ...caseInclude, _count: { select: { messages: true, offers: true } }, introductions: { select: { status: true } }, transaction: { select: { status: true, reference: true } } },
    orderBy: { updatedAt: "desc" },
    take: 300,
  });
}

// ─── Case views (separate DTOs per role) ───

type MsgDto = { id: string; body: string; mine: boolean; fromBroker: boolean; createdAt: Date; channel: MessageChannel; flagged?: boolean; relayOfId?: string | null; author?: string; approvedBy?: string | null };

export async function getCase(actor: Actor, enquiryId: string) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  const intro = await completedIntro(e.id);
  const sharedOn = !!intro?.sharedChannelEnabled;
  const channels: MessageChannel[] =
    role === "BUYER" ? ["BUYER_BROKER", ...(sharedOn ? (["SHARED"] as MessageChannel[]) : [])] : role === "SELLER" ? ["SELLER_BROKER", ...(sharedOn ? (["SHARED"] as MessageChannel[]) : [])] : ["BUYER_BROKER", "SELLER_BROKER", "INTERNAL", "SHARED"];

  const rawMessages = await prisma.message.findMany({
    where: { enquiryId: e.id, channel: { in: channels } },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, role: true } }, approvedBy: { select: { name: true } } },
  });
  const staffRoles = ["BROKER", "ADMIN", "REVIEWER"];
  const messages: MsgDto[] = rawMessages.map((m) => {
    const base = { id: m.id, body: m.body, mine: m.authorId === a.id, fromBroker: staffRoles.includes(m.author.role), createdAt: m.createdAt, channel: m.channel };
    // Parties never receive author names/emails of the other side; brokers see full provenance.
    return isBrokerRole(role) ? { ...base, flagged: m.flaggedContactInfo, relayOfId: m.relayOfId, author: m.author.name, approvedBy: m.approvedBy?.name ?? null } : base;
  });

  const offersRaw = await prisma.offer.findMany({ where: { enquiryId: e.id }, orderBy: { createdAt: "asc" } });
  const offers = offersRaw
    .filter((o) => {
      if (isBrokerRole(role)) return true;
      const ownSide = (role === "BUYER" && o.fromParty === "BUYER") || (role === "SELLER" && o.fromParty === "SELLER");
      return ownSide || o.status !== "SUBMITTED"; // the other side's offer is visible only once relayed by the broker
    })
    .map((o) => ({ id: o.id, fromParty: o.fromParty, amount: Number(o.amount), currency: o.currency, terms: o.terms, status: o.status, createdAt: o.createdAt, relayedAt: o.relayedAt }));

  const inspectionsRaw = await prisma.inspection.findMany({ where: { enquiryId: e.id }, orderBy: { scheduledAt: "asc" } });
  const inspections = inspectionsRaw.map((i) => ({
    id: i.id,
    type: i.type,
    scheduledAt: i.scheduledAt,
    outcome: i.outcome,
    provider: i.provider,
    followUp: isBrokerRole(role) ? i.followUp : null,
    reportRef: isBrokerRole(role) ? i.reportRef : null,
    participants: isBrokerRole(role) ? i.participants : null,
    shareLocation: i.shareLocation,
    location: isBrokerRole(role) || i.shareLocation ? i.location : null,
  }));

  const introductions = await prisma.introduction.findMany({ where: { enquiryId: e.id }, orderBy: { requestedAt: "desc" }, include: { approver: { select: { name: true } }, broker: { select: { name: true } }, disclosures: true } });

  // Disclosed identity: each party sees ONLY the snapshot disclosed to its company.
  const myCompanyId = role === "BUYER" ? e.buyerCompanyId : role === "SELLER" ? e.sellerCompanyId : null;
  const disclosedToMe = myCompanyId
    ? introductions.flatMap((i) => i.disclosures.filter((d) => d.recipientCompanyId === myCompanyId)).map((d) => ({ fields: d.fields, snapshot: d.snapshot as Record<string, string>, at: d.createdAt }))
    : [];

  const tx = await prisma.transaction.findUnique({ where: { enquiryId: e.id } });
  const base = {
    role,
    id: e.id,
    reference: e.reference,
    status: e.status,
    listing: { id: e.listing.id, title: e.listing.title, isDemo: e.listing.isDemo },
    sellerAlias: e.sellerCompany.alias,
    buyerAlias: e.buyerCompany?.alias ?? null,
    brokerName: e.broker?.name ?? null,
    createdAt: e.createdAt,
    messages,
    offers,
    inspections,
    sharedChannelEnabled: sharedOn,
    introduction: introductions[0]
      ? { id: introductions[0].id, status: introductions[0].status, existingRelationship: introductions[0].existingRelationship, sellerDeclaredAt: introductions[0].sellerDeclaredAt }
      : null,
    disclosedToMe,
    transaction: tx
      ? {
          reference: tx.reference,
          status: tx.status,
          // Commission is the seller's fee: shown to the seller and staff only.
          ...(role !== "BUYER" ? { commissionStatus: tx.commissionStatus, commissionAmount: tx.commissionAmount === null ? null : Number(tx.commissionAmount), currency: tx.currency } : {}),
        }
      : null,
  };
  if (!isBrokerRole(role)) return { ...base, broker: null };

  // ── Broker/admin-only data ──
  const [buyerCompany, sellerCompany, buyerTerms, sellerAgreement, buyerDocs, sellerDocs, checklist] = await Promise.all([
    e.buyerCompanyId ? prisma.company.findUnique({ where: { id: e.buyerCompanyId }, include: { location: true } }) : null,
    prisma.company.findUnique({ where: { id: e.sellerCompanyId }, include: { location: true } }),
    prisma.buyerIntroAgreement.findMany({ where: { enquiryId: e.id }, orderBy: { acceptedAt: "desc" } }),
    activeOrAcceptedAgreement(e.listingId),
    e.buyerCompanyId ? prisma.document.findMany({ where: { companyId: e.buyerCompanyId, retentionStatus: "ACTIVE" } }) : [],
    prisma.document.findMany({ where: { OR: [{ companyId: e.sellerCompanyId }, { listingId: e.listingId }], retentionStatus: "ACTIVE" } }),
    introChecklist(e.id),
  ]);
  const buyerUser = await prisma.user.findUnique({ where: { id: e.buyerId }, select: { name: true, email: true } });
  const brokers = isAdmin(a) ? await prisma.user.findMany({ where: { role: { in: ["BROKER", "ADMIN"] }, status: "ACTIVE" }, select: { id: true, name: true } }) : [];
  return {
    ...base,
    broker: {
      buyerUser,
      buyerCompany,
      sellerCompany,
      buyerTerms,
      sellerAgreement,
      buyerDocs,
      sellerDocs,
      checklist,
      introductions,
      transactionFull: tx,
      brokers,
      sellerChannelOpen: e.sellerChannelOpen,
    },
  };
}
export type CaseView = Awaited<ReturnType<typeof getCase>>;

// ─── Messaging ───

/**
 * Parties write only to their own broker channel (or SHARED after an introduction with the
 * shared channel enabled). Brokers write to either party channel or INTERNAL notes.
 * There is NO direct buyer↔seller channel before an authorised introduction.
 */
export async function postMessage(actor: Actor, enquiryId: string, input: unknown) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  const d = parse(z.object({ body: reqStr(4000, 1), channel: z.enum(["BUYER_BROKER", "SELLER_BROKER", "INTERNAL", "SHARED"]).optional() }), input);
  let channel: MessageChannel;
  if (role === "BUYER" || role === "SELLER") {
    const own: MessageChannel = role === "BUYER" ? "BUYER_BROKER" : "SELLER_BROKER";
    channel = d.channel ?? own;
    if (channel === "SHARED") {
      const intro = await completedIntro(e.id);
      if (!intro?.sharedChannelEnabled) throw forbidden("errors.noSharedChannel");
    } else if (channel !== own) throw forbidden();
  } else {
    channel = d.channel ?? "INTERNAL";
    if (channel === "SHARED") {
      const intro = await completedIntro(e.id);
      if (!intro?.sharedChannelEnabled) throw forbidden("errors.noSharedChannel");
    }
  }
  if (["CLOSED", "CANCELLED"].includes(e.status)) throw new AppError("POLICY", "errors.enquiryClosed");
  const flagged = containsContactInfo(d.body);
  await prisma.$transaction(async (tx) => {
    await tx.message.create({ data: { enquiryId, channel, authorId: a.id, body: d.body, flaggedContactInfo: flagged } });
    if (channel === "SELLER_BROKER" && isBrokerRole(role) && !e.sellerChannelOpen) {
      await tx.enquiry.update({ where: { id: enquiryId }, data: { sellerChannelOpen: true } });
    }
    await tx.enquiry.update({ where: { id: enquiryId }, data: { updatedAt: new Date() } });
  });
  // Notify the right side; payloads carry only the case reference.
  if (channel === "BUYER_BROKER") {
    await notify(isBrokerRole(role) ? [e.buyerId] : await brokerOrAdminsIds(e.brokerId), "notif.caseMessage", { ref: e.reference }, isBrokerRole(role) ? `/dashboard/cases/${e.id}` : `/admin/cases/${e.id}`);
  } else if (channel === "SELLER_BROKER") {
    await notify(isBrokerRole(role) ? await companyMemberIds(e.sellerCompanyId) : await brokerOrAdminsIds(e.brokerId), "notif.caseMessage", { ref: e.reference }, isBrokerRole(role) ? `/dashboard/cases/${e.id}` : `/admin/cases/${e.id}`);
  } else if (channel === "SHARED") {
    const ids = [e.buyerId, ...(await companyMemberIds(e.sellerCompanyId)), ...(await brokerOrAdminsIds(e.brokerId))].filter((x) => x !== a.id);
    await notify(ids, "notif.caseMessage", { ref: e.reference }, `/dashboard/cases/${e.id}`);
  }
  return { flagged };
}

/**
 * Broker relays a message to the other side by composing a NEW message (never automatic
 * forwarding). Records the original message and the approving broker. If the composed text
 * looks like it contains contact details, the broker must explicitly confirm.
 */
export async function relayMessage(actor: Actor, enquiryId: string, input: unknown) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  const d = parse(z.object({ sourceMessageId: reqStr(50), body: reqStr(4000, 1), confirmFlagged: checkbox }), input);
  const src = await prisma.message.findUnique({ where: { id: d.sourceMessageId } });
  if (!src || src.enquiryId !== enquiryId || (src.channel !== "BUYER_BROKER" && src.channel !== "SELLER_BROKER")) throw notFound();
  const target: MessageChannel = src.channel === "BUYER_BROKER" ? "SELLER_BROKER" : "BUYER_BROKER";
  const flagged = containsContactInfo(d.body);
  if (flagged && !d.confirmFlagged) throw new AppError("POLICY", "errors.relayFlagged", { body: "errors.relayFlagged" });
  await prisma.$transaction(async (tx) => {
    await tx.message.create({ data: { enquiryId, channel: target, authorId: a.id, body: d.body, relayOfId: src.id, approvedById: a.id, flaggedContactInfo: flagged } });
    await tx.enquiry.update({
      where: { id: enquiryId },
      data: {
        ...(target === "SELLER_BROKER" ? { sellerChannelOpen: true } : {}),
        ...(["NEW", "UNDER_BROKER_REVIEW"].includes(e.status) ? { status: "QUESTIONS_RELAYED" as EnquiryStatus } : {}),
      },
    });
    await audit(a, "MESSAGE_RELAYED", "Enquiry", enquiryId, { metadata: { sourceMessageId: src.id, target, flagged } }, tx);
  });
  const recipients = target === "BUYER_BROKER" ? [e.buyerId] : await companyMemberIds(e.sellerCompanyId);
  await notify(recipients, "notif.caseMessage", { ref: e.reference }, `/dashboard/cases/${e.id}`);
}

const BROKER_SETTABLE: EnquiryStatus[] = ["NEW", "BUYER_VERIFICATION_REQUIRED", "UNDER_BROKER_REVIEW", "QUESTIONS_RELAYED", "OFFER_RECEIVED", "NEGOTIATING", "INSPECTION_REQUESTED", "CLOSED", "CANCELLED"];

export async function setCaseStatus(actor: Actor, enquiryId: string, input: unknown) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  const d = parse(z.object({ status: enumOf(BROKER_SETTABLE as [string, ...string[]]), note: optStr(2000) }), input);
  await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: d.status as EnquiryStatus } });
  if (d.note) await prisma.message.create({ data: { enquiryId, channel: "INTERNAL", authorId: a.id, body: d.note } });
  await audit(a, "CASE_STATUS_SET", "Enquiry", enquiryId, { metadata: { from: e.status, to: d.status } });
  await notify([e.buyerId], "notif.caseStatus", { ref: e.reference, status: d.status }, `/dashboard/cases/${e.id}`);
}

/** Buyer withdraws their own enquiry. */
export async function cancelMyCase(actor: Actor, enquiryId: string) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (role !== "BUYER") throw forbidden();
  await prisma.enquiry.update({ where: { id: enquiryId }, data: { status: "CANCELLED" } });
  await audit(a, "CASE_CANCELLED_BY_BUYER", "Enquiry", enquiryId);
  await notify(await brokerOrAdminsIds(e.brokerId), "notif.caseStatus", { ref: e.reference, status: "CANCELLED" }, `/admin/cases/${e.id}`);
}

export async function assignBroker(actor: Actor, enquiryId: string, brokerId: string | null) {
  const a = requirePermission(actor, "broker:all");
  const e = await prisma.enquiry.findUnique({ where: { id: enquiryId } });
  if (!e) throw notFound();
  if (brokerId) {
    const b = await prisma.user.findUnique({ where: { id: brokerId } });
    if (!b || !["BROKER", "ADMIN"].includes(b.role) || b.status !== "ACTIVE") throw new AppError("VALIDATION", "errors.validation", { brokerId: "validation.choose" });
  }
  await prisma.enquiry.update({ where: { id: enquiryId }, data: { brokerId } });
  await audit(a, "BROKER_ASSIGNED", "Enquiry", enquiryId, { metadata: { brokerId } });
  if (brokerId) await notify([brokerId], "notif.caseAssigned", { ref: e.reference }, `/admin/cases/${e.id}`);
}

export async function assignListingBroker(actor: Actor, listingId: string, brokerId: string | null) {
  const a = requirePermission(actor, "broker:all");
  await prisma.listing.update({ where: { id: listingId }, data: { brokerId } });
  await audit(a, "LISTING_BROKER_ASSIGNED", "Listing", listingId, { metadata: { brokerId } });
}

// ─── Offers ───

const offerSchema = z.object({
  amount: z.string().transform((v, ctx) => {
    const p = parseVnd(v);
    if (p === null || p <= 0n) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.amount" });
      return z.NEVER;
    }
    return p;
  }),
  currency: enumOf(["VND", "USD"]),
  terms: optStr(2000),
});

/** A party sends an offer TO THE BROKER. The other side sees it only after the broker relays it. */
export async function submitOffer(actor: Actor, enquiryId: string, input: unknown) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (role !== "BUYER" && role !== "SELLER") throw forbidden();
  if (["CLOSED", "CANCELLED"].includes(e.status)) throw new AppError("POLICY", "errors.enquiryClosed");
  const d = parse(offerSchema, input);
  const fromParty = role;
  await prisma.$transaction(async (tx) => {
    // A new offer from one side counters the other side's latest relayed offer.
    await tx.offer.updateMany({ where: { enquiryId, fromParty: fromParty === "BUYER" ? "SELLER" : "BUYER", status: "RELAYED" }, data: { status: "COUNTERED", respondedAt: new Date() } });
    await tx.offer.create({ data: { enquiryId, fromParty, amount: d.amount, currency: d.currency, terms: d.terms, recordedById: a.id } });
    await tx.enquiry.update({ where: { id: enquiryId }, data: { status: fromParty === "BUYER" && ["NEW", "UNDER_BROKER_REVIEW", "QUESTIONS_RELAYED"].includes(e.status) ? "OFFER_RECEIVED" : "NEGOTIATING" } });
    await audit(a, "OFFER_SUBMITTED", "Enquiry", enquiryId, { metadata: { fromParty, currency: d.currency } }, tx);
  });
  await notify(await brokerOrAdminsIds(e.brokerId), "notif.offer", { ref: e.reference }, `/admin/cases/${e.id}`);
}

export async function relayOffer(actor: Actor, offerId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw notFound();
  const { a, e, role } = await loadCase(actor, offer.enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  if (offer.status !== "SUBMITTED") throw new AppError("POLICY", "errors.offerState");
  await prisma.$transaction(async (tx) => {
    await tx.offer.update({ where: { id: offerId }, data: { status: "RELAYED", relayedAt: new Date() } });
    if (offer.fromParty === "BUYER" && !e.sellerChannelOpen) await tx.enquiry.update({ where: { id: e.id }, data: { sellerChannelOpen: true } });
    await audit(a, "OFFER_RELAYED", "Enquiry", e.id, { metadata: { offerId } }, tx);
  });
  const recipients = offer.fromParty === "BUYER" ? await companyMemberIds(e.sellerCompanyId) : [e.buyerId];
  await notify(recipients, "notif.offer", { ref: e.reference }, `/dashboard/cases/${e.id}`);
}

/** The receiving party accepts or rejects a relayed offer. */
export async function respondOffer(actor: Actor, offerId: string, input: unknown) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw notFound();
  const { a, e, role } = await loadCase(actor, offer.enquiryId);
  const receiver = offer.fromParty === "BUYER" ? "SELLER" : "BUYER";
  if (role !== receiver) throw forbidden();
  if (offer.status !== "RELAYED") throw new AppError("POLICY", "errors.offerState");
  const d = parse(z.object({ decision: enumOf(["ACCEPT", "REJECT"]) }), input);
  const accepted = d.decision === "ACCEPT";
  await prisma.$transaction(async (tx) => {
    await tx.offer.update({ where: { id: offerId }, data: { status: accepted ? "ACCEPTED" : "REJECTED", respondedAt: new Date() } });
    await tx.enquiry.update({ where: { id: e.id }, data: { status: "NEGOTIATING" } });
    if (accepted) {
      const t = await tx.transaction.findUnique({ where: { enquiryId: e.id } });
      if (t && ["ENQUIRY", "NEGOTIATION", "INSPECTION"].includes(t.status)) {
        await tx.transaction.update({ where: { id: t.id }, data: { status: "OFFER_ACCEPTED", salePrice: offer.amount, currency: offer.currency } });
      }
    }
    await audit(a, accepted ? "OFFER_ACCEPTED" : "OFFER_REJECTED", "Enquiry", e.id, { metadata: { offerId, by: role } }, tx);
  });
  await notify(await brokerOrAdminsIds(e.brokerId), "notif.offerResponse", { ref: e.reference, decision: d.decision }, `/admin/cases/${e.id}`);
}

// ════════════════════════════ Agreements ════════════════════════════

export async function activeOrAcceptedAgreement(listingId: string) {
  return prisma.brokerageAgreement.findFirst({ where: { listingId, status: { in: ["ACTIVE", "ACCEPTED"] } }, orderBy: { createdAt: "desc" } });
}

function agreementDefaults(s: Settings) {
  return {
    listingFeeUsdEquivalent: Number(s["fees.listingMonthlyUsdEquivalent"]) || 100,
    standardCommissionPct: Number(s["fees.standardCommissionPct"]) || 5,
    paymentDeadlineDays: Number(s["fees.paymentDeadlineDays"]) || 14,
    documentVersion: s["terms.brokerageVersion"],
  };
}

const acceptSchema = z.object({
  representative: reqStr(120, 2),
  existingBuyerDeclaration: optStr(2000),
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "validation.acceptTerms" }) }),
});

/**
 * Seller accepts the brokerage terms for a listing (click-wrap). Preserves the accepted
 * document version, timestamp, method and accepting user. Acceptance evidence is recorded;
 * enforceability is a legal question (see docs/COMPLIANCE-REVIEW.md).
 */
export async function acceptBrokerageTerms(actor: Actor, listingId: string, input: unknown, meta: { ip?: string } = {}) {
  const a = requireActor(actor);
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound();
  const m = await prisma.companyMembership.findUnique({ where: { userId_companyId: { userId: a.id, companyId: listing.sellerCompanyId } } });
  if (!m || m.authorizationStatus === "REVOKED") throw forbidden();
  const d = parse(acceptSchema, input);
  const s = await getSettings();
  const now = new Date();
  // Prefer a revised agreement awaiting the seller's review; otherwise create one from defaults.
  const awaiting = await prisma.brokerageAgreement.findFirst({ where: { listingId, status: { in: ["AWAITING_SELLER_REVIEW", "DRAFT"] } }, orderBy: { createdAt: "desc" } });
  const data = {
    authorizedRepresentative: d.representative,
    existingBuyerDeclaration: d.existingBuyerDeclaration,
    acceptedAt: now,
    acceptanceMethod: "WEB_CLICKWRAP",
    acceptedById: a.id,
    acceptedIp: meta.ip ?? null,
    status: (listing.publicationStatus === "PUBLISHED" ? "ACTIVE" : "ACCEPTED") as "ACTIVE" | "ACCEPTED",
    ...(listing.publicationStatus === "PUBLISHED" ? { startDate: now, endDate: addMonths(now, Number(s["fees.agreementTermMonths"]) || 6) } : {}),
  };
  const agreement = await prisma.$transaction(async (tx) => {
    // Any previously accepted version is superseded.
    await tx.brokerageAgreement.updateMany({ where: { listingId, status: { in: ["ACCEPTED", "ACTIVE"] } }, data: { status: "TERMINATED" } });
    const ag = awaiting
      ? await tx.brokerageAgreement.update({ where: { id: awaiting.id }, data })
      : await tx.brokerageAgreement.create({
          data: {
            ...agreementDefaults(s),
            ...data,
            reference: await nextReference("BA", () => tx.brokerageAgreement.count()),
            sellerCompanyId: listing.sellerCompanyId,
            listingId,
          },
        });
    await audit(a, "BROKERAGE_TERMS_ACCEPTED", "BrokerageAgreement", ag.id, { metadata: { listingId, version: ag.documentVersion } }, tx);
    return ag;
  });
  return agreement;
}

const reviseSchema = z.object({
  feeTrigger: enumOf(["SALE_AGREEMENT_SIGNED", "PAYMENT_PENDING", "EQUIPMENT_DELIVERED", "COMPLETED"]),
  paymentDeadlineDays: intIn(1, 180),
  listingFeeCredit: checkbox,
  taxesIncluded: checkbox,
  shippingIncluded: checkbox,
  installationIncluded: checkbox,
  introProtectionMonths: z.union([z.literal(""), intIn(0, 60)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  negotiatedCommissionPct: z
    .union([z.literal(""), z.coerce.number().min(0, "validation.range").max(50, "validation.range")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  negotiatedNote: optStr(1000),
  reason: reqStr(1000, 10),
});

/**
 * Admin prepares a revised agreement (e.g. a negotiated commission). The revision goes to the
 * seller for review and takes effect only after the seller accepts it.
 */
export async function reviseAgreement(actor: Actor, agreementId: string, input: unknown) {
  const a = requirePermission(actor, "agreements:manage");
  const d = parse(reviseSchema, input);
  if (d.negotiatedCommissionPct !== null && !d.negotiatedNote) throw new AppError("VALIDATION", "errors.validation", { negotiatedNote: "validation.evidenceRequired" });
  const base = await prisma.brokerageAgreement.findUnique({ where: { id: agreementId } });
  if (!base) throw notFound();
  const s = await getSettings();
  const { reason, ...fields } = d;
  const rev = await prisma.$transaction(async (tx) => {
    await tx.brokerageAgreement.updateMany({ where: { listingId: base.listingId, status: { in: ["AWAITING_SELLER_REVIEW", "DRAFT"] } }, data: { status: "TERMINATED" } });
    const r = await tx.brokerageAgreement.create({
      data: {
        reference: await nextReference("BA", () => tx.brokerageAgreement.count()),
        sellerCompanyId: base.sellerCompanyId,
        listingId: base.listingId,
        listingFeeUsdEquivalent: base.listingFeeUsdEquivalent,
        feeCurrencyBasis: base.feeCurrencyBasis,
        standardCommissionPct: base.standardCommissionPct,
        commissionPayer: base.commissionPayer,
        salePriceBasis: base.salePriceBasis,
        documentVersion: `${s["terms.brokerageVersion"]}-rev`,
        ...fields,
        feeTrigger: fields.feeTrigger as FeeTrigger,
        status: "AWAITING_SELLER_REVIEW",
      },
    });
    await audit(a, "AGREEMENT_REVISED", "BrokerageAgreement", r.id, { reason, metadata: { fromAgreement: base.id, negotiatedCommissionPct: fields.negotiatedCommissionPct } }, tx);
    return r;
  });
  await notify(await companyMemberIds(base.sellerCompanyId), "notif.agreementReview", { ref: rev.reference }, `/dashboard/listings/${base.listingId}?step=10`);
  return rev;
}

export async function terminateAgreement(actor: Actor, agreementId: string, reason: string) {
  const a = requirePermission(actor, "agreements:manage");
  const r = parse(reqStr(1000, 10), reason);
  await prisma.brokerageAgreement.update({ where: { id: agreementId }, data: { status: "TERMINATED", endDate: new Date() } });
  await audit(a, "AGREEMENT_TERMINATED", "BrokerageAgreement", agreementId, { reason: r });
}

export async function listAgreements(actor: Actor) {
  requirePermission(actor, "agreements:manage");
  await refreshBrokerageStates();
  const [seller, buyer] = await Promise.all([
    prisma.brokerageAgreement.findMany({ orderBy: { createdAt: "desc" }, include: { sellerCompany: { select: { alias: true, displayName: true } }, listing: { select: { id: true, title: true } }, acceptedBy: { select: { name: true } } } }),
    prisma.buyerIntroAgreement.findMany({ orderBy: { acceptedAt: "desc" }, include: { buyerCompany: { select: { alias: true, displayName: true } }, listing: { select: { id: true, title: true } }, enquiry: { select: { id: true, reference: true, introductions: { select: { status: true } } } } } }),
  ]);
  return { seller, buyer };
}

// ════════════════════════════ Listing fees ════════════════════════════

export function addMonths(d: Date, n: number) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

/** Called when a listing is approved: activates the accepted agreement and opens the first fee period. */
export async function activateListingBrokerage(tx: Prisma.TransactionClient, listingId: string, now = new Date()) {
  const s = await getSettings();
  const ag = await tx.brokerageAgreement.findFirst({ where: { listingId, status: { in: ["ACCEPTED", "ACTIVE"] } }, orderBy: { createdAt: "desc" } });
  if (ag && ag.status === "ACCEPTED") {
    await tx.brokerageAgreement.update({ where: { id: ag.id }, data: { status: "ACTIVE", startDate: now, endDate: addMonths(now, Number(s["fees.agreementTermMonths"]) || 6) } });
  }
  const existing = await tx.listingFee.count({ where: { listingId } });
  if (existing === 0) {
    const usd = ag?.listingFeeUsdEquivalent ?? (Number(s["fees.listingMonthlyUsdEquivalent"]) || 100);
    const deadline = ag?.paymentDeadlineDays ?? (Number(s["fees.paymentDeadlineDays"]) || 14);
    await tx.listingFee.create({ data: { listingId, periodStart: now, periodEnd: addMonths(now, 1), dueDate: addDays(now, deadline), usdEquivalent: usd, status: "DUE" } });
  }
}

/**
 * Lazily maintains fee periods and agreement expiry:
 *  - published listings get consecutive monthly periods up to "now";
 *  - NOT_DUE periods that have started become DUE; DUE periods past their due date become OVERDUE;
 *  - ACTIVE agreements past their end date become EXPIRED.
 */
export async function refreshBrokerageStates(now = new Date()) {
  const published = await prisma.listing.findMany({ where: { publicationStatus: "PUBLISHED" }, select: { id: true, fees: { orderBy: { periodEnd: "desc" }, take: 1 } } });
  for (const l of published) {
    const last = l.fees[0];
    if (!last) continue;
    let end = last.periodEnd;
    let guard = 0;
    while (end <= now && guard++ < 24) {
      const ag = await activeOrAcceptedAgreement(l.id);
      await prisma.listingFee.create({ data: { listingId: l.id, periodStart: end, periodEnd: addMonths(end, 1), dueDate: addDays(end, ag?.paymentDeadlineDays ?? 14), usdEquivalent: ag?.listingFeeUsdEquivalent ?? last.usdEquivalent, status: "NOT_DUE" } });
      end = addMonths(end, 1);
    }
  }
  await prisma.listingFee.updateMany({ where: { status: "NOT_DUE", periodStart: { lte: now } }, data: { status: "DUE" } });
  await prisma.listingFee.updateMany({ where: { status: "DUE", dueDate: { lt: now } }, data: { status: "OVERDUE" } });
  await prisma.brokerageAgreement.updateMany({ where: { status: "ACTIVE", endDate: { lt: now } }, data: { status: "EXPIRED" } });
}

export async function listFees(actor: Actor, status?: string) {
  requirePermission(actor, "fees:manage");
  await refreshBrokerageStates();
  return prisma.listingFee.findMany({
    where: status ? { status: status as "DUE" } : {},
    orderBy: [{ status: "asc" }, { dueDate: "asc" }],
    include: { listing: { select: { id: true, title: true, sellerCompany: { select: { alias: true, displayName: true } } } }, recordedBy: { select: { name: true } } },
  });
}

/** Manual payment recording (no online payment provider is integrated). */
export async function recordFeePayment(actor: Actor, feeId: string, input: unknown) {
  const a = requirePermission(actor, "fees:manage");
  const d = parse(
    z.object({
      billedCurrency: enumOf(["VND", "USD"]),
      billedAmount: z.string().transform((v, ctx) => {
        const p = parseVnd(v);
        if (p === null) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.amount" });
          return z.NEVER;
        }
        return p;
      }),
      fxBasis: optStr(300),
      invoiceRef: optStr(120),
      taxTreatment: optStr(300),
    }),
    input,
  );
  const fee = await prisma.listingFee.findUnique({ where: { id: feeId } });
  if (!fee) throw notFound();
  if (fee.status === "WAIVED") throw new AppError("POLICY", "errors.feeWaived");
  await prisma.listingFee.update({ where: { id: feeId }, data: { ...d, status: "PAID", paidAt: new Date(), recordedById: a.id } });
  await audit(a, "LISTING_FEE_PAID_RECORDED", "ListingFee", feeId, { metadata: { listingId: fee.listingId, currency: d.billedCurrency, invoiceRef: d.invoiceRef } });
}

export async function waiveOrModifyFee(actor: Actor, feeId: string, input: unknown) {
  const a = requirePermission(actor, "fees:manage");
  const d = parse(z.object({ action: enumOf(["WAIVE", "MODIFY"]), usdEquivalent: z.union([z.literal(""), intIn(0, 100000)]).optional(), reason: reqStr(1000, 10) }), input);
  const fee = await prisma.listingFee.findUnique({ where: { id: feeId } });
  if (!fee) throw notFound();
  if (d.action === "WAIVE") {
    await prisma.listingFee.update({ where: { id: feeId }, data: { status: "WAIVED", reason: d.reason, recordedById: a.id } });
  } else {
    if (d.usdEquivalent === "" || d.usdEquivalent === undefined) throw new AppError("VALIDATION", "errors.validation", { usdEquivalent: "validation.required" });
    await prisma.listingFee.update({ where: { id: feeId }, data: { usdEquivalent: d.usdEquivalent, reason: d.reason, recordedById: a.id } });
  }
  await audit(a, d.action === "WAIVE" ? "LISTING_FEE_WAIVED" : "LISTING_FEE_MODIFIED", "ListingFee", feeId, { reason: d.reason, metadata: { from: fee.usdEquivalent, to: d.usdEquivalent } });
}

// ════════════════════════════ Introductions ════════════════════════════

/** Pre-conditions for requesting/approving an introduction. Every item must be true. */
export async function introChecklist(enquiryId: string) {
  const e = await prisma.enquiry.findUniqueOrThrow({ where: { id: enquiryId }, include: { listing: true, buyerCompany: true, sellerCompany: true, buyerAgreements: true } });
  const s = await getSettings();
  const requireVerified = bool(s["policy.introRequiresVerifiedCompanies"]);
  const agreement = await prisma.brokerageAgreement.findFirst({ where: { listingId: e.listingId, status: "ACTIVE" } });
  const items = {
    sellerAgreementActive: !!agreement,
    buyerTermsAccepted: e.buyerAgreements.length > 0,
    buyerCompanyProfile: !!e.buyerCompany,
    sellerIdentityVerified: !requireVerified || e.sellerCompany.verificationStatus === "VERIFIED",
    buyerIdentityVerified: !requireVerified || e.buyerCompany?.verificationStatus === "VERIFIED",
    listingApproved: e.listing.publicationStatus === "PUBLISHED",
  };
  return { items, ok: Object.values(items).every(Boolean), agreement, buyerTerms: e.buyerAgreements[0] ?? null };
}

const fieldList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]))
  .refine((arr) => arr.every((f) => (DISCLOSABLE_FIELDS as readonly string[]).includes(f)), "validation.choose");

const introRequestSchema = z.object({
  purpose: reqStr(1000, 10),
  sellerFieldsToBuyer: fieldList,
  buyerFieldsToSeller: fieldList,
  notes: optStr(2000),
  evidenceRef: optStr(500),
});

export async function requestIntroduction(actor: Actor, enquiryId: string, input: unknown) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  requirePermission(a, "intro:request");
  const d = parse(introRequestSchema, input);
  if (d.sellerFieldsToBuyer.length === 0 && d.buyerFieldsToSeller.length === 0) throw new AppError("VALIDATION", "errors.validation", { sellerFieldsToBuyer: "validation.choose" });
  const open = await prisma.introduction.findFirst({ where: { enquiryId, status: { in: ["PENDING_REVIEW", "MORE_INFO_REQUIRED", "APPROVED"] } } });
  if (open) throw new AppError("CONFLICT", "errors.introOpen");
  const check = await introChecklist(enquiryId);
  if (!check.ok) {
    throw new AppError("POLICY", "errors.introPreconditions", undefined, Object.entries(check.items).filter(([, v]) => !v).map(([k]) => `intro.${k}`));
  }
  const intro = await prisma.$transaction(async (tx) => {
    const i = await tx.introduction.create({
      data: {
        enquiryId,
        listingId: e.listingId,
        sellerCompanyId: e.sellerCompanyId,
        buyerCompanyId: e.buyerCompanyId!,
        brokerId: a.id,
        purpose: d.purpose,
        sellerFieldsToBuyer: d.sellerFieldsToBuyer,
        buyerFieldsToSeller: d.buyerFieldsToSeller,
        notes: d.notes,
        evidenceRef: d.evidenceRef,
        checklist: check.items,
        agreementVersions: { brokerage: check.agreement?.documentVersion ?? null, brokerageRef: check.agreement?.reference ?? null, buyerTerms: check.buyerTerms?.termsVersion ?? null },
        status: "PENDING_REVIEW",
      },
    });
    await tx.enquiry.update({ where: { id: enquiryId }, data: { status: "INTRODUCTION_PENDING", sellerChannelOpen: true } });
    await audit(a, "INTRODUCTION_REQUESTED", "Introduction", i.id, { metadata: { enquiryId, sellerFieldsToBuyer: d.sellerFieldsToBuyer, buyerFieldsToSeller: d.buyerFieldsToSeller } }, tx);
    return i;
  });
  // Ask the seller to declare whether the buyer is already known — buyer remains anonymous.
  await notify(await companyMemberIds(e.sellerCompanyId), "notif.introDeclare", { ref: e.reference }, `/dashboard/cases/${e.id}`);
  await notifyStaff("notif.introPending", { ref: e.reference }, `/admin/introductions`, { adminsOnly: true });
  return intro;
}

/** Seller declares whether the (still anonymous) buyer is already known / in active negotiations. */
export async function declareExistingRelationship(actor: Actor, introductionId: string, input: unknown) {
  const intro = await prisma.introduction.findUnique({ where: { id: introductionId } });
  if (!intro) throw notFound();
  const { a, e, role } = await loadCase(actor, intro.enquiryId);
  if (role !== "SELLER" && !isBrokerRole(role)) throw forbidden();
  const d = parse(z.object({ relationship: enumOf(["NONE", "KNOWN_BUYER", "ACTIVE_NEGOTIATION"]), note: optStr(2000) }), input);
  if (d.relationship !== "NONE" && !d.note) throw new AppError("VALIDATION", "errors.validation", { note: "validation.required" });
  await prisma.introduction.update({ where: { id: introductionId }, data: { existingRelationship: d.relationship as ExistingRelationship, existingRelationshipNote: d.note, sellerDeclaredAt: new Date() } });
  await audit(a, "EXISTING_RELATIONSHIP_DECLARED", "Introduction", introductionId, { metadata: { relationship: d.relationship, by: role } });
  await notify(await brokerOrAdminsIds(e.brokerId), "notif.introDeclared", { ref: e.reference }, `/admin/cases/${e.id}`);
}

const introReviewSchema = z.object({
  decision: enumOf(["APPROVE", "MORE_INFO", "REJECT"]),
  reviewNote: optStr(2000),
  overrideReason: optStr(2000),
});

/**
 * Administrator approves, rejects or requests more information. Approval re-checks every
 * precondition. Proceeding without the seller's existing-relationship declaration, or
 * rejecting a broker's request, counts as overriding the broker and needs a written reason.
 */
export async function reviewIntroduction(actor: Actor, introductionId: string, input: unknown) {
  const a = requirePermission(actor, "intro:approve");
  const d = parse(introReviewSchema, input);
  const intro = await prisma.introduction.findUnique({ where: { id: introductionId }, include: { enquiry: true } });
  if (!intro) throw notFound();
  if (!["PENDING_REVIEW", "MORE_INFO_REQUIRED"].includes(intro.status)) throw new AppError("POLICY", "errors.introState");
  let status: IntroductionStatus;
  if (d.decision === "APPROVE") {
    const check = await introChecklist(intro.enquiryId);
    if (!check.ok) throw new AppError("POLICY", "errors.introPreconditions", undefined, Object.entries(check.items).filter(([, v]) => !v).map(([k]) => `intro.${k}`));
    if (intro.existingRelationship === "NOT_DECLARED" && (!d.overrideReason || d.overrideReason.length < 10)) {
      throw new AppError("POLICY", "errors.introDeclarationMissing", { overrideReason: "validation.overrideReason" });
    }
    status = "APPROVED";
  } else if (d.decision === "REJECT") {
    if (!d.overrideReason || d.overrideReason.length < 10) throw new AppError("VALIDATION", "errors.validation", { overrideReason: "validation.overrideReason" });
    status = "REJECTED";
  } else {
    if (!d.reviewNote) throw new AppError("VALIDATION", "errors.validation", { reviewNote: "validation.required" });
    status = "MORE_INFO_REQUIRED";
  }
  await prisma.$transaction(async (tx) => {
    await tx.introduction.update({ where: { id: introductionId }, data: { status, approverId: a.id, approvedAt: status === "APPROVED" ? new Date() : null, reviewNote: d.reviewNote } });
    if (status === "REJECTED") await tx.enquiry.update({ where: { id: intro.enquiryId }, data: { status: "NEGOTIATING" } });
    if (status === "APPROVED") {
      const t = await tx.transaction.findUnique({ where: { enquiryId: intro.enquiryId } });
      if (t && ["ENQUIRY", "NEGOTIATION", "INSPECTION", "OFFER_ACCEPTED"].includes(t.status)) {
        await tx.transaction.update({ where: { id: t.id }, data: { status: "INTRODUCTION_APPROVED", introductionId } });
      }
    }
    await audit(a, `INTRODUCTION_${status}`, "Introduction", introductionId, { reason: d.overrideReason ?? d.reviewNote ?? null, metadata: { override: !!d.overrideReason } }, tx);
  });
  await notify([intro.brokerId], "notif.introReviewed", { ref: intro.enquiry.reference, status }, `/admin/cases/${intro.enquiryId}`);
}

/**
 * Completes an APPROVED introduction: discloses ONLY the approved fields to each side, stores an
 * immutable snapshot per recipient, and writes an IDENTITY_DISCLOSED audit event per disclosure.
 */
export async function completeIntroduction(actor: Actor, introductionId: string, input: unknown) {
  const intro = await prisma.introduction.findUnique({ where: { id: introductionId }, include: { enquiry: true } });
  if (!intro) throw notFound();
  const { a, role } = await loadCase(actor, intro.enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  if (intro.status !== "APPROVED" || !intro.approverId) throw new AppError("POLICY", "errors.introNotApproved");
  const d = parse(z.object({ sharedChannelEnabled: checkbox }), input);
  const [seller, buyer] = await Promise.all([
    prisma.company.findUniqueOrThrow({ where: { id: intro.sellerCompanyId }, include: { location: true } }),
    prisma.company.findUniqueOrThrow({ where: { id: intro.buyerCompanyId }, include: { location: true } }),
  ]);
  await prisma.$transaction(async (tx) => {
    if (intro.sellerFieldsToBuyer.length) {
      const snap = snapshotCompany(seller, intro.sellerFieldsToBuyer);
      const disc = await tx.disclosure.create({ data: { introductionId, authorizedById: intro.approverId!, recipientCompanyId: buyer.id, subjectCompanyId: seller.id, fields: intro.sellerFieldsToBuyer, snapshot: snap } });
      await audit(a, "IDENTITY_DISCLOSED", "Disclosure", disc.id, { metadata: { introductionId, to: buyer.alias, subject: seller.alias, fields: intro.sellerFieldsToBuyer, authorizedBy: intro.approverId } }, tx);
    }
    if (intro.buyerFieldsToSeller.length) {
      const snap = snapshotCompany(buyer, intro.buyerFieldsToSeller);
      const disc = await tx.disclosure.create({ data: { introductionId, authorizedById: intro.approverId!, recipientCompanyId: seller.id, subjectCompanyId: buyer.id, fields: intro.buyerFieldsToSeller, snapshot: snap } });
      await audit(a, "IDENTITY_DISCLOSED", "Disclosure", disc.id, { metadata: { introductionId, to: seller.alias, subject: buyer.alias, fields: intro.buyerFieldsToSeller, authorizedBy: intro.approverId } }, tx);
    }
    await tx.introduction.update({ where: { id: introductionId }, data: { status: "COMPLETED", completedAt: new Date(), sharedChannelEnabled: d.sharedChannelEnabled } });
    await tx.enquiry.update({ where: { id: intro.enquiryId }, data: { status: "INTRODUCED" } });
    await audit(a, "INTRODUCTION_COMPLETED", "Introduction", introductionId, { metadata: { sharedChannelEnabled: d.sharedChannelEnabled } }, tx);
  });
  await notify([intro.enquiry.buyerId, ...(await companyMemberIds(intro.sellerCompanyId))], "notif.introduced", { ref: intro.enquiry.reference }, `/dashboard/cases/${intro.enquiryId}`);
}

export async function cancelIntroduction(actor: Actor, introductionId: string, reason: string) {
  const intro = await prisma.introduction.findUnique({ where: { id: introductionId } });
  if (!intro) throw notFound();
  const { a, role } = await loadCase(actor, intro.enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  if (intro.status === "COMPLETED") throw new AppError("POLICY", "errors.introState");
  const r = parse(reqStr(1000, 5), reason);
  await prisma.introduction.update({ where: { id: introductionId }, data: { status: "CANCELLED", reviewNote: r } });
  await audit(a, "INTRODUCTION_CANCELLED", "Introduction", introductionId, { reason: r });
}

export async function listIntroductions(actor: Actor, status?: string) {
  const a = requirePermission(actor, "intro:request");
  return prisma.introduction.findMany({
    where: { ...(status ? { status: status as IntroductionStatus } : {}), ...(can(a, "broker:all") ? {} : { brokerId: a.id }) },
    orderBy: { requestedAt: "desc" },
    include: {
      enquiry: { select: { id: true, reference: true } },
      listing: { select: { id: true, title: true } },
      sellerCompany: { select: { alias: true } },
      buyerCompany: { select: { alias: true } },
      broker: { select: { name: true } },
      approver: { select: { name: true } },
      disclosures: true,
    },
  });
}

// ════════════════════════════ Inspections ════════════════════════════

const inspectionSchema = z.object({
  type: enumOf(["VIDEO", "ON_SITE", "INDEPENDENT_PARTNER"]),
  scheduledAt: z.string().transform((v, ctx) => {
    const dt = new Date(v.length === 16 ? `${v}:00+07:00` : v);
    if (Number.isNaN(dt.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.date" });
      return z.NEVER;
    }
    return dt;
  }),
  location: optStr(500),
  shareLocation: checkbox,
  participants: optStr(1000),
  provider: optStr(200),
});

/** Scheduling requires the identity/agreement checks (an inspection may reveal information about the parties). */
export async function scheduleInspection(actor: Actor, enquiryId: string, input: unknown) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  const d = parse(inspectionSchema, input);
  const check = await introChecklist(enquiryId);
  const needed = { sellerAgreementActive: check.items.sellerAgreementActive, buyerTermsAccepted: check.items.buyerTermsAccepted, buyerIdentityVerified: check.items.buyerIdentityVerified, sellerIdentityVerified: check.items.sellerIdentityVerified };
  if (!Object.values(needed).every(Boolean)) {
    throw new AppError("POLICY", "errors.inspectionPreconditions", undefined, Object.entries(needed).filter(([, v]) => !v).map(([k]) => `intro.${k}`));
  }
  const ins = await prisma.$transaction(async (tx) => {
    const i = await tx.inspection.create({ data: { ...d, type: d.type as InspectionType, enquiryId, listingId: e.listingId, brokerId: a.id } });
    await tx.enquiry.update({ where: { id: enquiryId }, data: { status: "INSPECTION_REQUESTED", sellerChannelOpen: true } });
    const t = await tx.transaction.findUnique({ where: { enquiryId } });
    if (t && ["ENQUIRY", "NEGOTIATION"].includes(t.status)) await tx.transaction.update({ where: { id: t.id }, data: { status: "INSPECTION" } });
    await audit(a, "INSPECTION_SCHEDULED", "Inspection", i.id, { metadata: { enquiryId, type: d.type, shareLocation: d.shareLocation } }, tx);
    return i;
  });
  await notify([e.buyerId, ...(await companyMemberIds(e.sellerCompanyId))], "notif.inspection", { ref: e.reference }, `/dashboard/cases/${e.id}`);
  return ins;
}

export async function updateInspection(actor: Actor, inspectionId: string, input: unknown) {
  const ins = await prisma.inspection.findUnique({ where: { id: inspectionId } });
  if (!ins) throw notFound();
  const { a, role } = await loadCase(actor, ins.enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  const d = parse(z.object({ outcome: enumOf(["SCHEDULED", "PASSED", "ISSUES_FOUND", "FAILED", "CANCELLED"]), reportRef: optStr(500), followUp: optStr(2000), shareLocation: checkbox }), input);
  await prisma.inspection.update({ where: { id: inspectionId }, data: { ...d, outcome: d.outcome as InspectionOutcome } });
  await audit(a, "INSPECTION_UPDATED", "Inspection", inspectionId, { metadata: { outcome: d.outcome, shareLocation: d.shareLocation } });
}

export async function listInspections(actor: Actor) {
  const a = requirePermission(actor, "broker:handle");
  return prisma.inspection.findMany({
    where: can(a, "broker:all") ? {} : { brokerId: a.id },
    orderBy: { scheduledAt: "asc" },
    include: { enquiry: { select: { id: true, reference: true } }, listing: { select: { id: true, title: true } }, broker: { select: { name: true } } },
  });
}

// ════════════════════════════ Transactions & commission ════════════════════════════

async function creditableFees(listingId: string, currency: string) {
  const paid = await prisma.listingFee.findMany({ where: { listingId, status: "PAID" } });
  let total = 0n;
  for (const f of paid) {
    if (f.billedCurrency === currency && f.billedAmount !== null) total += f.billedAmount;
    else if (currency === "USD") total += BigInt(f.usdEquivalent);
  }
  return total;
}

async function recalc(txId: string) {
  const t = await prisma.transaction.findUniqueOrThrow({ where: { id: txId }, include: { agreement: true } });
  const pct = t.commissionPct === null ? null : Number(t.commissionPct);
  const creditAllowed = !!t.agreement?.listingFeeCredit;
  const res = computeCommission({ salePrice: t.salePrice, type: t.commissionType, pct, fixed: t.commissionFixed, creditAllowed, creditableFees: creditAllowed ? await creditableFees(t.listingId, t.currency) : 0n });
  const commissionStatus: CommissionStatus = nextCommissionStatus(t.commissionStatus, t.status, t.feeTrigger);
  return prisma.transaction.update({ where: { id: txId }, data: { commissionAmount: res.net, listingFeeCredit: res.credit, commissionStatus } });
}

/** Broker opens the transaction record for a case, linking the active agreement and any completed introduction. */
export async function openTransaction(actor: Actor, enquiryId: string) {
  const { a, e, role } = await loadCase(actor, enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  const existing = await prisma.transaction.findUnique({ where: { enquiryId } });
  if (existing) return existing;
  const s = await getSettings();
  const agreement = await prisma.brokerageAgreement.findFirst({ where: { listingId: e.listingId, status: "ACTIVE" }, orderBy: { createdAt: "desc" } });
  const intro = await completedIntro(enquiryId);
  const accepted = await prisma.offer.findFirst({ where: { enquiryId, status: "ACCEPTED" }, orderBy: { respondedAt: "desc" } });
  const pct = effectivePct(Number(agreement?.standardCommissionPct ?? s["fees.standardCommissionPct"]), agreement?.negotiatedCommissionPct === null || agreement?.negotiatedCommissionPct === undefined ? null : Number(agreement.negotiatedCommissionPct));
  const t = await prisma.transaction.create({
    data: {
      reference: await nextReference("TX", () => prisma.transaction.count()),
      enquiryId,
      listingId: e.listingId,
      sellerCompanyId: e.sellerCompanyId,
      buyerCompanyId: e.buyerCompanyId,
      brokerId: e.brokerId ?? a.id,
      agreementId: agreement?.id ?? null,
      introductionId: intro?.id ?? null,
      commissionPct: pct,
      commissionBasis: agreement?.salePriceBasis ?? "Agreed equipment sale price",
      feePayer: agreement?.commissionPayer ?? "SELLER",
      feeTrigger: agreement?.feeTrigger ?? "SALE_AGREEMENT_SIGNED",
      salePrice: accepted?.amount ?? null,
      currency: accepted?.currency ?? "VND",
      status: intro ? "INTRODUCTION_APPROVED" : accepted ? "OFFER_ACCEPTED" : "NEGOTIATION",
    },
  });
  await audit(a, "TRANSACTION_OPENED", "Transaction", t.id, { metadata: { enquiryId, agreementId: agreement?.id, pct } });
  return recalc(t.id);
}

const txUpdateSchema = z.object({
  status: enumOf(["ENQUIRY", "NEGOTIATION", "INSPECTION", "OFFER_ACCEPTED", "INTRODUCTION_APPROVED", "SALE_AGREEMENT_PENDING", "SALE_AGREEMENT_SIGNED", "PAYMENT_PENDING", "EQUIPMENT_DELIVERED", "COMPLETED", "CANCELLED", "DISPUTED"]),
  salePrice: z.string().optional().transform((v) => (v ? parseVnd(v) : null)),
  currency: enumOf(["VND", "USD"]),
  completionEvidence: optStr(1000),
  notes: optStr(4000),
});

export async function updateTransaction(actor: Actor, txId: string, input: unknown) {
  const t = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!t) throw notFound();
  const { a, role } = await loadCase(actor, t.enquiryId);
  if (!isBrokerRole(role)) throw forbidden();
  const d = parse(txUpdateSchema, input);
  if (d.status === "COMPLETED" && !d.completionEvidence && !t.completionEvidence) throw new AppError("VALIDATION", "errors.validation", { completionEvidence: "validation.evidenceRequired" });
  await prisma.transaction.update({
    where: { id: txId },
    data: {
      status: d.status as TransactionStatus,
      salePrice: d.salePrice ?? t.salePrice,
      currency: d.currency,
      completionEvidence: d.completionEvidence ?? t.completionEvidence,
      notes: d.notes ?? t.notes,
      disputeStatus: d.status === "DISPUTED" ? "OPEN" : t.disputeStatus,
    },
  });
  if (d.status === "COMPLETED" || d.status === "CANCELLED") {
    await prisma.enquiry.update({ where: { id: t.enquiryId }, data: { status: d.status === "COMPLETED" ? "CLOSED" : "CANCELLED" } });
  }
  await audit(a, "TRANSACTION_UPDATED", "Transaction", txId, { metadata: { from: t.status, to: d.status } });
  return recalc(txId);
}

const commissionAdminSchema = z.object({
  commissionStatus: enumOf(["NOT_YET_EARNED", "PENDING_TRIGGER", "DUE", "INVOICED", "PAID", "OVERDUE", "DISPUTED", "WAIVED"]),
  invoiceRef: optStr(120),
  disputeStatus: enumOf(["NONE", "OPEN", "RESOLVED"]),
  commissionType: enumOf(["PERCENT", "FIXED"]),
  commissionPct: z.union([z.literal(""), z.coerce.number().min(0).max(50)]).optional().transform((v) => (v === "" || v === undefined ? null : v)),
  commissionFixed: z.string().optional().transform((v) => (v ? parseVnd(v) : null)),
  reason: reqStr(1000, 10),
});

/** Administrators set manual commission states (invoiced/paid/waived…) and any authorised override, always with a reason. */
export async function adminUpdateCommission(actor: Actor, txId: string, input: unknown) {
  const a = requirePermission(actor, "commission:manage");
  const d = parse(commissionAdminSchema, input);
  const t = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!t) throw notFound();
  if (d.commissionStatus === "PAID" && t.status === "CANCELLED") throw new AppError("POLICY", "errors.paidOnCancelled");
  if (d.commissionType === "FIXED" && d.commissionFixed === null) throw new AppError("VALIDATION", "errors.validation", { commissionFixed: "validation.required" });
  await prisma.transaction.update({
    where: { id: txId },
    data: {
      commissionStatus: d.commissionStatus as CommissionStatus,
      invoiceRef: d.invoiceRef,
      disputeStatus: d.disputeStatus,
      commissionType: d.commissionType,
      commissionPct: d.commissionType === "PERCENT" ? (d.commissionPct ?? t.commissionPct) : null,
      commissionFixed: d.commissionType === "FIXED" ? d.commissionFixed : null,
    },
  });
  await audit(a, "COMMISSION_UPDATED", "Transaction", txId, { reason: d.reason, metadata: { from: t.commissionStatus, to: d.commissionStatus, type: d.commissionType, pct: d.commissionPct } });
  return recalc(txId);
}

/** Fee summary: listing fees, commission, credit, tax only when configured, total. */
export async function feeSummary(txId: string) {
  const t = await prisma.transaction.findUniqueOrThrow({ where: { id: txId }, include: { agreement: true } });
  const s = await getSettings();
  const fees = await prisma.listingFee.findMany({ where: { listingId: t.listingId, status: { not: "WAIVED" } } });
  const listingFeesUsd = fees.reduce((sum, f) => sum + f.usdEquivalent, 0);
  const commissionGross = t.commissionAmount === null ? null : t.commissionAmount + (t.listingFeeCredit ?? 0n);
  const taxPct = Number(s["tax.feeTaxPct"]);
  const taxConfigured = s["tax.feeTaxPct"] !== "" && Number.isFinite(taxPct) && taxPct > 0;
  const commissionTax = taxConfigured && t.commissionAmount !== null ? (t.commissionAmount * BigInt(Math.round(taxPct * 100))) / 10000n : null;
  return {
    currency: t.currency,
    listingFeesUsdEquivalent: listingFeesUsd,
    listingFeePeriods: fees.length,
    commissionGross,
    listingFeeCredit: t.listingFeeCredit ?? 0n,
    creditApplies: !!t.agreement?.listingFeeCredit,
    commissionNet: t.commissionAmount,
    tax: taxConfigured ? { label: s["tax.feeTaxLabel"] || "Tax", pct: taxPct, amount: commissionTax } : null,
    totalCommissionDue: t.commissionAmount === null ? null : t.commissionAmount + (commissionTax ?? 0n),
  };
}

export async function listTransactions(actor: Actor, raw: Record<string, string | undefined> = {}) {
  const a = requirePermission(actor, "broker:handle");
  const f = caseFilterSchema.extend({ commission: z.string().optional() }).parse(raw);
  const where: Prisma.TransactionWhereInput = {};
  if (!can(a, "broker:all")) where.brokerId = a.id;
  else if (f.broker) where.brokerId = f.broker;
  if (f.status) where.status = f.status as TransactionStatus;
  if (f.commission) where.commissionStatus = f.commission as CommissionStatus;
  if (f.listing) where.listingId = f.listing;
  if (f.seller) where.sellerCompany = { alias: f.seller };
  if (f.buyer) where.buyerCompany = { alias: f.buyer };
  if (f.from || f.to) {
    where.createdAt = {};
    if (f.from) where.createdAt.gte = new Date(`${f.from}T00:00:00+07:00`);
    if (f.to) where.createdAt.lte = new Date(`${f.to}T23:59:59+07:00`);
  }
  return prisma.transaction.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { listing: { select: { id: true, title: true } }, sellerCompany: { select: { alias: true } }, buyerCompany: { select: { alias: true } }, broker: { select: { name: true } }, enquiry: { select: { id: true, reference: true } } },
  });
}

export async function getTransaction(actor: Actor, txId: string) {
  const t = await prisma.transaction.findUnique({ where: { id: txId } });
  if (!t) throw notFound();
  const { role } = await loadCase(actor, t.enquiryId);
  if (!isBrokerRole(role)) throw notFound();
  const full = await prisma.transaction.findUniqueOrThrow({
    where: { id: txId },
    include: {
      listing: { select: { id: true, title: true, isDemo: true } },
      sellerCompany: true,
      buyerCompany: true,
      broker: { select: { name: true } },
      agreement: true,
      introduction: { include: { disclosures: true, approver: { select: { name: true } } } },
      enquiry: { select: { id: true, reference: true } },
    },
  });
  return { tx: full, summary: await feeSummary(txId) };
}
