"use server";

import { getActor } from "@/lib/auth";
import { formObject, run, type ActionState } from "@/lib/actions-util";
import * as R from "@/lib/services/review";
import * as F from "@/lib/services/files";
import * as C from "@/lib/services/companies";
import * as U from "@/lib/services/users";
import * as A from "@/lib/services/admin";
import * as M from "@/lib/services/marketplace";
import * as B from "@/lib/services/brokerage";

const lp = (id: string) => [`/admin/listings/${id}`, "/admin/listings", `/listings/${id}`, "/marketplace", "/"];
const id = (fd: FormData, k = "id") => String(fd.get(k) ?? "");

// ── Listing review ──
export async function recordCheckAction(_: ActionState, fd: FormData) {
  return run(async () => R.recordCheck(await getActor(), id(fd, "listingId"), formObject(fd)), "common.saved", lp(id(fd, "listingId")));
}
export async function decideAction(_: ActionState, fd: FormData) {
  return run(async () => R.decide(await getActor(), id(fd, "listingId"), formObject(fd)), "common.saved", lp(id(fd, "listingId")));
}
export async function recommendAction(_: ActionState, fd: FormData) {
  return run(async () => R.recommend(await getActor(), id(fd, "listingId"), formObject(fd)), "common.saved", lp(id(fd, "listingId")));
}
export async function escalateAction(_: ActionState, fd: FormData) {
  return run(async () => R.escalate(await getActor(), id(fd, "listingId"), formObject(fd)), "common.saved", lp(id(fd, "listingId")));
}
export async function staffMessageAction(_: ActionState, fd: FormData) {
  return run(async () => R.staffMessage(await getActor(), id(fd, "listingId"), String(fd.get("body") ?? "")), "common.sent", lp(id(fd, "listingId")));
}
export async function assignReviewerAction(_: ActionState, fd: FormData) {
  return run(async () => R.assignReviewer(await getActor(), id(fd, "listingId"), id(fd, "reviewerId") || null), "common.saved", lp(id(fd, "listingId")));
}
export async function assignListingBrokerAction(_: ActionState, fd: FormData) {
  return run(async () => B.assignListingBroker(await getActor(), id(fd, "listingId"), id(fd, "brokerId") || null), "common.saved", lp(id(fd, "listingId")));
}
export async function platformRoleAction(_: ActionState, fd: FormData) {
  return run(async () => R.setPlatformRole(await getActor(), id(fd, "listingId"), id(fd, "platformRole")), "common.saved", lp(id(fd, "listingId")));
}
export async function imageApprovalAction(_: ActionState, fd: FormData) {
  return run(async () => F.setImageApproval(await getActor(), id(fd), id(fd, "status") as "APPROVED"), "common.saved", lp(id(fd, "listingId")));
}
export async function docReviewAction(_: ActionState, fd: FormData) {
  return run(async () => F.setDocumentReview(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/documents", ...lp(id(fd, "listingId"))]);
}

// ── Companies & users ──
export async function companyVerificationAction(_: ActionState, fd: FormData) {
  return run(async () => C.setCompanyVerification(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/companies"]);
}
export async function userRoleAction(_: ActionState, fd: FormData) {
  return run(async () => U.setUserRoleStatus(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/users"]);
}

// ── Catalogue ──
export async function categoryAction(_: ActionState, fd: FormData) {
  return run(async () => A.upsertCategory(await getActor(), id(fd) || null, formObject(fd)), "common.saved", ["/admin/catalog"]);
}
export async function gpuModelAction(_: ActionState, fd: FormData) {
  return run(async () => A.upsertGpuModel(await getActor(), id(fd) || null, formObject(fd)), "common.saved", ["/admin/catalog"]);
}
export async function locationAction(_: ActionState, fd: FormData) {
  return run(async () => A.upsertLocation(await getActor(), id(fd) || null, formObject(fd)), "common.saved", ["/admin/catalog"]);
}

// ── Content & settings ──
export async function serviceAction(_: ActionState, fd: FormData) {
  return run(async () => A.updateService(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/content", "/services"]);
}
export async function badgeAction(_: ActionState, fd: FormData) {
  return run(async () => A.updateBadgeDefinition(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/content", "/trust"]);
}
export async function pageAction(_: ActionState, fd: FormData) {
  return run(async () => A.updateContentPage(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/content", `/legal/${id(fd)}`]);
}
export async function settingsAction(_: ActionState, fd: FormData) {
  const o = formObject(fd, ["disclosure.publicSellerFields"]);
  if (Array.isArray(o["disclosure.publicSellerFields"]) && fd.has("__disclosure")) o["disclosure.publicSellerFields"] = (o["disclosure.publicSellerFields"] as string[]).join(",");
  else delete o["disclosure.publicSellerFields"];
  for (const k of ["policy.holdOnUnknownAnswers", "policy.requireExportReviewForFlaggedModels", "policy.introRequiresVerifiedCompanies", "disclosure.reviewedByCounsel", "payments.partnerApproved"]) {
    if (fd.has(`__bool_${k}`)) o[k] = fd.get(k) === "on" ? "true" : "false";
  }
  return run(async () => A.updateSettings(await getActor(), o as Record<string, string>), "common.saved", ["/admin/content", "/admin/disclosure", "/", "/marketplace"]);
}

// ── Inbox ──
export async function swapStatusAction(_: ActionState, fd: FormData) {
  return run(async () => M.updateSwapStatus(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/swaps"]);
}
export async function requestStatusAction(_: ActionState, fd: FormData) {
  return run(async () => M.updateRequestStatus(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/requests"]);
}
export async function contactStatusAction(_: ActionState, fd: FormData) {
  return run(async () => M.updateContactStatus(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/inbox"]);
}
export async function partnerStatusAction(_: ActionState, fd: FormData) {
  return run(async () => M.updatePartnerStatus(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/partners"]);
}

// ── Fees & agreements ──
export async function feePaymentAction(_: ActionState, fd: FormData) {
  return run(async () => B.recordFeePayment(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/fees"]);
}
export async function feeWaiveAction(_: ActionState, fd: FormData) {
  return run(async () => B.waiveOrModifyFee(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/fees"]);
}
export async function reviseAgreementAction(_: ActionState, fd: FormData) {
  return run(async () => B.reviseAgreement(await getActor(), id(fd), formObject(fd)), "common.saved", ["/admin/agreements"]);
}
export async function terminateAgreementAction(_: ActionState, fd: FormData) {
  return run(async () => B.terminateAgreement(await getActor(), id(fd), String(fd.get("reason") ?? "")), "common.saved", ["/admin/agreements"]);
}
