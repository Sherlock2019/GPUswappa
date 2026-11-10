import { z } from "zod";
import type { DocumentType } from "@prisma/client";
import { prisma } from "../db";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "../audit";
import { isAdmin, requireActor, requirePermission, type Actor } from "../rbac";
import { DOCUMENT_TYPES, IMAGE_TYPES, safeFilename, storage, validateUpload } from "../storage";
import { enumOf, parse, str } from "../validation";
import { assertCompanyMember } from "./companies";
import { EDITABLE_STATUSES, canViewPrivateListing } from "./listings";

export const DOCUMENT_TYPE_VALUES = [
  "COMPANY_REGISTRATION",
  "SELLER_AUTHORIZATION",
  "PURCHASE_INVOICE",
  "ALTERNATIVE_OWNERSHIP_EVIDENCE",
  "CUSTOMS_DECLARATION",
  "LEASE_OR_FINANCE",
  "TECHNICAL_REPORT",
  "WARRANTY",
  "DATA_SANITISATION_REPORT",
  "OTHER",
] as const;

export type UploadFile = { name: string; type: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };

const MAX_IMAGES = 12;

async function readFile(f: UploadFile | null | undefined) {
  if (!f || typeof f.arrayBuffer !== "function" || f.size === 0) throw new AppError("VALIDATION", "errors.fileEmpty", { file: "errors.fileEmpty" });
  return Buffer.from(await f.arrayBuffer());
}

// ───────────── Listing images ─────────────

export async function uploadListingImage(actor: Actor, listingId: string, file: UploadFile, altText: string) {
  const a = requireActor(actor);
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, include: { _count: { select: { images: true } } } });
  if (!listing) throw notFound();
  await assertCompanyMember(a, listing.sellerCompanyId);
  if (!EDITABLE_STATUSES.includes(listing.publicationStatus)) throw new AppError("POLICY", "errors.listingNotEditable");
  if (listing._count.images >= MAX_IMAGES) throw new AppError("POLICY", "errors.tooManyImages");
  const alt = parse(str(200), altText ?? "");
  const buf = await readFile(file);
  const t = validateUpload(buf, IMAGE_TYPES);
  const key = await storage().put(buf, t.ext);
  const img = await prisma.listingImage.create({
    data: { listingId, storageKey: key, contentType: t.mime, altText: alt || listing.title || "Equipment photo", sortOrder: listing._count.images },
  });
  await audit(a, "LISTING_IMAGE_UPLOADED", "Listing", listingId, { metadata: { imageId: img.id, size: buf.length } });
  return img;
}

export async function deleteListingImage(actor: Actor, imageId: string) {
  const a = requireActor(actor);
  const img = await prisma.listingImage.findUnique({ where: { id: imageId }, include: { listing: true } });
  if (!img) throw notFound();
  await assertCompanyMember(a, img.listing.sellerCompanyId);
  if (!EDITABLE_STATUSES.includes(img.listing.publicationStatus)) throw new AppError("POLICY", "errors.listingNotEditable");
  await prisma.listingImage.delete({ where: { id: imageId } });
  await storage().remove(img.storageKey);
  await audit(a, "LISTING_IMAGE_DELETED", "Listing", img.listingId, { metadata: { imageId } });
}

/** Approved images of published listings are public; everything else needs seller/staff access. */
export async function getImageForServe(actor: Actor, imageId: string) {
  const img = await prisma.listingImage.findUnique({ where: { id: imageId }, include: { listing: true } });
  if (!img) throw notFound();
  const isPublic = img.approvalStatus === "APPROVED" && img.listing.publicationStatus === "PUBLISHED";
  if (!isPublic && !(await canViewPrivateListing(actor, img.listing))) throw notFound();
  return { data: await storage().get(img.storageKey), contentType: img.contentType, isPublic };
}

export async function setImageApproval(actor: Actor, imageId: string, status: "APPROVED" | "REJECTED" | "PENDING") {
  const a = requirePermission(actor, "review:record_check");
  const img = await prisma.listingImage.findUnique({ where: { id: imageId }, include: { listing: true } });
  if (!img) throw notFound();
  if (!(await canViewPrivateListing(a, img.listing))) throw forbidden();
  await prisma.listingImage.update({ where: { id: imageId }, data: { approvalStatus: status } });
  await audit(a, "LISTING_IMAGE_REVIEWED", "Listing", img.listingId, { metadata: { imageId, status } });
}

// ───────────── Private documents ─────────────

export async function uploadListingDocument(actor: Actor, listingId: string, type: string, file: UploadFile) {
  const a = requireActor(actor);
  const docType = parse(enumOf([...DOCUMENT_TYPE_VALUES]), type) as DocumentType;
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw notFound();
  await assertCompanyMember(a, listing.sellerCompanyId);
  if (!EDITABLE_STATUSES.includes(listing.publicationStatus)) throw new AppError("POLICY", "errors.listingNotEditable");
  const buf = await readFile(file);
  const t = validateUpload(buf, DOCUMENT_TYPES);
  const key = await storage().put(buf, t.ext);
  const doc = await prisma.document.create({
    data: { listingId, type: docType, storageKey: key, originalFilename: safeFilename(file.name), contentType: t.mime, size: buf.length, uploadedById: a.id },
  });
  await audit(a, "DOCUMENT_UPLOADED", "Document", doc.id, { metadata: { listingId, type: docType } });
  return doc;
}

