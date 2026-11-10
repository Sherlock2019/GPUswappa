import { prisma } from "./db";

/**
 * Platform policies and site settings. These are configurable business safeguards,
 * not universal legal rules. Administrators edit them in /admin/content.
 */
export const SETTING_DEFAULTS = {
  // Review policies
  "policy.holdOnUnknownAnswers": "true",
  "policy.requireExportReviewForFlaggedModels": "true",
  "policy.requiredChecksForApproval": "SELLER_IDENTITY,SELLER_AUTHORITY,OWNERSHIP_EVIDENCE,FINANCING_LEASE,CUSTOMS_STATUS",
  "policy.badgeValidityDays": "365",
  // Introduction policy: both companies must have VERIFIED identity before an introduction
  "policy.introRequiresVerifiedCompanies": "true",
  // Brokerage pricing (US$-equivalent; actual billing currency/FX/tax recorded per invoice as approved by the business)
  "fees.listingMonthlyUsdEquivalent": "100",
  "fees.standardCommissionPct": "5",
  "fees.paymentDeadlineDays": "14",
  "fees.agreementTermMonths": "6",
  // Tax on platform fees — shown ONLY when configured by the business (e.g. "10"). Empty = not shown.
  "tax.feeTaxPct": "",
  "tax.feeTaxLabel": "",
  // Terms versions (drafts — require review by Vietnamese counsel)
  "terms.brokerageVersion": "BA-DRAFT-2026-11",
  "terms.buyerIntroVersion": "BI-DRAFT-2026-11",
  // Seller information that is ALWAYS shown publicly on listings (configurable; to be confirmed by Vietnamese counsel).
  // Allowed: legalName,displayName,registrationNumber,address,city,website,companyType
  "disclosure.publicSellerFields": "companyType,city",
  "disclosure.reviewedByCounsel": "false",
  // Payment partner — never shown as operational unless status=AVAILABLE_VIA_PARTNER, name set and content approved.
  "payments.partnerStatus": "NOT_CONFIGURED",
  "payments.partnerName": "",
  "payments.partnerDescription": "",
  "payments.partnerApproved": "false",
  // Indicative USD equivalent for listing prices — shown only when rate AND date AND source are set
  "fx.usdVndRate": "",
  "fx.rateDate": "",
  "fx.source": "",
  // Operator identity — empty means "not yet provided"
  "site.operatorLegalName": "",
  "site.businessRegistrationNumber": "",
  "site.ecommerceRegistration": "",
  "site.contactEmail": "",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.siteSetting.findMany();
  const out = { ...SETTING_DEFAULTS } as Settings;
  for (const r of rows) if (r.key in out) out[r.key as SettingKey] = r.value;
  return out;
}

export const bool = (v: string) => v === "true";

export function fxInfo(s: Settings): { rate: number; date: string; source: string } | null {
  const rate = Number(s["fx.usdVndRate"]);
  if (!Number.isFinite(rate) || rate <= 0 || !s["fx.rateDate"] || !s["fx.source"]) return null;
  return { rate, date: s["fx.rateDate"], source: s["fx.source"] };
}

export const PUBLIC_DISCLOSURE_FIELDS = ["legalName", "displayName", "registrationNumber", "address", "city", "website", "companyType"] as const;
export type PublicDisclosureField = (typeof PUBLIC_DISCLOSURE_FIELDS)[number];

export function publicSellerFields(s: Settings): PublicDisclosureField[] {
  return s["disclosure.publicSellerFields"]
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is PublicDisclosureField => (PUBLIC_DISCLOSURE_FIELDS as readonly string[]).includes(x));
}

/** Payment partner is displayed only when fully configured AND approved by an administrator. */
export function paymentPartner(s: Settings): { name: string; description: string } | null {
  if (s["payments.partnerStatus"] !== "AVAILABLE_VIA_PARTNER") return null;
  if (!bool(s["payments.partnerApproved"]) || !s["payments.partnerName"].trim()) return null;
  return { name: s["payments.partnerName"].trim(), description: s["payments.partnerDescription"].trim() };
}
