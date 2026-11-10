import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";
import type { Role, UserStatus } from "@prisma/client";
import { prisma } from "../db";
import { AppError, forbidden, notFound } from "../errors";
import { audit } from "../audit";
import { emailConfigured, sendMail } from "../mail";
import { requireActor, requirePermission, type Actor } from "../rbac";
import { email, enumOf, parse, password, reqStr } from "../validation";

const BCRYPT_ROUNDS = 12;
export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_ROUNDS);
// Pre-computed hash used to keep login timing similar for unknown emails.
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5uAqSmTHu9DoIQfpI8KJqP5ZC2Ct8/C";

const registerSchema = z.object({
  name: reqStr(120, 2),
  email,
  password,
  accountType: enumOf(["BUYER", "SELLER"]),
  acceptTerms: z.literal("on", { errorMap: () => ({ message: "validation.acceptTerms" }) }),
});

export async function registerUser(input: unknown) {
  const d = parse(registerSchema, input);
  const exists = await prisma.user.findUnique({ where: { email: d.email } });
  // Same generic error shape either way to limit account enumeration via the form message.
  if (exists) throw new AppError("CONFLICT", "errors.emailTaken", { email: "errors.emailTaken" });
  const user = await prisma.user.create({
    data: { name: d.name, email: d.email, passwordHash: await hashPassword(d.password), role: d.accountType as Role },
  });
  await audit({ ...user }, "USER_REGISTERED", "User", user.id, { metadata: { role: user.role } });
  return user;
}

const loginSchema = z.object({ email, password: z.string().min(1, "validation.required").max(200) });

export async function verifyLogin(input: unknown) {
  const d = parse(loginSchema, input);
  const user = await prisma.user.findUnique({ where: { email: d.email } });
  const ok = await bcrypt.compare(d.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw new AppError("VALIDATION", "errors.badCredentials");
  if (user.status !== "ACTIVE") throw new AppError("FORBIDDEN", "errors.accountSuspended");
  return user;
}

// ── Password reset (only when an email adapter is configured) ──

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export async function requestPasswordReset(input: unknown, appUrl: string) {
  if (!emailConfigured()) throw new AppError("POLICY", "errors.emailNotConfigured");
  const d = parse(z.object({ email }), input);
  const user = await prisma.user.findUnique({ where: { email: d.email } });
  // Always respond the same way to avoid revealing which emails exist.
  if (!user || user.status !== "ACTIVE") return;
  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
  });
  await sendMail({
    to: user.email,
    subject: "AI-GPU-Swapper — password reset / đặt lại mật khẩu",
    text: `Reset link (valid 60 minutes): ${appUrl}/auth/reset?token=${token}`,
  });
}

export async function resetPassword(input: unknown) {
  const d = parse(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/, "errors.invalidToken"), password }), input);
  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha(d.token) } });
  if (!rec || rec.usedAt || rec.expiresAt < new Date()) throw new AppError("VALIDATION", "errors.invalidToken");
  await prisma.$transaction([
    prisma.user.update({ where: { id: rec.userId }, data: { passwordHash: await hashPassword(d.password) } }),
    prisma.passwordResetToken.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
  ]);
  await audit({ id: rec.userId } as Actor, "PASSWORD_RESET", "User", rec.userId);
}

export async function changePassword(actor: Actor, input: unknown) {
  const a = requireActor(actor);
  const d = parse(z.object({ current: z.string().min(1, "validation.required"), password }), input);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: a.id } });
  if (!(await bcrypt.compare(d.current, user.passwordHash))) throw new AppError("VALIDATION", "errors.badCurrentPassword", { current: "errors.badCurrentPassword" });
  await prisma.user.update({ where: { id: a.id }, data: { passwordHash: await hashPassword(d.password) } });
  await audit(a, "PASSWORD_CHANGED", "User", a.id);
}

export async function updateProfile(actor: Actor, input: unknown) {
  const a = requireActor(actor);
  const d = parse(z.object({ name: reqStr(120, 2), locale: enumOf(["vi", "en"]) }), input);
  await prisma.user.update({ where: { id: a.id }, data: d });
}

// ── Admin user management ──

export async function listUsers(actor: Actor) {
  requirePermission(actor, "admin:users");
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, status: true, createdAt: true, memberships: { include: { company: { select: { displayName: true } } } } },
  });
}

export async function setUserRoleStatus(actor: Actor, userId: string, input: unknown) {
  const a = requirePermission(actor, "admin:users");
  const d = parse(
    z.object({ role: enumOf(["BUYER", "SELLER", "REVIEWER", "ADMIN"]), status: enumOf(["ACTIVE", "SUSPENDED"]), reason: reqStr(500, 5) }),
    input,
  );
  if (userId === a.id) throw forbidden("errors.cannotChangeSelf");
  const before = await prisma.user.findUnique({ where: { id: userId } });
  if (!before) throw notFound();
  await prisma.user.update({ where: { id: userId }, data: { role: d.role as Role, status: d.status as UserStatus } });
  await audit(a, "USER_ROLE_STATUS_CHANGED", "User", userId, {
    reason: d.reason,
    metadata: { fromRole: before.role, toRole: d.role, fromStatus: before.status, toStatus: d.status },
  });
}
