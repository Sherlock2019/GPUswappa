"use server";

import { getActor } from "@/lib/auth";
import { clientKey, formObject, run, toActionState, type ActionState } from "@/lib/actions-util";
import { LIMITS, rateLimit } from "@/lib/ratelimit";
import { closeMyRequest, createBuyerRequest, createContact, createPartnerEnquiry, createSwap } from "@/lib/services/marketplace";

async function limited(scope: string) {
  rateLimit(await clientKey(scope), ...LIMITS.publicForm);
}

export async function createRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await limited("request");
  } catch (e) {
    return toActionState(e);
  }
  return run(async () => createBuyerRequest(await getActor(), formObject(fd)), "requests.submitted", ["/requests", "/dashboard/requests"]);
}

export async function createSwapAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await limited("swap");
  } catch (e) {
    return toActionState(e);
  }
  return run(async () => createSwap(await getActor(), formObject(fd)), "swap.submitted", ["/dashboard/swaps"]);
}

export async function contactAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await limited("contact");
  } catch (e) {
    return toActionState(e);
  }
  return run(async () => createContact(await getActor(), formObject(fd)), "contact.sent");
}

export async function partnerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await limited("partner");
  } catch (e) {
    return toActionState(e);
  }
  return run(async () => createPartnerEnquiry(await getActor(), formObject(fd)), "about.sent");
}

export async function closeMyRequestAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => closeMyRequest(await getActor(), String(fd.get("id"))), "common.saved", ["/dashboard/requests"]);
}
