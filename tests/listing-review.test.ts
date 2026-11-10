import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import { createDraft, getListingForPage, getOwnListingForEdit, saveDraftStep, submitListing } from "../src/lib/services/listings";
import { decide, recommend, recordCheck } from "../src/lib/services/review";
import { listAudit } from "../src/lib/services/admin";
import { AppError } from "../src/lib/errors";
import { completeDraft, makeCompany, makeUser, passChecks, publishedListing } from "./helpers";

describe("seller listing submission", () => {
  it("requires a company profile before creating a draft", async () => {
    const seller = await makeUser("SELLER");
    await expect(createDraft(seller)).rejects.toMatchObject({ message: "errors.companyRequired" });
  });

  it("lists missing information and refuses incomplete submissions", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const l = await createDraft(seller);
    const { missing } = await getOwnListingForEdit(seller, l.id);
    expect(missing.map((m) => m.field)).toEqual(expect.arrayContaining(["title", "categoryId", "inVietnam", "ownership", "customsStatus", "photos", "priceVnd", "brokerageTerms"]));
    const err = await submitListing(seller, l.id).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err.message).toBe("errors.listingIncomplete");
  });

  it("validates step input server-side", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const l = await createDraft(seller);
    await expect(saveDraftStep(seller, l.id, 4, { condition: "BROKEN" })).rejects.toBeInstanceOf(AppError);
    await expect(saveDraftStep(seller, l.id, 9, { priceVnd: "abc" })).rejects.toBeInstanceOf(AppError);
    await expect(saveDraftStep(seller, l.id, 2, { categoryId: "not-a-real-id" })).rejects.toBeInstanceOf(AppError);
  });

  it("requires acceptance of the brokerage terms before submission", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const l = await completeDraft(seller, { acceptTerms: false });
    const err = await submitListing(seller, l.id).catch((e) => e);
    expect(err.details).toContain("brokerageTerms");
  });

  it("submits a complete listing as Under review and records export-review need for flagged models", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const l = await completeDraft(seller);
    const res = await submitListing(seller, l.id);
    expect(res.status).toBe("UNDER_REVIEW");
    const row = await prisma.listing.findUniqueOrThrow({ where: { id: l.id } });
    expect(row.exportReviewRequired).toBe(true);
    expect(row.reviewFlags).toContain("EXPORT_REVIEW");
    expect(await prisma.reviewCheck.count({ where: { listingId: l.id } })).toBe(10);
  });

  it("an 'Unknown' customs answer places the listing on internal hold (not public, not rejected)", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const l = await completeDraft(seller, { customs: "UNKNOWN" });
    const res = await submitListing(seller, l.id);
    expect(res.status).toBe("ON_HOLD");
    expect(res.flags).toContain("CUSTOMS_UNKNOWN");
    expect(await getListingForPage(null, l.id)).toBeNull();
  });

  it("other sellers cannot edit someone else's listing", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const l = await createDraft(seller);
    const other = await makeUser("SELLER");
    await makeCompany(other);
    await expect(saveDraftStep(other, l.id, 2, { title: "Hijacked title here" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin review and publication", () => {
  it("blocks approval until required checks pass, unless an admin overrides with a reason", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const l = await completeDraft(seller);
    await submitListing(seller, l.id);
    const err = await decide(admin, l.id, { outcome: "APPROVE" }).catch((e) => e);
    expect(err.message).toBe("errors.overrideReasonRequired");
    expect(err.details.length).toBeGreaterThan(0);
    // Override with explicit confirmation and reason → allowed and audited as override
    const res = await decide(admin, l.id, { outcome: "APPROVE", confirmOverride: "on", reason: "Exceptional demo override with documented reason" });
    expect(res.override).toBe(true);
    const audit = await listAudit(admin);
    expect(audit.some((a) => a.action === "REVIEW_DECISION_OVERRIDE" && a.resourceId === l.id && a.reason)).toBe(true);
  });

  it("approving against a reviewer's REJECT recommendation is an override", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const reviewer = await makeUser("REVIEWER");
    const l = await completeDraft(seller);
    await submitListing(seller, l.id);
    await prisma.listing.update({ where: { id: l.id }, data: { assignedReviewerId: reviewer.id } });
    await passChecks(reviewer, l.id);
    await recommend(reviewer, l.id, { outcome: "REJECT", reason: "Photos do not match description" });
    await expect(decide(admin, l.id, { outcome: "APPROVE" })).rejects.toMatchObject({ message: "errors.overrideReasonRequired" });
  });

  it("reviewers only access assigned listings and cannot approve", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const reviewer = await makeUser("REVIEWER");
    const l = await completeDraft(seller);
    await submitListing(seller, l.id);
    await expect(recordCheck(reviewer, l.id, { checkType: "SELLER_IDENTITY", status: "PASSED", evidenceRef: "X" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await prisma.listing.update({ where: { id: l.id }, data: { assignedReviewerId: reviewer.id } });
    await recordCheck(reviewer, l.id, { checkType: "SELLER_IDENTITY", status: "PASSED", evidenceRef: "X" });
    await expect(decide(reviewer, l.id, { outcome: "APPROVE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Return for information is allowed for reviewers and requires a message
    await expect(decide(reviewer, l.id, { outcome: "RETURN_FOR_INFO" })).rejects.toBeInstanceOf(AppError);
    await decide(reviewer, l.id, { outcome: "RETURN_FOR_INFO", messageToSeller: "Please upload the ownership evidence." });
    expect((await prisma.listing.findUniqueOrThrow({ where: { id: l.id } })).publicationStatus).toBe("NEEDS_INFO");
  });

  it("a passed check needs an evidence reference or note", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const l = await completeDraft(seller);
    await submitListing(seller, l.id);
    await expect(recordCheck(admin, l.id, { checkType: "SELLER_IDENTITY", status: "PASSED" })).rejects.toBeInstanceOf(AppError);
  });

  it("publication activates the brokerage agreement, opens a fee period and exposes only public data", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const id = await publishedListing(seller, admin);
    const page = await getListingForPage(null, id);
    expect(page?.listing.publicationStatus).toBe("PUBLISHED");
    const json = JSON.stringify(page);
    expect(json).not.toContain("SN-SECRET");
    expect(json).not.toContain("PRIVATE CUSTOMS NOTE");
    expect(json).not.toContain("EVID-");
    expect(json).not.toContain("Private Contact Person");
    const ag = await prisma.brokerageAgreement.findFirstOrThrow({ where: { listingId: id } });
    expect(ag.status).toBe("ACTIVE");
    const fees = await prisma.listingFee.findMany({ where: { listingId: id } });
    expect(fees).toHaveLength(1);
    const audit = await listAudit(admin);
    expect(audit.some((a) => a.action === "REVIEW_DECISION" && a.resourceId === id)).toBe(true);
  });

  it("rejection requires a reason", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const l = await completeDraft(seller);
    await submitListing(seller, l.id);
    await expect(decide(admin, l.id, { outcome: "REJECT" })).rejects.toBeInstanceOf(AppError);
    await decide(admin, l.id, { outcome: "REJECT", reason: "Duplicate listing" });
    expect(await getListingForPage(null, l.id)).toBeNull();
  });
});
