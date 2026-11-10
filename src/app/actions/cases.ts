"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { clientKey, formObject, run, toActionState, type ActionState } from "@/lib/actions-util";
import { LIMITS, rateLimit } from "@/lib/ratelimit";
import * as B from "@/lib/services/brokerage";

const casePaths = (id: string) => [`/admin/cases/${id}`, `/dashboard/cases/${id}`, "/admin/cases", "/dashboard/cases"];

export async function createEnquiryAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const listingId = String(fd.get("listingId"));
  let id: string;
  try {
    rateLimit(await clientKey("enquiry"), ...LIMITS.publicForm);
    id = (await B.createEnquiry(await getActor(), listingId, formObject(fd))).id;
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/dashboard/cases/${id}?sent=1`);
}

export async function postMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.postMessage(await getActor(), id, formObject(fd)), "common.sent", casePaths(id));
}

export async function relayMessageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.relayMessage(await getActor(), id, formObject(fd)), "common.sent", casePaths(id));
}

export async function setCaseStatusAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.setCaseStatus(await getActor(), id, formObject(fd)), "common.saved", casePaths(id));
}

export async function assignBrokerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.assignBroker(await getActor(), id, String(fd.get("brokerId") || "") || null), "common.saved", casePaths(id));
}

export async function cancelMyCaseAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.cancelMyCase(await getActor(), id), "common.saved", casePaths(id));
}

export async function submitOfferAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.submitOffer(await getActor(), id, formObject(fd)), "common.sent", casePaths(id));
}

export async function relayOfferAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.relayOffer(await getActor(), String(fd.get("offerId"))), "common.sent", casePaths(id));
}

export async function respondOfferAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.respondOffer(await getActor(), String(fd.get("offerId")), formObject(fd)), "common.saved", casePaths(id));
}

export async function requestIntroAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.requestIntroduction(await getActor(), id, formObject(fd, ["sellerFieldsToBuyer", "buyerFieldsToSeller"])), "common.saved", [...casePaths(id), "/admin/introductions"]);
}

export async function declareRelationshipAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.declareExistingRelationship(await getActor(), String(fd.get("introductionId")), formObject(fd)), "common.sent", casePaths(id));
}

export async function reviewIntroAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.reviewIntroduction(await getActor(), String(fd.get("introductionId")), formObject(fd)), "common.saved", [...casePaths(id), "/admin/introductions"]);
}

export async function completeIntroAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.completeIntroduction(await getActor(), String(fd.get("introductionId")), formObject(fd)), "common.saved", [...casePaths(id), "/admin/introductions"]);
}

export async function cancelIntroAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.cancelIntroduction(await getActor(), String(fd.get("introductionId")), String(fd.get("reason") ?? "")), "common.saved", casePaths(id));
}

export async function scheduleInspectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.scheduleInspection(await getActor(), id, formObject(fd)), "common.saved", [...casePaths(id), "/admin/inspections"]);
}

export async function updateInspectionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  return run(async () => B.updateInspection(await getActor(), String(fd.get("inspectionId")), formObject(fd)), "common.saved", [...casePaths(id), "/admin/inspections"]);
}

export async function openTransactionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("enquiryId"));
  let txId: string;
  try {
    txId = (await B.openTransaction(await getActor(), id)).id;
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/admin/transactions/${txId}`);
}

export async function updateTransactionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const txId = String(fd.get("txId"));
  return run(async () => B.updateTransaction(await getActor(), txId, formObject(fd)), "common.saved", [`/admin/transactions/${txId}`, "/admin/transactions"]);
}

export async function adminCommissionAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const txId = String(fd.get("txId"));
  return run(async () => B.adminUpdateCommission(await getActor(), txId, formObject(fd)), "common.saved", [`/admin/transactions/${txId}`, "/admin/transactions"]);
}
