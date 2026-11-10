import type { Role } from "@prisma/client";
import { prisma } from "../src/lib/db";
import type { Actor } from "../src/lib/rbac";
import { hashPassword } from "../src/lib/services/users";
import { generateAlias } from "../src/lib/services/companies";
import { createDraft, saveDraftStep, submitListing } from "../src/lib/services/listings";
import { uploadListingImage } from "../src/lib/services/files";
import { recordCheck, decide } from "../src/lib/services/review";
import { acceptBrokerageTerms } from "../src/lib/services/brokerage";

let seq = 0;
const uid = () => `${Date.now().toString(36)}${(seq++).toString(36)}`;

export async function makeUser(role: Role, name = role.toLowerCase()): Promise<NonNullable<Actor>> {
  const u = await prisma.user.create({ data: { email: `${name}-${uid()}@example.com`, name: `Test ${name}`, role, passwordHash: await hashPassword("TestPassword1") } });
  return { id: u.id, role: u.role, status: u.status, name: u.name, email: u.email };
}

export async function makeCompany(user: NonNullable<Actor>, opts: { verified?: boolean; side?: "S" | "B" } = {}) {
  const loc = await prisma.location.findFirstOrThrow({ where: { code: "ho-chi-minh" } });
  return prisma.company.create({
    data: {
      alias: await generateAlias(opts.side ?? (user.role === "SELLER" ? "S" : "B")),
      legalName: `Fictional Legal Name ${uid()} LLC`,
      displayName: `Fictional ${uid()}`,
      registrationNumber: `TEST-${uid()}`.slice(0, 20),
      companyType: "ENTERPRISE",
      address: "1 Fictional Street",
      locationId: loc.id,
      contactName: "Private Contact Person",
      contactEmail: `private-${uid()}@example.com`,
      contactPhone: "0000 111 222",
      verificationStatus: opts.verified === false ? "PENDING" : "VERIFIED",
      memberships: { create: { userId: user.id, authorizationStatus: "AUTHORIZED" } },
    },
  });
}

/** 1×1 PNG */
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
export const PDF = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
export const file = (buf: Buffer, name: string) => ({ name, type: "", size: buf.length, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length) as ArrayBuffer });

export async function ids() {
  const [cat, model, other, loc] = await Promise.all([
    prisma.category.findFirstOrThrow({ where: { slug: "gpu-servers" } }),
    prisma.gpuModel.findFirstOrThrow({ where: { name: "NVIDIA H100" } }),
    prisma.gpuModel.findFirstOrThrow({ where: { name: "NVIDIA RTX 4090" } }),
    prisma.location.findFirstOrThrow({ where: { code: "ho-chi-minh" } }),
  ]);
  return { cat, model, other, loc };
}

type ListingOpts = { title?: string; price?: string; customs?: string; model?: "H100" | "4090"; qty?: string; txn?: string; acceptTerms?: boolean; locationCode?: string };

/** Creates a complete draft via the wizard services (steps 2–9) and optionally accepts terms. */
export async function completeDraft(seller: NonNullable<Actor>, o: ListingOpts = {}) {
  const { cat, model, other } = await ids();
  const loc = await prisma.location.findFirstOrThrow({ where: { code: o.locationCode ?? "ho-chi-minh" } });
  const l = await createDraft(seller);
  await saveDraftStep(seller, l.id, 2, {
    title: o.title ?? "Test 8x GPU server fictional listing",
    categoryId: cat.id,
    manufacturer: "NVIDIA",
    gpuModelId: o.model === "4090" ? other.id : model.id,
    gpuQuantity: o.qty ?? "8",
    description: "A fictional GPU server used only for automated tests of the platform.",
  });
  await saveDraftStep(seller, l.id, 3, { serialNumbers: "SN-SECRET-1234567890", cpu: "2x CPU" });
  await saveDraftStep(seller, l.id, 4, { condition: "USED", hasKnownFaults: "NO", warrantyStatus: "SELLER" });
  await saveDraftStep(seller, l.id, 5, { locationId: loc.id, inVietnam: "YES", transactionType: o.txn ?? "SALE" });
  await saveDraftStep(seller, l.id, 6, { ownership: "OWNS", encumbrance: "NONE", customsStatus: o.customs ?? "CLEARED_DOMESTIC", customsNotes: "PRIVATE CUSTOMS NOTE" });
  await saveDraftStep(seller, l.id, 9, { priceVnd: o.price ?? "1.000.000.000" });
  await uploadListingImage(seller, l.id, file(PNG, "photo.png"), "Front view");
  if (o.acceptTerms !== false) await acceptBrokerageTerms(seller, l.id, { representative: "Test Rep", acceptTerms: "on" });
  return l;
}

export const REQUIRED = ["SELLER_IDENTITY", "SELLER_AUTHORITY", "OWNERSHIP_EVIDENCE", "FINANCING_LEASE", "CUSTOMS_STATUS", "EXPORT_CONTROL"];

export async function passChecks(staff: NonNullable<Actor>, listingId: string, types = REQUIRED, publicBadge = true) {
  for (const checkType of types) {
    await recordCheck(staff, listingId, { checkType, status: "PASSED", evidenceRef: `EVID-${checkType}`, publicBadge: publicBadge ? "on" : "" });
  }
}

/** Full happy path: draft → submit → checks → admin approval. Returns a PUBLISHED listing id. */
export async function publishedListing(seller: NonNullable<Actor>, admin: NonNullable<Actor>, o: ListingOpts & { brokerId?: string } = {}) {
  const l = await completeDraft(seller, o);
  await submitListing(seller, l.id);
  await passChecks(admin, l.id);
  await decide(admin, l.id, { outcome: "APPROVE" });
  if (o.brokerId) await prisma.listing.update({ where: { id: l.id }, data: { brokerId: o.brokerId } });
  return l.id;
}
