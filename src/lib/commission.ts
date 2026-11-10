import type { CommissionStatus, FeeTrigger, TransactionStatus } from "@prisma/client";

/** Forward progression of a sale. CANCELLED and DISPUTED are terminal/side states, not steps. */
export const TX_ORDER: TransactionStatus[] = [
  "ENQUIRY",
  "NEGOTIATION",
  "INSPECTION",
  "OFFER_ACCEPTED",
  "INTRODUCTION_APPROVED",
  "SALE_AGREEMENT_PENDING",
  "SALE_AGREEMENT_SIGNED",
  "PAYMENT_PENDING",
  "EQUIPMENT_DELIVERED",
  "COMPLETED",
];

const TRIGGER_STEP: Record<FeeTrigger, TransactionStatus> = {
  SALE_AGREEMENT_SIGNED: "SALE_AGREEMENT_SIGNED",
  PAYMENT_PENDING: "PAYMENT_PENDING",
  EQUIPMENT_DELIVERED: "EQUIPMENT_DELIVERED",
  COMPLETED: "COMPLETED",
};

export function triggerReached(status: TransactionStatus, trigger: FeeTrigger): boolean {
  const i = TX_ORDER.indexOf(status);
  return i >= 0 && i >= TX_ORDER.indexOf(TRIGGER_STEP[trigger]);
}

/** Statuses only an administrator sets manually; automatic recalculation never overwrites them. */
const MANUAL: CommissionStatus[] = ["INVOICED", "PAID", "OVERDUE", "WAIVED"];

/**
 * Commission status follows the transaction automatically:
 *  - Cancelled sale → NOT_YET_EARNED (a PAID/INVOICED/WAIVED status recorded by an admin is kept, never invented).
 *  - Disputed sale → DISPUTED.
 *  - Agreement trigger reached → DUE.
 *  - Offer accepted but trigger not reached → PENDING_TRIGGER.
 *  - Otherwise → NOT_YET_EARNED.
 */
export function nextCommissionStatus(current: CommissionStatus, txStatus: TransactionStatus, trigger: FeeTrigger): CommissionStatus {
  if (MANUAL.includes(current)) return current;
  if (txStatus === "CANCELLED") return "NOT_YET_EARNED";
  if (txStatus === "DISPUTED") return "DISPUTED";
  if (triggerReached(txStatus, trigger)) return "DUE";
  if (TX_ORDER.indexOf(txStatus) >= TX_ORDER.indexOf("OFFER_ACCEPTED")) return "PENDING_TRIGGER";
  return "NOT_YET_EARNED";
}

export type CommissionInput = {
  salePrice: bigint | null;
  type: "PERCENT" | "FIXED";
  pct: number | null;
  fixed: bigint | null;
  creditAllowed: boolean;
  creditableFees: bigint; // fees already paid, expressed in the transaction currency
};

/** Pure calculation. Listing-fee credit applies ONLY when the agreement provides for it, capped at the commission. */
export function computeCommission(i: CommissionInput): { gross: bigint | null; credit: bigint; net: bigint | null } {
  let gross: bigint | null = null;
  if (i.type === "FIXED") gross = i.fixed;
  else if (i.salePrice !== null && i.pct !== null) gross = (i.salePrice * BigInt(Math.round(i.pct * 100))) / 10000n;
  if (gross === null) return { gross: null, credit: 0n, net: null };
  const credit = i.creditAllowed ? (i.creditableFees < gross ? i.creditableFees : gross) : 0n;
  return { gross, credit, net: gross - credit };
}

/** Effective commission percentage: an authorised negotiated rate, otherwise the standard rate. */
export function effectivePct(standard: number, negotiated: number | null | undefined) {
  return negotiated !== null && negotiated !== undefined ? negotiated : standard;
}

/** Heuristic contact-detail detector for broker messages. Assists only — not a guarantee of anonymity. */
export function containsContactInfo(text: string): boolean {
  const email = /[^\s@]+@[^\s@]+\.[a-z]{2,}/i;
  const phone = /(\+?84|0)[\s.-]?\d{2,3}[\s.-]?\d{3}[\s.-]?\d{3,4}/;
  const url = /(https?:\/\/|www\.)\S+/i;
  const handle = /\b(zalo|telegram|whatsapp|wechat|skype)\b/i;
  return email.test(text) || phone.test(text) || url.test(text) || handle.test(text);
}
