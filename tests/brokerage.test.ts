import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import type { Actor } from "../src/lib/rbac";
import {
  completeIntroduction,
  createEnquiry,
  declareExistingRelationship,
  getCase,
  listMyCases,
  postMessage,
  relayMessage,
  requestIntroduction,
  reviewIntroduction,
  submitOffer,
  relayOffer,
  respondOffer,
  scheduleInspection,
} from "../src/lib/services/brokerage";
import { getListingForPage } from "../src/lib/services/listings";
import { canAccessDocument, getDocumentForDownload, uploadCompanyDocument, uploadListingDocument } from "../src/lib/services/files";
import { listAudit } from "../src/lib/services/admin";
import { createSwap } from "../src/lib/services/marketplace";
import { prisma as db } from "../src/lib/db";
import { PDF, file, makeCompany, makeUser, publishedListing, completeDraft } from "./helpers";

type A = NonNullable<Actor>;
let admin: A, seller: A, buyer: A, broker: A, otherBroker: A, otherSeller: A;
let sellerCo: Awaited<ReturnType<typeof makeCompany>>, buyerCo: Awaited<ReturnType<typeof makeCompany>>;
let listingId: string;

const enquiryInput = { message: "We need these GPUs for a fictional AI training project.", representative: "Buyer Rep", acceptTerms: "on" };

beforeAll(async () => {
  admin = await makeUser("ADMIN");
  seller = await makeUser("SELLER");
  buyer = await makeUser("BUYER");
  broker = await makeUser("BROKER");
  otherBroker = await makeUser("BROKER");
  otherSeller = await makeUser("SELLER");
  sellerCo = await makeCompany(seller);
  buyerCo = await makeCompany(buyer);
  await makeCompany(otherSeller);
  listingId = await publishedListing(seller, admin, { brokerId: broker.id, txn: "SALE_OR_SWAP" });
});

