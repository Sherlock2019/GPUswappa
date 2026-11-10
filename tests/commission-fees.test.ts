import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/db";
import { computeCommission, effectivePct, nextCommissionStatus, triggerReached, containsContactInfo } from "../src/lib/commission";
import {
  adminUpdateCommission,
  createEnquiry,
  feeSummary,
  openTransaction,
  recordFeePayment,
  reviseAgreement,
  acceptBrokerageTerms,
  updateTransaction,
  waiveOrModifyFee,
} from "../src/lib/services/brokerage";
import { listAudit } from "../src/lib/services/admin";
import { makeCompany, makeUser, publishedListing } from "./helpers";

describe("commission rules (pure)", () => {
  it("13. standard commission is 5% unless an authorised negotiated rate applies", () => {
    expect(effectivePct(5, null)).toBe(5);
    expect(effectivePct(5, 3.5)).toBe(3.5);
    const r = computeCommission({ salePrice: 80_000n, type: "PERCENT", pct: 5, fixed: null, creditAllowed: false, creditableFees: 200n });
    expect(r).toEqual({ gross: 4_000n, credit: 0n, net: 4_000n });
  });

  it("16. listing-fee credit applies only when the agreement provides it (capped at commission)", () => {
    expect(computeCommission({ salePrice: 80_000n, type: "PERCENT", pct: 5, fixed: null, creditAllowed: true, creditableFees: 200n })).toEqual({ gross: 4_000n, credit: 200n, net: 3_800n });
    expect(computeCommission({ salePrice: 1_000n, type: "PERCENT", pct: 5, fixed: null, creditAllowed: true, creditableFees: 200n }).net).toBe(0n);
  });

  it("14. commission is not due before the configured trigger", () => {
    expect(triggerReached("OFFER_ACCEPTED", "SALE_AGREEMENT_SIGNED")).toBe(false);
    expect(nextCommissionStatus("NOT_YET_EARNED", "OFFER_ACCEPTED", "SALE_AGREEMENT_SIGNED")).toBe("PENDING_TRIGGER");
    expect(nextCommissionStatus("NOT_YET_EARNED", "SALE_AGREEMENT_SIGNED", "SALE_AGREEMENT_SIGNED")).toBe("DUE");
    expect(nextCommissionStatus("NOT_YET_EARNED", "SALE_AGREEMENT_SIGNED", "EQUIPMENT_DELIVERED")).toBe("PENDING_TRIGGER");
    expect(nextCommissionStatus("NOT_YET_EARNED", "COMPLETED", "EQUIPMENT_DELIVERED")).toBe("DUE");
  });

  it("15. cancelling never marks a commission paid", () => {
    expect(nextCommissionStatus("DUE", "CANCELLED", "SALE_AGREEMENT_SIGNED")).toBe("NOT_YET_EARNED");
    expect(nextCommissionStatus("PENDING_TRIGGER", "CANCELLED", "SALE_AGREEMENT_SIGNED")).toBe("NOT_YET_EARNED");
  });

  it("flags likely contact details in broker messages (heuristic only)", () => {
    expect(containsContactInfo("email me at a@b.vn")).toBe(true);
    expect(containsContactInfo("call 0912 345 678")).toBe(true);
    expect(containsContactInfo("message me on Zalo")).toBe(true);
    expect(containsContactInfo("8x H100 with 400G NDR")).toBe(false);
  });
});

