"use server";

import { redirect } from "next/navigation";
import { getActor } from "@/lib/auth";
import { formObject, run, toActionState, type ActionState } from "@/lib/actions-util";
import { saveMyCompany } from "@/lib/services/companies";
import { uploadCompanyDocument, deleteDocument, type UploadFile } from "@/lib/services/files";
import { changePassword, updateProfile } from "@/lib/services/users";
import { markAllRead } from "@/lib/services/notifications";

export async function saveCompanyAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const o = formObject(fd);
  const res = await run(async () => saveMyCompany(await getActor(), o), "dash.companySaved", ["/dashboard/company", "/dashboard"]);
  const next = typeof o.next === "string" && o.next.startsWith("/") && !o.next.startsWith("//") ? o.next : null;
  if (res.ok && next) redirect(next);
  return res;
}

export async function uploadCompanyDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => uploadCompanyDocument(await getActor(), String(fd.get("companyId")), String(fd.get("type")), fd.get("file") as unknown as UploadFile), "common.saved", ["/dashboard/company"]);
}

export async function deleteDocAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => deleteDocument(await getActor(), String(fd.get("id"))), "common.saved", ["/dashboard/company"]);
}

export async function updateProfileAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return run(async () => updateProfile(await getActor(), formObject(fd)), "common.saved", ["/dashboard/settings"]);
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    await changePassword(await getActor(), formObject(fd));
  } catch (e) {
    return toActionState(e);
  }
  return run(async () => undefined);
}

export async function markAllReadAction(): Promise<ActionState> {
  return run(async () => markAllRead(await getActor()), "common.saved", ["/dashboard/notifications"]);
}
