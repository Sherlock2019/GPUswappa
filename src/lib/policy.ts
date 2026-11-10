import type { CheckStatus, CheckType, Listing, ReviewCheck } from "@prisma/client";
import { bool, type Settings } from "./settings";

export const ALL_CHECKS: CheckType[] = [
  "SELLER_IDENTITY",
  "SELLER_AUTHORITY",
  "OWNERSHIP_EVIDENCE",
  "FINANCING_LEASE",
  "CUSTOMS_STATUS",
  "ASSET_IDENTIFICATION",
  "TECHNICAL_CONDITION",
  "WARRANTY_EVIDENCE",
  "DATA_SANITISATION",
  "EXPORT_CONTROL",
];

/**
 * Neutral review flags raised from the seller's answers. These route a listing to
 * internal hold/review. They are NOT findings of wrongdoing and are never shown publicly.
 */
export type ReviewFlag =
  | "LOCATION_UNKNOWN"
  | "NOT_IN_VIETNAM"
  | "AUTHORITY_UNKNOWN"
  | "NO_AUTHORITY"
  | "ENCUMBRANCE_PRESENT"
  | "ENCUMBRANCE_UNKNOWN"
  | "CUSTOMS_UNKNOWN"
  | "FAULTS_UNKNOWN"
  | "EXPORT_REVIEW";

type Answers = Pick<Listing, "inVietnam" | "ownership" | "encumbrance" | "customsStatus" | "hasKnownFaults"> & {
  exportReviewRequired: boolean;
};

export function computeReviewFlags(a: Answers): ReviewFlag[] {
  const f: ReviewFlag[] = [];
  if (a.inVietnam === "UNKNOWN") f.push("LOCATION_UNKNOWN");
  if (a.inVietnam === "NO") f.push("NOT_IN_VIETNAM");
  if (a.ownership === "UNKNOWN") f.push("AUTHORITY_UNKNOWN");
  if (a.ownership === "NO") f.push("NO_AUTHORITY");
  if (a.encumbrance === "LEASED" || a.encumbrance === "FINANCED" || a.encumbrance === "OTHER_RIGHTS") f.push("ENCUMBRANCE_PRESENT");
  if (a.encumbrance === "UNKNOWN") f.push("ENCUMBRANCE_UNKNOWN");
  if (a.customsStatus === "UNKNOWN") f.push("CUSTOMS_UNKNOWN");
  if (a.hasKnownFaults === "UNKNOWN") f.push("FAULTS_UNKNOWN");
  if (a.exportReviewRequired) f.push("EXPORT_REVIEW");
  return f;
}

/** Flags that place a listing ON_HOLD (private) at submission when the hold policy is on. */
const HOLD_FLAGS: ReviewFlag[] = ["LOCATION_UNKNOWN", "NOT_IN_VIETNAM", "AUTHORITY_UNKNOWN", "NO_AUTHORITY", "ENCUMBRANCE_UNKNOWN", "CUSTOMS_UNKNOWN"];

export function statusOnSubmit(flags: ReviewFlag[], settings: Settings): "UNDER_REVIEW" | "ON_HOLD" {
  if (bool(settings["policy.holdOnUnknownAnswers"]) && flags.some((f) => HOLD_FLAGS.includes(f))) return "ON_HOLD";
  return "UNDER_REVIEW";
}

export function requiredChecks(listing: Pick<Listing, "exportReviewRequired">, settings: Settings): CheckType[] {
  const base = settings["policy.requiredChecksForApproval"]
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is CheckType => (ALL_CHECKS as string[]).includes(s));
  if (listing.exportReviewRequired && bool(settings["policy.requireExportReviewForFlaggedModels"]) && !base.includes("EXPORT_CONTROL")) {
    base.push("EXPORT_CONTROL");
  }
  return base;
}

const RESOLVED: CheckStatus[] = ["PASSED", "NOT_APPLICABLE"];

/**
 * Returns the reasons approval is blocked by policy. An empty array means the
 * policy gates are satisfied. Admins may override with a recorded audit reason.
 */
export function approvalBlockers(
  listing: Pick<Listing, "exportReviewRequired">,
  checks: Pick<ReviewCheck, "checkType" | "status">[],
  settings: Settings,
): string[] {
  const byType = new Map(checks.map((c) => [c.checkType, c.status]));
  const blockers: string[] = [];
  for (const t of requiredChecks(listing, settings)) {
    const s = byType.get(t) ?? "NOT_STARTED";
    if (!RESOLVED.includes(s)) blockers.push(`check:${t}:${s}`);
  }
  for (const c of checks) {
    if (c.status === "FAILED" || c.status === "NEEDS_INFO") {
      const key = `check:${c.checkType}:${c.status}`;
      if (!blockers.includes(key)) blockers.push(key);
    }
  }
  return blockers;
}
