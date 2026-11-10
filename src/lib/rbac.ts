import type { Role, UserStatus } from "@prisma/client";
import { forbidden, unauthenticated } from "./errors";

/** The authenticated principal passed to every service call. `null` = anonymous visitor. */
export type Actor = { id: string; role: Role; status: UserStatus; name: string; email: string } | null;

export type Permission =
  | "listing:create"
  | "enquiry:create"
  | "request:create"
  | "swap:create"
  | "review:access"
  | "review:record_check"
  | "review:recommend"
  | "review:decide"
  | "review:override"
  | "broker:handle" // work assigned enquiries: channels, relays, offers, inspections, transactions
  | "broker:all" // see every case regardless of assignment (admin)
  | "intro:request"
  | "intro:approve"
  | "fees:manage"
  | "agreements:manage"
  | "commission:manage"
  | "admin:users"
  | "admin:companies"
  | "admin:catalog"
  | "admin:content"
  | "admin:inbox"
  | "admin:audit";

const MATRIX: Record<Role, Permission[]> = {
  BUYER: ["enquiry:create", "request:create", "swap:create"],
  SELLER: ["listing:create", "enquiry:create", "request:create", "swap:create"],
  REVIEWER: ["review:access", "review:record_check", "review:recommend", "admin:inbox"],
  BROKER: ["review:access", "review:record_check", "review:recommend", "broker:handle", "intro:request", "admin:inbox"],
  ADMIN: [
    "review:access",
    "review:record_check",
    "review:recommend",
    "review:decide",
    "review:override",
    "broker:handle",
    "broker:all",
    "intro:request",
    "intro:approve",
    "fees:manage",
    "agreements:manage",
    "commission:manage",
    "admin:users",
    "admin:companies",
    "admin:catalog",
    "admin:content",
    "admin:inbox",
    "admin:audit",
  ],
};

export function can(actor: Actor, permission: Permission): boolean {
  if (!actor || actor.status !== "ACTIVE") return false;
  return MATRIX[actor.role].includes(permission);
}

export function requireActor(actor: Actor): NonNullable<Actor> {
  if (!actor) throw unauthenticated();
  if (actor.status !== "ACTIVE") throw forbidden("errors.accountSuspended");
  return actor;
}

export function requirePermission(actor: Actor, permission: Permission): NonNullable<Actor> {
  const a = requireActor(actor);
  if (!can(a, permission)) throw forbidden();
  return a;
}

export const STAFF_ROLES: Role[] = ["ADMIN", "REVIEWER", "BROKER"];
export const isStaff = (actor: Actor) => !!actor && actor.status === "ACTIVE" && STAFF_ROLES.includes(actor.role);
export const isAdmin = (actor: Actor) => !!actor && actor.status === "ACTIVE" && actor.role === "ADMIN";
