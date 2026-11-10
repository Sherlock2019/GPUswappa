import { describe, expect, it } from "vitest";
import { publicBadges } from "../src/lib/badges";
import { getListingForPage } from "../src/lib/services/listings";
import { recordCheck } from "../src/lib/services/review";
import { makeCompany, makeUser, publishedListing } from "./helpers";

const base = { status: "PASSED" as const, publicBadge: true, reviewerId: "r1", reviewedAt: new Date("2026-01-01"), nextReviewAt: null };

describe("public badge rules", () => {
  it("shows a badge only for PASSED + explicitly enabled + reviewer recorded + published", () => {
    const pub = { publicationStatus: "PUBLISHED" as const };
    expect(publicBadges(pub, [{ ...base, checkType: "SELLER_IDENTITY" }])).toHaveLength(1);
    expect(publicBadges(pub, [{ ...base, checkType: "SELLER_IDENTITY", publicBadge: false }])).toHaveLength(0);
    expect(publicBadges(pub, [{ ...base, checkType: "SELLER_IDENTITY", status: "IN_PROGRESS" }])).toHaveLength(0);
    expect(publicBadges(pub, [{ ...base, checkType: "SELLER_IDENTITY", status: "NOT_APPLICABLE" }])).toHaveLength(0);
    expect(publicBadges(pub, [{ ...base, checkType: "SELLER_IDENTITY", reviewerId: null }])).toHaveLength(0);
    expect(publicBadges({ publicationStatus: "UNDER_REVIEW" }, [{ ...base, checkType: "SELLER_IDENTITY" }])).toHaveLength(0);
  });

  it("never shows a badge for checks without a public badge (e.g. financing/lease)", () => {
    expect(publicBadges({ publicationStatus: "PUBLISHED" }, [{ ...base, checkType: "FINANCING_LEASE" }])).toHaveLength(0);
  });

  it("hides expired badges", () => {
    expect(publicBadges({ publicationStatus: "PUBLISHED" }, [{ ...base, checkType: "CUSTOMS_STATUS", nextReviewAt: new Date("2020-01-01") }])).toHaveLength(0);
  });

  it("a badge disappears when a reviewer changes the check away from PASSED", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const id = await publishedListing(seller, admin);
    let page = await getListingForPage(null, id);
    expect(page!.listing.badges.map((b) => b.checkType)).toContain("CUSTOMS_STATUS");
    await recordCheck(admin, id, { checkType: "CUSTOMS_STATUS", status: "NEEDS_INFO", internalNotes: "Document expired" });
    page = await getListingForPage(null, id);
    expect(page!.listing.badges.map((b) => b.checkType)).not.toContain("CUSTOMS_STATUS");
  });

  it("enabling 'public badge' on a non-passed check is ignored", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const id = await publishedListing(seller, admin);
    await recordCheck(admin, id, { checkType: "WARRANTY_EVIDENCE", status: "IN_PROGRESS", publicBadge: "on", internalNotes: "Waiting" });
    const page = await getListingForPage(null, id);
    expect(page!.listing.badges.map((b) => b.checkType)).not.toContain("WARRANTY_EVIDENCE");
  });
});
