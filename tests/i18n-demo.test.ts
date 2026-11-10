import { describe, expect, it } from "vitest";
import { execSync } from "child_process";
import vi from "../src/lib/i18n/vi";
import en from "../src/lib/i18n/en";
import { DEFAULT_LOCALE, makeT } from "../src/lib/i18n";
import { paymentPartner, SETTING_DEFAULTS } from "../src/lib/settings";
import { SERVICES } from "../prisma/seed-reference";
import { getListingForPage } from "../src/lib/services/listings";
import { makeCompany, makeUser, publishedListing } from "./helpers";
import { prisma } from "../src/lib/db";

function keys(o: unknown, prefix = ""): string[] {
  if (Array.isArray(o)) return [`${prefix}[${o.length}]`, ...o.flatMap((x, i) => keys(x, `${prefix}[${i}]`))];
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}

describe("Vietnamese and English", () => {
  it("Vietnamese is the default locale", () => expect(DEFAULT_LOCALE).toBe("vi"));

  it("both dictionaries have exactly the same keys (incl. list lengths)", () => {
    expect(keys(en).sort()).toEqual(keys(vi).sort());
  });

  it("navigation is translated in both languages", () => {
    const tv = makeT("vi");
    const te = makeT("en");
    for (const k of ["home", "marketplace", "sell", "swap", "services", "contact"]) {
      expect(tv(`nav.${k}`)).not.toBe(te(`nav.${k}`));
      expect(tv(`nav.${k}`)).not.toMatch(/^nav\./);
    }
    expect(te("listing.enquiryCta")).toBe("Request this GPU through our broker");
    expect(tv("listing.enquiryCta")).toBe("Liên hệ môi giới về thiết bị này");
    expect(te("listing.brokerNotice")).toContain("GPU Swap Vietnam broker");
  });

  it("interpolates parameters and falls back to the key", () => {
    expect(makeT("en")("common.results", { count: 3 })).toBe("3 results");
    expect(makeT("en")("does.not.exist")).toBe("does.not.exist");
  });

  it("legal drafts are labelled as requiring counsel review", () => {
    expect(vi.legal.draftBanner).toContain("luật sư Việt Nam");
    expect(en.legal.draftBanner).toContain("Vietnamese legal counsel");
  });
});

describe("demo labelling and non-operational features", () => {
  it("18. demo listings carry demo + illustrative-price flags in the public DTO", async () => {
    const seller = await makeUser("SELLER");
    await makeCompany(seller);
    const admin = await makeUser("ADMIN");
    const id = await publishedListing(seller, admin);
    await prisma.listing.update({ where: { id }, data: { isDemo: true, priceIllustrative: true } });
    const page = await getListingForPage(null, id);
    expect(page!.listing.isDemo).toBe(true);
    expect(page!.listing.priceIllustrative).toBe(true);
  });

  it("the demo seed refuses to run in production", () => {
    let failed = false;
    try {
      execSync("npx tsx prisma/seed.ts", { env: { ...process.env, NODE_ENV: "production" }, stdio: "pipe" });
    } catch (e) {
      failed = true;
      expect(String((e as { stderr?: Buffer }).stderr)).toContain("Refusing to seed demo data in production");
    }
    expect(failed).toBe(true);
  });

  it("17. payment/escrow is not operational unless a partner is configured AND approved", () => {
    const s = { ...SETTING_DEFAULTS } as Record<keyof typeof SETTING_DEFAULTS, string>;
    expect(paymentPartner(s)).toBeNull();
    expect(paymentPartner({ ...s, "payments.partnerStatus": "AVAILABLE_VIA_PARTNER", "payments.partnerName": "Bank X" })).toBeNull(); // not approved
    expect(paymentPartner({ ...s, "payments.partnerStatus": "UNDER_EVALUATION", "payments.partnerName": "Bank X", "payments.partnerApproved": "true" })).toBeNull();
    expect(paymentPartner({ ...s, "payments.partnerStatus": "AVAILABLE_VIA_PARTNER", "payments.partnerName": "Bank X", "payments.partnerApproved": "true" })).not.toBeNull();
  });

  it("future services (GPU cloud rental, financing) are seeded as Coming soon and never Available", () => {
    const future = SERVICES.filter((s) => s[6]);
    expect(future.map((s) => s[0])).toEqual(expect.arrayContaining(["gpu-cloud-rental", "financing"]));
    expect(future.every((s) => s[5] === "COMING_SOON")).toBe(true);
    expect(SERVICES.some((s) => /escrow/i.test(s[0]))).toBe(false);
  });
});
