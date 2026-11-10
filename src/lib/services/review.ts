import { z } from "zod";
import type { CheckStatus, CheckType, PublicationStatus, ReviewOutcome } from "@prisma/client";
import { prisma } from "../db";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "../audit";
import { can, requirePermission, type Actor } from "../rbac";
import { getSettings } from "../settings";
import { ALL_CHECKS, approvalBlockers } from "../policy";
import { BADGE_CHECKS } from "../badges";
import { checkbox, enumOf, optStr, parse, reqStr } from "../validation";
import { companyMemberIds, notify, notifyStaff } from "./notifications";
import { canViewPrivateListing } from "./listings";
import { activateListingBrokerage } from "./brokerage";

async function loadForReview(actor: Actor, listingId: string) {
  const a = requirePermission(actor, "review:access");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound();
  if (!(await canViewPrivateListing(a, listing))) throw forbidden("errors.notAssigned");
  return { a, listing };
}

export async function reviewQueue(actor: Actor, status?: PublicationStatus | "ALL") {
  const a = requirePermission(actor, "review:access");
  return prisma.listing.findMany({
    where: {
      ...(status && status !== "ALL" ? { publicationStatus: status } : { publicationStatus: { not: "DRAFT" } }),
      ...(a.role === "REVIEWER" ? { assignedReviewerId: a.id } : {}),
      ...(a.role === "BROKER" ? { OR: [{ assignedReviewerId: a.id }, { brokerId: a.id }] } : {}),
    },
    orderBy: [{ escalated: "desc" }, { submittedAt: "asc" }],
    include: {
      sellerCompany: { select: { displayName: true, verificationStatus: true } },
      assignedReviewer: { select: { name: true } },
      gpuModel: true,
      checks: { select: { status: true } },
    },
  });
}

export async function getReviewCase(actor: Actor, listingId: string) {
  const { listing } = await loadForReview(actor, listingId);
  const settings = await getSettings();
  const full = await prisma.listing.findUniqueOrThrow({
    where: { id: listing.id },
    include: {
      sellerCompany: { include: { location: true, documents: { where: { retentionStatus: "ACTIVE" } }, memberships: { include: { user: { select: { name: true, email: true } } } } } },
      createdBy: { select: { name: true, email: true } },
      assignedReviewer: { select: { id: true, name: true } },
      category: true,
      gpuModel: true,
      location: true,
      images: { orderBy: { sortOrder: "asc" } },
      documents: { where: { retentionStatus: "ACTIVE" }, include: { uploadedBy: { select: { name: true } } } },
      checks: { include: { reviewer: { select: { name: true } } } },
      decisions: { orderBy: { createdAt: "desc" }, include: { actor: { select: { name: true, role: true } } } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  const checks = ALL_CHECKS.map(
    (t) => full.checks.find((c) => c.checkType === t) ?? { id: null, checkType: t, status: "NOT_STARTED" as CheckStatus, reviewer: null, reviewedAt: null, internalNotes: null, evidenceRef: null, publicBadge: false, nextReviewAt: null },
  );
  const blockers = approvalBlockers(full, full.checks, settings);
  const reviewers = await prisma.user.findMany({ where: { role: { in: ["REVIEWER", "ADMIN"] }, status: "ACTIVE" }, select: { id: true, name: true, role: true } });
  const latestRecommendation = full.decisions.find((d) => d.kind === "RECOMMENDATION") ?? null;
  return { listing: full, checks, blockers, reviewers, latestRecommendation };
}

const checkSchema = z.object({
  checkType: enumOf([...ALL_CHECKS] as [string, ...string[]]),
  status: enumOf(["NOT_STARTED", "IN_PROGRESS", "NEEDS_INFO", "PASSED", "FAILED", "NOT_APPLICABLE"]),
  internalNotes: optStr(4000),
  evidenceRef: optStr(500),
  publicBadge: checkbox,
  nextReviewAt: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const d = new Date(`${v}T00:00:00+07:00`);
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "validation.date" });
        return z.NEVER;
      }
      return d;
    }),
});

