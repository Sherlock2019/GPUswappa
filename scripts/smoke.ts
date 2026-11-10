/**
 * Browser smoke test + screenshots. Requires a running app (npm run dev) and seeded demo data.
 *   BASE_URL=http://localhost:3410 SEED_DEMO_PASSWORD=... npx tsx scripts/smoke.ts
 * Optional: CHROMIUM_PATH=/path/to/chrome (uses Playwright's bundled browser otherwise).
 */
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3410";
const PW = process.env.SEED_DEMO_PASSWORD ?? "";
const OUT = "screenshots";
mkdirSync(OUT, { recursive: true });
const failures: string[] = [];

async function visit(page: Page, path: string, shot?: string) {
  const res = await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 });
  const status = res?.status() ?? 0;
  const body = await page.content();
  const broken = status >= 400 || body.includes("Something went wrong") || body.includes("Application error");
  console.log(`${broken ? "✗" : "✓"} ${status} ${path}`);
  if (broken) failures.push(`${status} ${path}`);
  if (shot) await page.screenshot({ path: `${OUT}/${shot}.png`, fullPage: true });
}

async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto(`${BASE}/auth/login`);
  await page.fill("#f-email", email);
  await page.fill("#f-password", PW);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/auth/login"), { timeout: 20000 }), page.click("button[type=submit]")]);
}

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.on("pageerror", (e) => failures.push(`pageerror ${page.url()}: ${e.message}`));

  // Visitor
  for (const [p, s] of [["/", "home-vi"], ["/marketplace", "marketplace"], ["/new-gpus", "new-gpus"], ["/used-gpus", "used-gpus"], ["/why", "why"], ["/services", "services"], ["/trust", "trust"], ["/how-it-works", null], ["/sell", null], ["/requests", null], ["/swap", null], ["/about", null], ["/contact", null], ["/legal/terms", "legal"], ["/credits", null]] as const) {
    await visit(page, p, s ?? undefined);
  }
  const first = await page.goto(`${BASE}/marketplace`).then(() => page.locator("article h3 a").first().getAttribute("href"));
  if (first) await visit(page, first, "listing-detail-visitor");
  // English
  await page.context().addCookies([{ name: "locale", value: "en", url: BASE }]);
  await visit(page, "/", "home-en");
  await visit(page, "/used-gpus", "used-gpus-en");
  if (first) await visit(page, first, "listing-detail-en");
  await page.context().clearCookies();
  // Mobile
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await visit(mobile, "/", "home-mobile");
  await visit(mobile, "/marketplace", "marketplace-mobile");
  await mobile.close();

  // Buyer
  await login(page, "buyer@example.com");
  for (const p of ["/dashboard", "/dashboard/company", "/dashboard/cases", "/dashboard/saved", "/dashboard/requests", "/dashboard/swaps", "/dashboard/notifications", "/dashboard/settings"]) await visit(page, p);
  await page.goto(`${BASE}/dashboard/cases`);
  const caseHref = await page.locator("table a").first().getAttribute("href");
  if (caseHref) await visit(page, caseHref, "buyer-case");
  if (first) await visit(page, first, "listing-detail-buyer");

  // Seller
  await login(page, "seller2@example.com");
  for (const p of ["/dashboard/listings", "/dashboard/cases"]) await visit(page, p);
  await page.goto(`${BASE}/dashboard/listings`);
  const lHref = await page.locator("table a").first().getAttribute("href");
  if (lHref) for (const step of [1, 2, 6, 10]) await visit(page, `${lHref}?step=${step}`, step === 6 ? "seller-wizard-step6" : step === 10 ? "seller-wizard-step10" : undefined);
  await page.goto(`${BASE}/dashboard/cases`);
  const sCase = await page.locator("table a").first().getAttribute("href");
  if (sCase) await visit(page, sCase, "seller-case");

  // New ready-to-use used-GPU demo accounts
  for (const email of ["seller3@example.com", "seller5@example.com"]) {
    await login(page, email);
    await visit(page, "/dashboard/listings");
  }
  for (const email of ["buyer2@example.com", "buyer5@example.com"]) {
    await login(page, email);
    await visit(page, "/dashboard/requests");
  }

  // Broker
  await login(page, "broker@example.com");
  for (const p of ["/admin", "/admin/cases", "/admin/introductions", "/admin/inspections", "/admin/transactions", "/admin/listings"]) await visit(page, p);
  await page.goto(`${BASE}/admin/cases`);
  const bCase = await page.locator("table a").first().getAttribute("href");
  if (bCase) await visit(page, bCase, "broker-case");

  // Admin
  await login(page, "admin@example.com");
  for (const p of ["/admin", "/admin/listings", "/admin/documents", "/admin/companies", "/admin/fees", "/admin/agreements", "/admin/requests", "/admin/swaps", "/admin/inbox", "/admin/partners", "/admin/users", "/admin/catalog", "/admin/content", "/admin/disclosure", "/admin/audit", "/admin/cases", "/admin/introductions", "/admin/transactions"]) {
    await visit(page, p, p === "/admin" ? "admin-overview" : undefined);
  }
  await page.goto(`${BASE}/admin/listings?status=ON_HOLD`);
  const rev = await page.locator("table a").first().getAttribute("href");
  if (rev) await visit(page, rev, "admin-review-panel");
  await page.goto(`${BASE}/admin/transactions`);
  const tx = await page.locator("table a").first().getAttribute("href");
  if (tx) await visit(page, tx, "admin-transaction");

  await browser.close();
  if (failures.length) {
    console.error("\nFAILURES:\n" + failures.join("\n"));
    process.exit(1);
  }
  console.log("\nSmoke test passed. Screenshots in ./screenshots");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