describe("listing fees and transactions (services)", () => {
  it("12. records the standard fee as US$100 equivalent per listing per month without asserting a billing currency", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const id = await publishedListing(seller, admin);
    const fee = await prisma.listingFee.findFirstOrThrow({ where: { listingId: id } });
    expect(fee.usdEquivalent).toBe(100);
    expect(fee.billedCurrency).toBeNull();
    expect(fee.status).toBe("DUE");
    expect(fee.periodEnd.getTime()).toBeGreaterThan(fee.periodStart.getTime());
    // Manual payment recording with actual billing details
    await recordFeePayment(admin, fee.id, { billedCurrency: "VND", billedAmount: "2.600.000", fxBasis: "Demo rate", invoiceRef: "INV-TEST-1" });
    const paid = await prisma.listingFee.findUniqueOrThrow({ where: { id: fee.id } });
    expect(paid.status).toBe("PAID");
    expect(paid.billedCurrency).toBe("VND");
  });

  it("waiving or modifying a fee requires a reason and is audited", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const id = await publishedListing(seller, admin);
    const fee = await prisma.listingFee.findFirstOrThrow({ where: { listingId: id } });
    await expect(waiveOrModifyFee(admin, fee.id, { action: "WAIVE" })).rejects.toBeInstanceOf(Error);
    await waiveOrModifyFee(admin, fee.id, { action: "WAIVE", reason: "Launch promotion approved by management" });
    expect((await prisma.listingFee.findUniqueOrThrow({ where: { id: fee.id } })).status).toBe("WAIVED");
    expect((await listAudit(admin)).some((a) => a.action === "LISTING_FEE_WAIVED" && a.resourceId === fee.id)).toBe(true);
    const broker = await makeUser("BROKER");
    await expect(waiveOrModifyFee(broker, fee.id, { action: "WAIVE", reason: "Broker should not be able to waive" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("transactions: 5% by default, due only at the trigger, cancel resets, PAID refused on cancelled", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const buyer = await makeUser("BUYER");
    await makeCompany(buyer);
    const admin = await makeUser("ADMIN");
    const broker = await makeUser("BROKER");
    const id = await publishedListing(seller, admin, { brokerId: broker.id });
    const e = await createEnquiry(buyer, id, { message: "Fictional enquiry for transaction test", representative: "Rep", acceptTerms: "on" });
    let tx = await openTransaction(broker, e.id);
    expect(Number(tx.commissionPct)).toBe(5);
    tx = await updateTransaction(broker, tx.id, { status: "OFFER_ACCEPTED", salePrice: "80000", currency: "USD" });
    expect(tx.commissionStatus).toBe("PENDING_TRIGGER");
    expect(tx.commissionAmount).toBe(4000n);
    tx = await updateTransaction(broker, tx.id, { status: "SALE_AGREEMENT_SIGNED", currency: "USD" });
    expect(tx.commissionStatus).toBe("DUE");
    tx = await updateTransaction(broker, tx.id, { status: "CANCELLED", currency: "USD" });
    expect(tx.commissionStatus).toBe("NOT_YET_EARNED");
    await expect(adminUpdateCommission(admin, tx.id, { commissionStatus: "PAID", disputeStatus: "NONE", commissionType: "PERCENT", reason: "Trying to mark paid" })).rejects.toMatchObject({ message: "errors.paidOnCancelled" });
    // Fee summary shows listing fees and commission separately; tax hidden when not configured
    const s = await feeSummary(tx.id);
    expect(s.listingFeesUsdEquivalent).toBe(100);
    expect(s.tax).toBeNull();
    expect(s.creditApplies).toBe(false);
  });

  it("a negotiated rate applies only after the seller accepts the revised agreement; credit only when agreed", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const buyer = await makeUser("BUYER");
    await makeCompany(buyer);
    const admin = await makeUser("ADMIN");
    const broker = await makeUser("BROKER");
    const id = await publishedListing(seller, admin, { brokerId: broker.id });
    const current = await prisma.brokerageAgreement.findFirstOrThrow({ where: { listingId: id, status: "ACTIVE" } });
    await expect(reviseAgreement(broker, current.id, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(reviseAgreement(admin, current.id, { feeTrigger: "SALE_AGREEMENT_SIGNED", paymentDeadlineDays: "14", negotiatedCommissionPct: "3", reason: "Negotiated volume discount" })).rejects.toBeInstanceOf(Error); // evidence note required
    await reviseAgreement(admin, current.id, { feeTrigger: "SALE_AGREEMENT_SIGNED", paymentDeadlineDays: "14", negotiatedCommissionPct: "3", negotiatedNote: "Signed addendum ref ADD-1 (fictional)", listingFeeCredit: "on", reason: "Negotiated volume discount" });
    // Not yet accepted → still the active (5%) agreement
    expect((await prisma.brokerageAgreement.findFirstOrThrow({ where: { listingId: id, status: "ACTIVE" } })).id).toBe(current.id);
    await acceptBrokerageTerms(seller, id, { representative: "Seller Rep", acceptTerms: "on" });
    const active = await prisma.brokerageAgreement.findFirstOrThrow({ where: { listingId: id, status: "ACTIVE" } });
    expect(Number(active.negotiatedCommissionPct)).toBe(3);
    const fee = await prisma.listingFee.findFirstOrThrow({ where: { listingId: id } });
    await recordFeePayment(admin, fee.id, { billedCurrency: "USD", billedAmount: "100" });
    const e = await createEnquiry(buyer, id, { message: "Fictional enquiry for negotiated test", representative: "Rep", acceptTerms: "on" });
    let tx = await openTransaction(broker, e.id);
    expect(Number(tx.commissionPct)).toBe(3);
    tx = await updateTransaction(broker, tx.id, { status: "SALE_AGREEMENT_SIGNED", salePrice: "80000", currency: "USD" });
    expect(tx.commissionAmount).toBe(2_300n); // 3% of 80,000 = 2,400 minus US$100 credit
    expect(tx.listingFeeCredit).toBe(100n);
  });
});