export async function uploadCompanyDocument(actor: Actor, companyId: string, type: string, file: UploadFile) {
  const a = requireActor(actor);
  const docType = parse(enumOf(["COMPANY_REGISTRATION", "SELLER_AUTHORIZATION", "OTHER"]), type) as DocumentType;
  await assertCompanyMember(a, companyId);
  const buf = await readFile(file);
  const t = validateUpload(buf, DOCUMENT_TYPES);
  const key = await storage().put(buf, t.ext);
  const doc = await prisma.document.create({
    data: { companyId, type: docType, storageKey: key, originalFilename: safeFilename(file.name), contentType: t.mime, size: buf.length, uploadedById: a.id },
  });
  await audit(a, "DOCUMENT_UPLOADED", "Document", doc.id, { metadata: { companyId, type: docType } });
  return doc;
}

/**
 * Authorisation for private documents:
 *  - ADMIN: all documents.
 *  - REVIEWER: documents of listings assigned to them, and company documents of those listings' sellers.
 *  - Company members: their own company's documents and their listings' documents.
 *  - Everyone else (including other buyers/sellers and visitors): denied (reported as not found).
 */
export async function canAccessDocument(actor: Actor, doc: { listingId: string | null; companyId: string | null }) {
  if (!actor || actor.status !== "ACTIVE") return false;
  if (isAdmin(actor)) return true;
  let companyId = doc.companyId;
  if (doc.listingId) {
    const l = await prisma.listing.findUnique({ where: { id: doc.listingId }, select: { sellerCompanyId: true, assignedReviewerId: true, brokerId: true } });
    if (!l) return false;
    if (actor.role === "REVIEWER") return l.assignedReviewerId === actor.id;
    if (actor.role === "BROKER") {
      if (l.assignedReviewerId === actor.id || l.brokerId === actor.id) return true;
      return (await prisma.enquiry.count({ where: { listingId: doc.listingId, brokerId: actor.id } })) > 0;
    }
    companyId = l.sellerCompanyId;
  } else if (actor.role === "REVIEWER" && companyId) {
    return (await prisma.listing.count({ where: { sellerCompanyId: companyId, assignedReviewerId: actor.id } })) > 0;
  } else if (actor.role === "BROKER" && companyId) {
    // Brokers may see company documents only of parties in cases/listings assigned to them.
    const [cases, listings] = await Promise.all([
      prisma.enquiry.count({ where: { brokerId: actor.id, OR: [{ buyerCompanyId: companyId }, { sellerCompanyId: companyId }] } }),
      prisma.listing.count({ where: { sellerCompanyId: companyId, OR: [{ brokerId: actor.id }, { assignedReviewerId: actor.id }] } }),
    ]);
    return cases + listings > 0;
  }
  // Buyers/sellers: own company only. A seller never gets a buyer's company documents (and vice versa).
  if (!companyId) return false;
  const m = await prisma.companyMembership.findUnique({ where: { userId_companyId: { userId: actor.id, companyId } } });
  return !!m && m.authorizationStatus !== "REVOKED";
}

export async function getDocumentForDownload(actor: Actor, docId: string) {
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc || doc.retentionStatus === "DELETED") throw notFound();
  if (!(await canAccessDocument(actor, doc))) {
    await audit(actor, "DOCUMENT_ACCESS_DENIED", "Document", docId);
    throw notFound();
  }
  await audit(actor, "DOCUMENT_DOWNLOADED", "Document", docId);
  return { doc, data: await storage().get(doc.storageKey) };
}

export async function deleteDocument(actor: Actor, docId: string) {
  const a = requireActor(actor);
  const doc = await prisma.document.findUnique({ where: { id: docId }, include: { listing: true } });
  if (!doc || doc.retentionStatus === "DELETED") throw notFound();
  if (!isAdmin(a)) {
    const companyId = doc.companyId ?? doc.listing?.sellerCompanyId;
    if (!companyId) throw forbidden();
    await assertCompanyMember(a, companyId);
    if (doc.listing && !EDITABLE_STATUSES.includes(doc.listing.publicationStatus)) throw new AppError("POLICY", "errors.listingNotEditable");
  }
  await storage().remove(doc.storageKey);
  await prisma.document.update({ where: { id: docId }, data: { retentionStatus: "DELETED" } });
  await audit(a, "DOCUMENT_DELETED", "Document", docId);
}

export async function setDocumentReview(actor: Actor, docId: string, input: unknown) {
  const a = requirePermission(actor, "review:record_check");
  const d = parse(z.object({ status: enumOf(["PENDING", "ACCEPTED", "REJECTED"]) }), input);
  const doc = await prisma.document.findUnique({ where: { id: docId } });
  if (!doc) throw notFound();
  if (!(await canAccessDocument(a, doc))) throw forbidden();
  await prisma.document.update({ where: { id: docId }, data: { reviewStatus: d.status } });
  await audit(a, "DOCUMENT_REVIEWED", "Document", docId, { metadata: { status: d.status } });
}

export async function listDocumentsForReview(actor: Actor) {
  const a = requirePermission(actor, "review:access");
  return prisma.document.findMany({
    where: {
      retentionStatus: "ACTIVE",
      ...(a.role === "REVIEWER" ? { listing: { assignedReviewerId: a.id } } : {}),
      ...(a.role === "BROKER" ? { listing: { OR: [{ assignedReviewerId: a.id }, { brokerId: a.id }] } } : {}),
    },
    orderBy: [{ reviewStatus: "asc" }, { uploadedAt: "desc" }],
    include: { listing: { select: { id: true, title: true } }, company: { select: { id: true, displayName: true } }, uploadedBy: { select: { name: true } } },
    take: 200,
  });
}
