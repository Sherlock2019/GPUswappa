import { describe, expect, it } from "vitest";
import { registerUser, verifyLogin, setUserRoleStatus } from "../src/lib/services/users";
import { can, requirePermission } from "../src/lib/rbac";
import { createDraft } from "../src/lib/services/listings";
import { decide } from "../src/lib/services/review";
import { reviewIntroduction, listBrokerCases } from "../src/lib/services/brokerage";
import { listAudit } from "../src/lib/services/admin";
import { rateLimit, resetRateLimits } from "../src/lib/ratelimit";
import { AppError } from "../src/lib/errors";
import { makeUser, makeCompany } from "./helpers";

describe("authentication", () => {
  it("registers with a hashed password and verifies login", async () => {
    const email = `new-${Date.now()}@example.com`;
    const u = await registerUser({ name: "New Buyer", email, password: "GoodPassword123", accountType: "BUYER", acceptTerms: "on" });
    expect(u.passwordHash).not.toContain("GoodPassword123");
    expect(u.passwordHash.startsWith("$2")).toBe(true);
    const logged = await verifyLogin({ email, password: "GoodPassword123" });
    expect(logged.id).toBe(u.id);
  });

  it("rejects wrong passwords with a generic error", async () => {
    await expect(verifyLogin({ email: "nobody@example.com", password: "whatever123" })).rejects.toMatchObject({ message: "errors.badCredentials" });
  });

  it("validates registration input (weak password, missing terms, bad role)", async () => {
    const err = await registerUser({ name: "x", email: "bad", password: "short", accountType: "ADMIN" }).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(Object.keys(err.fieldErrors)).toEqual(expect.arrayContaining(["name", "email", "password", "accountType", "acceptTerms"]));
  });

  it("does not allow self-registration as ADMIN, REVIEWER or BROKER", async () => {
    for (const accountType of ["ADMIN", "REVIEWER", "BROKER"]) {
      await expect(registerUser({ name: "Sneaky", email: `s-${accountType}@example.com`, password: "GoodPassword123", accountType, acceptTerms: "on" })).rejects.toBeInstanceOf(AppError);
    }
  });

  it("rate-limits repeated attempts", () => {
    resetRateLimits();
    for (let i = 0; i < 3; i++) rateLimit("login:test", 3, 60000);
    expect(() => rateLimit("login:test", 3, 60000)).toThrow(AppError);
  });
});

describe("role-based access control (server-side)", () => {
  it("enforces the permission matrix", async () => {
    const [buyer, seller, reviewer, broker, admin] = await Promise.all(["BUYER", "SELLER", "REVIEWER", "BROKER", "ADMIN"].map((r) => makeUser(r as never)));
    expect(can(buyer, "listing:create")).toBe(false);
    expect(can(seller, "listing:create")).toBe(true);
    expect(can(reviewer, "review:decide")).toBe(false);
    expect(can(broker, "intro:approve")).toBe(false);
    expect(can(broker, "broker:all")).toBe(false);
    expect(can(admin, "intro:approve")).toBe(true);
    expect(can(null, "enquiry:create")).toBe(false);
    expect(() => requirePermission(null, "enquiry:create")).toThrow(AppError);
  });

  it("buyers cannot create listings; reviewers cannot approve; brokers cannot approve introductions", async () => {
    const buyer = await makeUser("BUYER");
    await makeCompany(buyer);
    await expect(createDraft(buyer)).rejects.toMatchObject({ code: "FORBIDDEN" });
    const reviewer = await makeUser("REVIEWER");
    await expect(decide(reviewer, "nonexistent", { outcome: "APPROVE" })).rejects.toBeInstanceOf(AppError);
    const broker = await makeUser("BROKER");
    await expect(reviewIntroduction(broker, "x", { decision: "APPROVE" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listAudit(broker)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(listBrokerCases(buyer)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("suspended users lose access immediately", async () => {
    const seller = await makeUser("SELLER");
    expect(() => requirePermission({ ...seller, status: "SUSPENDED" }, "listing:create")).toThrow(AppError);
  });

  it("role changes require a reason and are audited; admins cannot change themselves", async () => {
    const admin = await makeUser("ADMIN");
    const target = await makeUser("BUYER");
    await expect(setUserRoleStatus(admin, target.id, { role: "SELLER", status: "ACTIVE" })).rejects.toBeInstanceOf(AppError);
    await setUserRoleStatus(admin, target.id, { role: "SELLER", status: "ACTIVE", reason: "Verified seller onboarding" });
    const audit = await listAudit(admin);
    expect(audit.some((a) => a.action === "USER_ROLE_STATUS_CHANGED" && a.resourceId === target.id && a.reason)).toBe(true);
    await expect(setUserRoleStatus(admin, admin.id, { role: "BUYER", status: "ACTIVE", reason: "Self demotion attempt" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
