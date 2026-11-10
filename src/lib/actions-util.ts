import "server-only";
import { headers } from "next/headers";
import { AppError } from "./errors";
import { getT } from "./i18n/server";
import { tMessage } from "./i18n";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  details?: string[];
  ts?: number;
};

export async function clientKey(scope: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}

/** Converts a thrown error into a translated, safe ActionState. Unknown errors never leak details. */
export async function toActionState(e: unknown): Promise<ActionState> {
  // Let Next.js redirects/notFound propagate.
  if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_")) throw e;
  const t = await getT();
  if (e instanceof AppError) {
    const fieldErrors = e.fieldErrors ? Object.fromEntries(Object.entries(e.fieldErrors).map(([k, v]) => [k, tMessage(t, v)])) : undefined;
    const details = e.details?.map((d) => {
      if (t(`missing.${d}`) !== `missing.${d}`) return t(`missing.${d}`);
      if (t(d) !== d) return t(d); // e.g. intro.* checklist keys, check:* fall through
      return d;
    });
    return { ok: false, message: tMessage(t, e.message), fieldErrors, details, ts: Date.now() };
  }
  console.error("[action] unexpected error", e);
  return { ok: false, message: t("errors.generic"), ts: Date.now() };
}

export async function okState(messageKey = "common.saved"): Promise<ActionState> {
  const t = await getT();
  return { ok: true, message: t(messageKey), ts: Date.now() };
}

/** Runs a service call, revalidates paths on success and returns a safe ActionState. */
export async function run(fn: () => Promise<unknown>, okKey = "common.saved", paths: string[] = []): Promise<ActionState> {
  try {
    await fn();
  } catch (e) {
    return toActionState(e);
  }
  const { revalidatePath } = await import("next/cache");
  for (const p of paths) revalidatePath(p, p.endsWith("]") ? "page" : undefined);
  return okState(okKey);
}

/** FormData → object; keys listed in `multi` become arrays (checkbox groups). */
export function formObject(fd: FormData, multi: string[] = []) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue;
    if (multi.includes(k)) (o[k] = (o[k] as string[] | undefined) ?? []), (o[k] as string[]).push(v);
    else o[k] = v;
  }
  for (const k of multi) o[k] ??= [];
  return o;
}