describe("anonymous until introduced", () => {
  it("1. a visitor/buyer browses a listing without protected seller details", async () => {
    const page = await getListingForPage(buyer, listingId);
    const json = JSON.stringify(page);
    expect(page!.listing.sellerAlias).toMatch(/^VN-S-\d+/);
    for (const secret of [sellerCo.legalName, sellerCo.displayName, sellerCo.contactEmail!, sellerCo.contactPhone!, sellerCo.registrationNumber, sellerCo.address]) {
      expect(json).not.toContain(secret);
    }
  });

  it("11. legally-required seller fields configured by the admin remain visible", async () => {
    await prisma.siteSetting.upsert({ where: { key: "disclosure.publicSellerFields" }, create: { key: "disclosure.publicSellerFields", value: "legalName,registrationNumber,city" }, update: { value: "legalName,registrationNumber,city" } });
    const page = await getListingForPage(null, listingId);
    const info = Object.fromEntries(page!.listing.sellerPublicInfo.map((i) => [i.field, i.value]));
    expect(info.legalName).toBe(sellerCo.legalName);
    expect(info.registrationNumber).toBe(sellerCo.registrationNumber);
    expect(JSON.stringify(page)).not.toContain(sellerCo.contactEmail!); // contact details are not in the configurable public set
    await prisma.siteSetting.delete({ where: { key: "disclosure.publicSellerFields" } });
  });

  it("2. the seller cannot see the buyer's identity before introduction (and cannot see the case until the broker opens it)", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    await expect(getCase(seller, e.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await listMyCases(seller)).asSeller.find((c) => c.id === e.id)).toBeUndefined();
    await postMessage(broker, e.id, { channel: "SELLER_BROKER", body: "A verified buyer asks about the InfiniBand topology." });
    const view = await getCase(seller, e.id);
    const json = JSON.stringify(view);
    expect(view.buyerAlias).toMatch(/^VN-B-\d+/);
    for (const secret of [buyerCo.legalName, buyerCo.contactEmail!, buyer.email, buyer.name, enquiryInput.representative]) expect(json).not.toContain(secret);
    expect(view.broker).toBeNull();
    // The buyer's own message is NOT visible to the seller
    expect(json).not.toContain(enquiryInput.message);
  });

  it("3. the assigned broker sees both parties", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    const v = await getCase(broker, e.id);
    expect(v.broker?.buyerCompany?.legalName).toBe(buyerCo.legalName);
    expect(v.broker?.sellerCompany?.legalName).toBe(sellerCo.legalName);
    expect(v.broker?.buyerUser?.email).toBe(buyer.email);
  });

  it("4. an unrelated broker cannot see private case details", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    await expect(getCase(otherBroker, e.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(postMessage(otherBroker, e.id, { body: "hi", channel: "INTERNAL" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("5/6. buyers cannot access seller documents; sellers cannot access buyer company documents", async () => {
    // Seller-side private document uploaded during a draft
    const draft = await completeDraft(seller);
    const sellerDoc = await uploadListingDocument(seller, draft.id, "PURCHASE_INVOICE", file(PDF, "invoice.pdf"));
    const buyerDoc = await uploadCompanyDocument(buyer, buyerCo.id, "COMPANY_REGISTRATION", file(PDF, "reg.pdf"));
    await expect(getDocumentForDownload(buyer, sellerDoc.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getDocumentForDownload(seller, buyerDoc.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(getDocumentForDownload(null, sellerDoc.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await canAccessDocument(otherSeller, sellerDoc)).toBe(false);
    // Owners and admins can; a denied attempt is audited
    expect((await getDocumentForDownload(seller, sellerDoc.id)).data.length).toBeGreaterThan(0);
    expect((await getDocumentForDownload(admin, buyerDoc.id)).data.length).toBeGreaterThan(0);
    const audit = await listAudit(admin);
    expect(audit.some((a) => a.action === "DOCUMENT_ACCESS_DENIED" && a.resourceId === sellerDoc.id)).toBe(true);
  });

  it("brokers access company documents only for parties in their assigned cases", async () => {
    const buyerDoc = await uploadCompanyDocument(buyer, buyerCo.id, "OTHER", file(PDF, "x.pdf"));
    await createEnquiry(buyer, listingId, enquiryInput);
    expect(await canAccessDocument(broker, buyerDoc)).toBe(true);
    expect(await canAccessDocument(otherBroker, buyerDoc)).toBe(false);
  });
});

describe("broker-controlled messaging", () => {
  it("7/8. messages are split into buyer–broker and seller–broker channels; no direct buyer–seller channel exists", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    await postMessage(broker, e.id, { channel: "SELLER_BROKER", body: "Question relayed to seller." });
    await postMessage(seller, e.id, { body: "Seller answer only for the broker." });
    await postMessage(broker, e.id, { channel: "INTERNAL", body: "Internal note about both parties." });

    const buyerView = await getCase(buyer, e.id);
    expect(buyerView.messages.every((m) => m.channel === "BUYER_BROKER")).toBe(true);
    expect(JSON.stringify(buyerView)).not.toContain("Seller answer only for the broker");
    expect(JSON.stringify(buyerView)).not.toContain("Internal note");

    const sellerView = await getCase(seller, e.id);
    expect(sellerView.messages.every((m) => m.channel === "SELLER_BROKER")).toBe(true);
    expect(JSON.stringify(sellerView)).not.toContain("Internal note");

    // Parties cannot write into the other party's channel, internal notes, or a shared channel
    await expect(postMessage(buyer, e.id, { channel: "SELLER_BROKER", body: "direct?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(postMessage(seller, e.id, { channel: "BUYER_BROKER", body: "direct?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(postMessage(buyer, e.id, { channel: "INTERNAL", body: "peek" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(postMessage(buyer, e.id, { channel: "SHARED", body: "shared?" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await prisma.message.count({ where: { enquiryId: e.id, channel: "SHARED" } })).toBe(0);
  });

  it("relays record the original message and approver, and flag likely contact details", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    const src = await prisma.message.findFirstOrThrow({ where: { enquiryId: e.id, channel: "BUYER_BROKER" } });
    await expect(relayMessage(broker, e.id, { sourceMessageId: src.id, body: "Call me at 0912 345 678" })).rejects.toMatchObject({ message: "errors.relayFlagged" });
    await relayMessage(broker, e.id, { sourceMessageId: src.id, body: "The buyer asks about InfiniBand topology." });
    const relayed = await prisma.message.findFirstOrThrow({ where: { enquiryId: e.id, relayOfId: src.id } });
    expect(relayed.channel).toBe("SELLER_BROKER");
    expect(relayed.approvedById).toBe(broker.id);
    expect(relayed.authorId).toBe(broker.id);
    // Party-facing views do not reveal who wrote the original
    const sellerView = await getCase(seller, e.id);
    expect(JSON.stringify(sellerView)).not.toContain(buyer.name);
  });

  it("notifications do not leak identities", async () => {
    const before = await prisma.notification.count();
    await createEnquiry(buyer, listingId, enquiryInput);
    const fresh = await prisma.notification.findMany({ orderBy: { createdAt: "desc" }, take: (await prisma.notification.count()) - before });
    for (const n of fresh) for (const s of [buyer.email, buyer.name, buyerCo.legalName]) expect(n.body).not.toContain(s);
  });

  it("offers are only visible to the other side after the broker relays them; the receiver accepts", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    await postMessage(broker, e.id, { channel: "SELLER_BROKER", body: "Opening seller channel" });
    await submitOffer(buyer, e.id, { amount: "900.000.000", currency: "VND" });
    expect((await getCase(seller, e.id)).offers).toHaveLength(0);
    const offer = await prisma.offer.findFirstOrThrow({ where: { enquiryId: e.id } });
    await expect(respondOffer(seller, offer.id, { decision: "ACCEPT" })).rejects.toBeInstanceOf(Error);
    await relayOffer(broker, offer.id);
    expect((await getCase(seller, e.id)).offers).toHaveLength(1);
    await expect(respondOffer(buyer, offer.id, { decision: "ACCEPT" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await respondOffer(seller, offer.id, { decision: "ACCEPT" });
    expect((await prisma.offer.findUniqueOrThrow({ where: { id: offer.id } })).status).toBe("ACCEPTED");
  });
});

describe("introductions", () => {
  it("9. cannot be requested without required agreement records / verified identities", async () => {
    // Buyer without company profile and unverified → preconditions fail
    const anon = await makeUser("BUYER");
    const e = await createEnquiry(anon, listingId, enquiryInput);
    expect(e.status).toBe("BUYER_VERIFICATION_REQUIRED");
    const err = await requestIntroduction(broker, e.id, { purpose: "Introduce for sale agreement", sellerFieldsToBuyer: ["legalName"] }).catch((x) => x);
    expect(err.message).toBe("errors.introPreconditions");
    expect(err.details).toEqual(expect.arrayContaining(["intro.buyerCompanyProfile", "intro.buyerIdentityVerified"]));

    // Seller agreement not active → fails even with a verified buyer
    const e2 = await createEnquiry(buyer, listingId, enquiryInput);
    await prisma.brokerageAgreement.updateMany({ where: { listingId }, data: { status: "TERMINATED" } });
    const err2 = await requestIntroduction(broker, e2.id, { purpose: "Introduce for sale agreement", sellerFieldsToBuyer: ["legalName"] }).catch((x) => x);
    expect(err2.details).toContain("intro.sellerAgreementActive");
    await prisma.brokerageAgreement.updateMany({ where: { listingId }, data: { status: "ACTIVE" } });
  });

  it("10. approval + completion discloses only the approved scope and creates audit events", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    const intro = await requestIntroduction(broker, e.id, { purpose: "Parties agreed price; introduce to sign sale contract", sellerFieldsToBuyer: ["legalName", "contactEmail"], buyerFieldsToSeller: ["legalName"] });
    // Brokers cannot approve; admin approval without the seller's declaration needs an override reason
    await expect(reviewIntroduction(broker, intro.id, { decision: "APPROVE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(reviewIntroduction(admin, intro.id, { decision: "APPROVE" })).rejects.toMatchObject({ message: "errors.introDeclarationMissing" });
    await declareExistingRelationship(seller, intro.id, { relationship: "NONE" });
    // Completion before approval is refused
    await expect(completeIntroduction(broker, intro.id, {})).rejects.toMatchObject({ message: "errors.introNotApproved" });
    await reviewIntroduction(admin, intro.id, { decision: "APPROVE" });
    await completeIntroduction(broker, intro.id, { sharedChannelEnabled: "on" });

    const buyerView = await getCase(buyer, e.id);
    const disclosedToBuyer = buyerView.disclosedToMe[0].snapshot;
    expect(disclosedToBuyer).toEqual({ legalName: sellerCo.legalName, contactEmail: sellerCo.contactEmail });
    expect(JSON.stringify(buyerView)).not.toContain(sellerCo.contactPhone!); // not in approved scope

    const sellerView = await getCase(seller, e.id);
    expect(sellerView.disclosedToMe[0].snapshot).toEqual({ legalName: buyerCo.legalName });
    expect(JSON.stringify(sellerView)).not.toContain(buyerCo.contactEmail!);

    const audit = await listAudit(admin);
    const disclosures = audit.filter((x) => x.action === "IDENTITY_DISCLOSED" && (x.metadata as { introductionId?: string })?.introductionId === intro.id);
    expect(disclosures).toHaveLength(2);
    expect(audit.some((x) => x.action === "INTRODUCTION_COMPLETED" && x.resourceId === intro.id)).toBe(true);
    const rec = await db.disclosure.findMany({ where: { introductionId: intro.id } });
    expect(rec.every((r) => r.authorizedById === admin.id)).toBe(true);

    // Shared channel now allowed (enabled by broker at completion)
    await postMessage(buyer, e.id, { channel: "SHARED", body: "Hello after introduction" });
  });

  it("rejecting a broker's introduction request requires an override reason", async () => {
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    const intro = await requestIntroduction(broker, e.id, { purpose: "Introduce for inspection logistics", sellerFieldsToBuyer: ["displayName"] });
    await expect(reviewIntroduction(admin, intro.id, { decision: "REJECT" })).rejects.toBeInstanceOf(Error);
    await reviewIntroduction(admin, intro.id, { decision: "REJECT", overrideReason: "Buyer verification evidence is insufficient" });
  });

  it("inspections require identity and agreement checks; location stays private unless shared", async () => {
    const anon = await makeUser("BUYER");
    const e1 = await createEnquiry(anon, listingId, enquiryInput);
    await expect(scheduleInspection(broker, e1.id, { type: "VIDEO", scheduledAt: "2026-12-01T10:00" })).rejects.toMatchObject({ message: "errors.inspectionPreconditions" });
    const e = await createEnquiry(buyer, listingId, enquiryInput);
    await scheduleInspection(broker, e.id, { type: "ON_SITE", scheduledAt: "2026-12-01T10:00", location: "Rack 7, Hall B (private)" });
    const v = await getCase(buyer, e.id);
    expect(v.inspections[0].location).toBeNull();
  });
});

describe("swap proposals", () => {
  it("submits a swap proposal for a swap-eligible listing (requires acknowledgement)", async () => {
    await expect(createSwap(buyer, { listingId, offeredEquipment: "2x A100 server", offeredCondition: "USED", offeredDetails: "Fictional details for test", requestedEquipment: "8x H100 server", cashDirection: "NONE" })).rejects.toBeInstanceOf(Error);
    const s = await createSwap(buyer, { listingId, offeredEquipment: "2x A100 server", offeredCondition: "USED", offeredDetails: "Fictional details for test", requestedEquipment: "8x H100 server", cashDirection: "PROPOSER_PAYS", cashAdjustment: "500.000.000", acknowledgeChecks: "on" });
    expect(s.status).toBe("SUBMITTED");
    expect(s.cashAdjustment).toBe(500000000n);
  });
});