/** Records one review check. A public badge can be enabled only together with status PASSED. */
export async function recordCheck(actor: Actor, listingId: string, input: unknown) {
  const { a, listing } = await loadForReview(actor, listingId);
  requirePermission(a, "review:record_check");
  const d = parse(checkSchema, input);
  const checkType = d.checkType as CheckType;
  const status = d.status as CheckStatus;
  if (status === "PASSED" && !d.evidenceRef && !d.internalNotes) {
    throw new AppError("VALIDATION", "errors.validation", { evidenceRef: "validation.evidenceRequired" });
  }
  const publicBadge = status === "PASSED" && BADGE_CHECKS.includes(checkType) && d.publicBadge;
  const now = new Date();
  const before = await prisma.reviewCheck.findUnique({ where: { listingId_checkType: { listingId, checkType } } });
  await prisma.$transaction(async (tx) => {
    await tx.reviewCheck.upsert({
      where: { listingId_checkType: { listingId, checkType } },
      create: { listingId, checkType, status, reviewerId: a.id, reviewedAt: now, internalNotes: d.internalNotes, evidenceRef: d.evidenceRef, publicBadge, nextReviewAt: d.nextReviewAt },
      update: { status, reviewerId: a.id, reviewedAt: now, internalNotes: d.internalNotes, evidenceRef: d.evidenceRef, publicBadge, nextReviewAt: d.nextReviewAt },
    });
    await tx.listing.update({
      where: { id: listingId },
      data: { reviewStatus: listing.reviewStatus === "NOT_STARTED" ? "IN_PROGRESS" : listing.reviewStatus, ...(publicBadge ? { lastVerifiedAt: now } : {}) },
    });
    await audit(a, "REVIEW_CHECK_RECORDED", "Listing", listingId, {
      metadata: { checkType, from: before?.status ?? "NOT_STARTED", to: status, publicBadge },
    }, tx);
  });
}

const STAFF_OUTCOMES: ReviewOutcome[] = ["RETURN_FOR_INFO", "HOLD"];
const ADMIN_OUTCOMES: ReviewOutcome[] = ["APPROVE", "REJECT", "ARCHIVE"];

const OUTCOME_STATUS: Record<ReviewOutcome, PublicationStatus> = {
  APPROVE: "PUBLISHED",
  RETURN_FOR_INFO: "NEEDS_INFO",
  HOLD: "ON_HOLD",
  REJECT: "REJECTED",
  ARCHIVE: "ARCHIVED",
};

const decisionSchema = z.object({
  outcome: enumOf(["APPROVE", "RETURN_FOR_INFO", "HOLD", "REJECT", "ARCHIVE"]),
  reason: optStr(4000),
  messageToSeller: optStr(4000),
  confirmOverride: checkbox,
});

/**
 * Applies a review outcome.
 *  - RETURN_FOR_INFO / HOLD: reviewers or admins. RETURN requires a message to the seller; HOLD requires a reason.
 *  - APPROVE / REJECT / ARCHIVE: admins only.
 *  - An admin decision that contradicts policy blockers or the latest reviewer recommendation
 *    is an OVERRIDE and requires an explicit confirmation plus a written audit reason.
 */
export async function decide(actor: Actor, listingId: string, input: unknown) {
  const { a, listing } = await loadForReview(actor, listingId);
  const d = parse(decisionSchema, input);
  const outcome = d.outcome as ReviewOutcome;
  if (ADMIN_OUTCOMES.includes(outcome)) requirePermission(a, "review:decide");
  else if (STAFF_OUTCOMES.includes(outcome)) requirePermission(a, "review:recommend");

  if (listing.publicationStatus === "DRAFT") throw new AppError("POLICY", "errors.listingNotSubmitted");
  if (listing.publicationStatus === "ARCHIVED" && outcome !== "ARCHIVE") throw new AppError("POLICY", "errors.listingArchived");
  if (outcome === "RETURN_FOR_INFO" && !d.messageToSeller) throw new AppError("VALIDATION", "errors.validation", { messageToSeller: "validation.messageRequired" });
  if ((outcome === "HOLD" || outcome === "REJECT") && !d.reason) throw new AppError("VALIDATION", "errors.validation", { reason: "validation.reasonRequired" });

  let override = false;
  let blockers: string[] = [];
  if (outcome === "APPROVE" || outcome === "REJECT") {
    const settings = await getSettings();
    const checks = await prisma.reviewCheck.findMany({ where: { listingId } });
    blockers = outcome === "APPROVE" ? approvalBlockers(listing, checks, settings) : [];
    const rec = await prisma.reviewDecision.findFirst({ where: { listingId, kind: "RECOMMENDATION" }, orderBy: { createdAt: "desc" } });
    const contradictsRecommendation = !!rec && rec.outcome !== outcome && (rec.outcome === "APPROVE" || rec.outcome === "REJECT");
    override = blockers.length > 0 || contradictsRecommendation;
    if (override) {
      if (!can(a, "review:override")) throw forbidden();
      if (!d.confirmOverride || !d.reason || d.reason.length < 10) {
        throw new AppError("POLICY", "errors.overrideReasonRequired", { reason: "validation.overrideReason" }, blockers);
      }
    }
  }

  const status = OUTCOME_STATUS[outcome];
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.listing.update({
      where: { id: listingId },
      data: {
        publicationStatus: status,
        ...(outcome === "APPROVE" ? { publishedAt: listing.publishedAt ?? now, reviewStatus: "COMPLETED", escalated: false } : {}),
        ...(outcome === "REJECT" ? { reviewStatus: "COMPLETED" } : {}),
      },
    });
    if (outcome === "APPROVE") {
      await tx.listingImage.updateMany({ where: { listingId, approvalStatus: "PENDING" }, data: { approvalStatus: "APPROVED" } });
      // Brokerage: accepted agreement becomes ACTIVE; the first monthly listing-fee period opens.
      await activateListingBrokerage(tx, listingId, now);
    }
    await tx.reviewDecision.create({ data: { listingId, actorId: a.id, kind: "DECISION", outcome, reason: d.reason, override } });
    if (d.messageToSeller) {
      await tx.reviewMessage.create({ data: { listingId, authorId: a.id, fromStaff: true, body: d.messageToSeller } });
    }
    await audit(a, override ? "REVIEW_DECISION_OVERRIDE" : "REVIEW_DECISION", "Listing", listingId, {
      reason: d.reason,
      metadata: { outcome, from: listing.publicationStatus, to: status, blockers },
    }, tx);
  });
  await notify(await companyMemberIds(listing.sellerCompanyId), `notif.decision.${outcome}`, { title: listing.title }, `/dashboard/listings/${listingId}`);
  return { status, override };
}

