import "server-only";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "./db";
import type { Actor } from "./rbac";

export type SessionData = { userId?: string; issuedAt?: number };

function sessionPassword() {
  const pw = process.env.SESSION_SECRET;
  if (!pw || pw.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters");
  return pw;
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), {
    password: sessionPassword(),
    cookieName: "gs_session",
    ttl: 60 * 60 * 24 * 7,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    },
  });
}

/** Loads the current user fresh from the DB on every request (role/status changes apply immediately). */
export const getActor = cache(async (): Promise<Actor> => {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, role: true, status: true, name: true, email: true },
  });
  if (!user || user.status !== "ACTIVE") return null;
  return user;
});
