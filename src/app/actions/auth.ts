"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActor, getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { clientKey, okState, toActionState, type ActionState } from "@/lib/actions-util";
import { LIMITS, rateLimit } from "@/lib/ratelimit";
import { registerUser, requestPasswordReset, resetPassword, verifyLogin } from "@/lib/services/users";
import { formObject } from "@/lib/actions-util";
import { isLocale } from "@/lib/i18n";

/** Only allow local, same-site redirect targets. */
function safeNext(v: unknown) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/dashboard";
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let next = "/dashboard";
  try {
    rateLimit(await clientKey("login"), ...LIMITS.login);
    const input = formObject(fd);
    const user = await verifyLogin(input);
    const session = await getSession();
    session.userId = user.id;
    session.issuedAt = Date.now();
    await session.save();
    (await cookies()).set("locale", user.locale, { path: "/", sameSite: "lax", maxAge: 31536000 });
    await audit({ id: user.id } as never, "USER_SIGNED_IN", "User", user.id);
    next = safeNext(input.next);
    if (next === "/dashboard" && ["ADMIN", "REVIEWER", "BROKER"].includes(user.role)) next = "/admin";
  } catch (e) {
    return toActionState(e);
  }
  redirect(next);
}

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  let next = "/dashboard/company";
  try {
    rateLimit(await clientKey("register"), ...LIMITS.register);
    const input = formObject(fd);
    const user = await registerUser(input);
    const session = await getSession();
    session.userId = user.id;
    session.issuedAt = Date.now();
    await session.save();
    const n = safeNext(input.next);
    if (n !== "/dashboard") next = `/dashboard/company?next=${encodeURIComponent(n)}`;
  } catch (e) {
    return toActionState(e);
  }
  redirect(next);
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/");
}

export async function setLocaleAction(fd: FormData) {
  const locale = fd.get("locale");
  if (!isLocale(locale)) return;
  (await cookies()).set("locale", locale, { path: "/", sameSite: "lax", maxAge: 31536000 });
  const actor = await getActor();
  if (actor) await prisma.user.update({ where: { id: actor.id }, data: { locale } });
  revalidatePath("/", "layout");
}

export async function requestResetAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    rateLimit(await clientKey("reset"), ...LIMITS.passwordReset);
    await requestPasswordReset(formObject(fd), process.env.APP_URL ?? "http://localhost:3410");
  } catch (e) {
    return toActionState(e);
  }
  return okState("auth.resetSent");
}

export async function resetPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  try {
    rateLimit(await clientKey("reset"), ...LIMITS.passwordReset);
    await resetPassword(formObject(fd));
  } catch (e) {
    return toActionState(e);
  }
  return okState("auth.resetDone");
}