export async function recommend(actor: Actor, listingId: string, input: unknown) {
  const { a, listing } = await loadForReview(actor, listingId);
  requirePermission(a, "review:recommend");
  const d = parse(z.object({ outcome: enumOf(["APPROVE", "REJECT"]), reason: reqStr(4000, 5) }), input);
  await prisma.reviewDecision.create({ data: { listingId, actorId: a.id, kind: "RECOMMENDATION", outcome: d.outcome as ReviewOutcome, reason: d.reason } });
  await audit(a, "REVIEW_RECOMMENDATION", "Listing", listingId, { reason: d.reason, metadata: { outcome: d.outcome } });
  await notifyStaff("notif.recommendation", { title: listing.title, outcome: d.outcome }, `/admin/listings/${listingId}`, { adminsOnly: true });
}

export async function escalate(actor: Actor, listingId: string, input: unknown) {
  const { a, listing } = await loadForReview(actor, listingId);
  const d = parse(z.object({ note: reqStr(2000, 5) }), input);
  await prisma.listing.update({ where: { id: listingId }, data: { escalated: true, escalationNote: d.note } });
  await audit(a, "REVIEW_ESCALATED", "Listing", listingId, { reason: d.note });
  await notifyStaff("notif.escalated", { title: listing.title }, `/admin/listings/${listingId}`, { adminsOnly: true });
}

export async function staffMessage(actor: Actor, listingId: string, body: string) {
  const { a, listing } = await loadForReview(actor, listingId);
  const text = parse(reqStr(4000, 2), body);
  await prisma.reviewMessage.create({ data: { listingId, authorId: a.id, fromStaff: true, body: text } });
  await audit(a, "REVIEW_MESSAGE_STAFF", "Listing", listingId);
  await notify(await companyMemberIds(listing.sellerCompanyId), "notif.reviewMessage", { title: listing.title }, `/dashboard/listings/${listingId}`);
}

export async function assignReviewer(actor: Actor, listingId: string, reviewerId: string | null) {
  const a = requirePermission(actor, "review:decide");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound();
  if (reviewerId) {
    const r = await prisma.user.findUnique({ where: { id: reviewerId } });
    if (!r || (r.role !== "REVIEWER" && r.role !== "ADMIN") || r.status !== "ACTIVE") throw new AppError("VALIDATION", "errors.validation", { reviewerId: "validation.choose" });
  }
  await prisma.listing.update({ where: { id: listingId }, data: { assignedReviewerId: reviewerId } });
  await audit(a, "REVIEWER_ASSIGNED", "Listing", listingId, { metadata: { reviewerId } });
  if (reviewerId) await notify([reviewerId], "notif.assigned", { title: listing.title }, `/admin/listings/${listingId}`);
}

export async function setPlatformRole(actor: Actor, listingId: string, role: string) {
  const a = requirePermission(actor, "review:decide");
  const r = parse(enumOf(["INTERMEDIARY", "SELLER"]), role);
  await prisma.listing.update({ where: { id: listingId }, data: { platformRole: r as "INTERMEDIARY" | "SELLER" } });
  await audit(a, "LISTING_PLATFORM_ROLE_SET", "Listing", listingId, { metadata: { role: r } });
}
