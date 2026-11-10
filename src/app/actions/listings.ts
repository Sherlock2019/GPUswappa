"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getActor } from "@/lib/auth";
import { formObject, run, toActionState, type ActionState } from "@/lib/actions-util";
import { archiveOwnListing, createDraft, replyToReview, saveDraftStep, submitListing, toggleSaved, WIZARD_STEPS } from "@/lib/services/listings";
import { deleteDocument, deleteListingImage, uploadListingDocument, uploadListingImage, type UploadFile } from "@/lib/services/files";
import { acceptBrokerageTerms } from "@/lib/services/brokerage";

export async function createDraftAction(): Promise<ActionState> {
  let id: string;
  try {
    id = (await createDraft(await getActor())).id;
  } catch (e) {
    return toActionState(e);
  }
  redirect(`/dashboard/listings/${id}?step=1`);
}

export async function saveStepAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const o = formObject(fd);
  const id = String(o.listingId);
  const step = Number(o.step);
  const res = await run(async () => saveDraftStep(await getActor(), id, step, o), "common.saved", [`/dashboard/listings/${id}`]);
  if (res.ok && o.intent === "next") redirect(`/dashboard/listings/${id}?step=${Math.min(step + 1, WIZARD_STEPS)}`);
  return res;
}

export async function uploadImageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  return run(async () => uploadListingImage(await getActor(), id, fd.get("file") as unknown as UploadFile, String(fd.get("altText") ?? "")), "common.saved", [`/dashboard/listings/${id}`]);
}

export async function deleteImageAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => deleteListingImage(await getActor(), String(fd.get("id"))), "common.saved", [`/dashboard/listings/${fd.get("listingId")}`]);
}

export async function uploadListingDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  return run(async () => uploadListingDocument(await getActor(), id, String(fd.get("type")), fd.get("file") as unknown as UploadFile), "common.saved", [`/dashboard/listings/${id}`]);
}

export async function deleteListingDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => deleteDocument(await getActor(), String(fd.get("id"))), "common.saved", [`/dashboard/listings/${fd.get("listingId")}`]);
}

export async function acceptTermsAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim();
  return run(async () => acceptBrokerageTerms(await getActor(), id, formObject(fd), { ip }), "common.saved", [`/dashboard/listings/${id}`]);
}

export async function submitListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  return run(async () => submitListing(await getActor(), id), "sell.submitted", [`/dashboard/listings/${id}`, "/dashboard/listings"]);
}

export async function archiveListingAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  return run(async () => archiveOwnListing(await getActor(), id), "common.saved", [`/dashboard/listings/${id}`, "/dashboard/listings", "/marketplace"]);
}

export async function replyReviewAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  return run(async () => replyToReview(await getActor(), id, String(fd.get("body") ?? "")), "common.sent", [`/dashboard/listings/${id}`]);
}

export async function toggleSaveAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("listingId"));
  return run(async () => toggleSaved(await getActor(), id), "common.saved", [`/listings/${id}`, "/dashboard/saved"]);
}
