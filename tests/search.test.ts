import { beforeAll, describe, expect, it } from "vitest";
import { searchListings } from "../src/lib/services/listings";
import { recordCheck } from "../src/lib/services/review";
import { completeDraft, makeCompany, makeUser, publishedListing } from "./helpers";
import { submitListing } from "../src/lib/services/listings";

let cheapId: string, pricyId: string, hanoiId: string;
const tag = `zz${Date.now().toString(36)}`;

beforeAll(async () => {
  const seller = await makeUser("SELLER");
  await makeCompany(seller);
  const admin = await makeUser("ADMIN");
  cheapId = await publishedListing(seller, admin, { title: `Cheap ${tag} RTX workstation`, price: "300.000.000", model: "4090", qty: "4" });
  pricyId = await publishedListing(seller, admin, { title: `Pricey ${tag} H100 server`, price: "6.000.000.000", qty: "8", txn: "SALE_OR_SWAP" });
  hanoiId = await publishedListing(seller, admin, { title: `Hanoi ${tag} H100 node`, price: "2.000.000.000", qty: "8", locationCode: "ha-noi" });
  // An unpublished listing must never appear
  const draft = await completeDraft(seller, { title: `Hidden ${tag} under review` });
  await submitListing(seller, draft.id);
  // Give only the cheap listing a "Technical report available" badge
  await recordCheck(admin, cheapId, { checkType: "TECHNICAL_CONDITION", status: "PASSED", evidenceRef: "R1", publicBadge: "on" });
});

describe("marketplace search & filters", () => {
  it("keyword search only returns published listings", async () => {
    const r = await searchListings({ q: tag });
    const titles = r.items.map((i) => i.title);
    expect(titles).toHaveLength(3);
    expect(titles.join()).not.toContain("Hidden");
  });

  it("filters by price range, quantity, model, location, transaction type", async () => {
    const ids = (r: Awaited<ReturnType<typeof searchListings>>) => r.items.map((i) => i.id);
    expect(ids(await searchListings({ q: tag, priceMax: "1000000000" }))).toEqual([cheapId]);
    expect(ids(await searchListings({ q: tag, qtyMin: "8" })).sort()).toEqual([pricyId, hanoiId].sort());
    expect(ids(await searchListings({ q: tag, location: "ha-noi" }))).toEqual([hanoiId]);
    expect(ids(await searchListings({ q: tag, txn: "SWAP" }))).toEqual([pricyId]);
    expect(ids(await searchListings({ q: tag, verified: "TECHNICAL_CONDITION" }))).toEqual([cheapId]);
  });

  it("sorts by price and ignores invalid parameters safely", async () => {
    const asc = await searchListings({ q: tag, sort: "price_asc" });
    expect(asc.items.map((i) => i.id)).toEqual([cheapId, hanoiId, pricyId]);
    const desc = await searchListings({ q: tag, sort: "price_desc", condition: "NOT_A_CONDITION", priceMin: "abc" });
    expect(desc.items[0].id).toBe(pricyId);
  });
});
