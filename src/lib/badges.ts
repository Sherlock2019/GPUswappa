import type { CheckType, PublicationStatus, ReviewCheck } from "@prisma/client";

/** The eight public badges and the review check each one depends on. */
export const BADGE_CHECKS: CheckType[] = [
  "SELLER_IDENTITY", // Company identity reviewed
  "SELLER_AUTHORITY", // Seller authority reviewed
  "OWNERSHIP_EVIDENCE", // Ownership evidence reviewed
  "CUSTOMS_STATUS", // Customs status reviewed
  "TECHNICAL_CONDITION", // Technical report available
  "WARRANTY_EVIDENCE", // Warranty information reviewed
  "DATA_SANITISATION", // Data sanitisation report available
  "EXPORT_CONTROL", // Export-control review completed, where applicable
];

export type PublicBadge = { checkType: CheckType; reviewedAt: Date };

/**
 * A badge is public ONLY when ALL of the following hold:
 *  - the listing is published,
 *  - the check maps to a public badge,
 *  - an authorised reviewer recorded status PASSED (with reviewer + date),
 *  - the reviewer explicitly enabled the public badge,
 *  - the next-review/expiry date (if any) has not passed.
 * "NOT_APPLICABLE", "IN_PROGRESS", etc. never produce a badge.
 */
export function publicBadges(
  listing: { publicationStatus: PublicationStatus },
  checks: Pick<ReviewCheck, "checkType" | "status" | "publicBadge" | "reviewerId" | "reviewedAt" | "nextReviewAt">[],
  now = new Date(),
): PublicBadge[] {
  if (listing.publicationStatus !== "PUBLISHED") return [];
  return checks
    .filter(
      (c) =>
        BADGE_CHECKS.includes(c.checkType) &&
        c.status === "PASSED" &&
        c.publicBadge &&
        !!c.reviewerId &&
        !!c.reviewedAt &&
        (!c.nextReviewAt || c.nextReviewAt > now),
    )
    .sort((a, b) => BADGE_CHECKS.indexOf(a.checkType) - BADGE_CHECKS.indexOf(b.checkType))
    .map((c) => ({ checkType: c.checkType, reviewedAt: c.reviewedAt! }));
}
