# AI-GPU-Swapper — operated by GPU Swap Vietnam

> “Give GPU infrastructure a second life.”

A bilingual (Vietnamese default / English) **B2B marketplace and managed broker** for new, surplus and used GPU equipment **already located in Vietnam** (H100/H200, A100, L40S, MI300X …, servers, InfiniBand, storage, racks/cooling).

Buyers and sellers stay **anonymous to each other (aliases such as `VN-S-1024` / `VN-B-2048`) until a broker-authorised introduction**. All questions, offers and inspections go through an assigned broker; every identity disclosure is recorded and audited.

> ⚠️ **Demo / MVP.** All companies, listings, prices and people in the seed are fictional. Legal texts are **drafts that require review by Vietnamese counsel**. The platform does **not** collect, hold or transfer purchase funds; no escrow, online payment, export, cross-border or GPU-rental service is operational.

---

## What works (MVP scope)

| Area | Status |
|---|---|
| Public marketplace: search, 12 filters, sort, grid/list, pagination | ✅ |
| Listing detail with seller alias, admin-configured legally-required seller info, specific review badges (“covers / does not mean”), broker enquiry form | ✅ |
| 10-step seller wizard (drafts, “Unknown” answers → neutral internal hold, private documents, photos, pricing, brokerage-terms acceptance, submit) | ✅ |
| Review: 10 checks per listing, evidence refs, public-badge toggle, expiry, recommend/escalate, decisions with **override-only-with-reason**, audit trail | ✅ |
| Broker-controlled cases: separate **buyer↔broker / seller↔broker / internal** channels, composed relays (provenance + approver), contact-detail heuristic, offers relayed by broker | ✅ |
| Introductions: precondition checklist, seller existing-relationship declaration, admin approval, scoped disclosure snapshots, `IDENTITY_DISCLOSED` audit, optional shared channel | ✅ |
| Inspections (video / on-site / partner) with private location | ✅ |
| Brokerage agreements (click-wrap evidence, versions, revisions incl. negotiated commission), buyer introduction terms | ✅ |
| Listing fees (US$100-equivalent / listing / month, manual payment recording, waive/modify with reason, NOT_DUE→DUE→OVERDUE) | ✅ |
| Transactions & commission (5 % default, negotiated rate, configurable trigger, listing-fee credit only when agreed, tax only when configured, draft acknowledgment) | ✅ |
| Buyer requests (public anonymous board), swap/trade-in proposals, contact & partner forms, notifications | ✅ |
| Admin: companies, users/roles, catalogue, services (incl. **GPU cloud rental — coming soon**), badge texts, legal pages, settings, disclosure & payment-partner settings, audit log | ✅ |
| Content: What/Why (GPU scarcity, idle equipment, budget-limited start-ups, opaque resale), **New data-centre GPU market** page, licensed H100 & data-centre photos with credits | ✅ |

Roles: **Visitor, Buyer, Seller, Reviewer, Broker, Admin** — enforced server-side in the service layer (`src/lib/rbac.ts`).

## Stack

Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS 4 · PostgreSQL 16 · Prisma 6 · iron-session + bcrypt · zod · Vitest · Playwright. Chosen because the directory was empty (spec default). Stable major versions were preferred over the newest (Next 16 / Prisma 8 RC).

## Requirements

Node ≥ 20 (tested 24), npm, Docker (for PostgreSQL). Ports: app **3410**, Postgres **127.0.0.1:55480**.

## Install & run

**One command:**

```bash
./start.sh            # creates .env, starts PostgreSQL, installs deps, migrates, seeds (first run), builds, serves on :3410
./start.sh --dev      # hot-reload dev server
./start.sh --reset    # wipe DB + re-seed demo data, then start
./start.sh --stop     # stop the app (by port 3410); --stop-all also stops the DB container
```

Manual steps (equivalent):

```bash
cp .env.example .env            # then set SESSION_SECRET (openssl rand -hex 32)
npm install
npm run db:up                   # docker compose: PostgreSQL + gpuswapper_test DB
npm run db:migrate              # prisma migrate deploy
npm run db:seed                 # reference data + clearly-fictional demo data
npm run dev                     # http://localhost:3410
# production-style
npm run build && npm start
```

Reset everything: `npm run db:reset` (drops, migrates, re-seeds).

## Demo accounts (development only)

Password = `SEED_DEMO_PASSWORD` from your `.env` (the seed refuses to run when `NODE_ENV=production`).

| Email | Role | Notes |
|---|---|---|
| admin@example.com | Admin | approves listings & introductions, fees, agreements |
| reviewer@example.com | Reviewer | assigned to demo listings |
| broker@example.com | Broker | assigned to the demo cases ENQ-2026-0001/0002 |
| broker2@example.com | Broker | *unrelated* broker — cannot see those cases |
| seller@example.com / seller2@example.com | Seller | VN-S-1024 / VN-S-3307 |
| buyer@example.com | Buyer | VN-B-2048 |

Demo case **ENQ-2026-0001** shows a completed introduction and transaction **TX-2026-0001** (illustrative US$80,000 × 5 % = US$4,000 commission; listing fees shown separately).

## Tests & checks

```bash
npm run typecheck
npm run lint
npm test                        # 64 Vitest tests against the gpuswapper_test DB
npm run build
# browser smoke test + screenshots (app must be running, seeded):
SEED_DEMO_PASSWORD=... npx tsx scripts/smoke.ts   # optional CHROMIUM_PATH=...
```

Tests cover auth & RBAC, seller submission & validation, review/publication & overrides, badge rules, search/filters, private-document authorisation, anonymity before introduction, channel separation, introduction preconditions & audited disclosure, legally-required seller fields, fees, commission rules/triggers/cancellation/credits, payment-partner gating, demo labelling, i18n parity.

## Environment variables

See `.env.example`: `DATABASE_URL`, `TEST_DATABASE_URL` (must contain `_test`), `SESSION_SECRET` (≥32 chars), `APP_URL`, `DEMO_MODE`, `SEED_DEMO_PASSWORD`, `STORAGE_DRIVER`/`STORAGE_DIR` (private, outside `/public`), `MAX_UPLOAD_MB`, `EMAIL_DRIVER` (`console` = dev mail capture; no real provider in MVP), `EMAIL_FROM`.

## Project structure

```
prisma/            schema, migrations, seed.ts (demo), seed-reference.ts (catalogue, badges, services, legal drafts)
src/lib/           rbac, auth/session, policy, badges, commission, storage, settings, i18n (vi/en), validation
src/lib/services/  listings, review, brokerage (cases/intros/inspections/agreements/fees/transactions), files, companies, users, marketplace, admin
src/app/           public pages, /dashboard (buyer/seller), /admin (reviewer/broker/admin), /api/files (authorised downloads), actions/
tests/             Vitest suites + helpers;  scripts/smoke.ts  Playwright smoke test
docs/              PRODUCT, ARCHITECTURE, BROKERAGE, PRIVACY-ACCESS, COMPLIANCE-REVIEW, OPERATIONS, ROADMAP, USER-JOURNEYS
public/images/photos  freely-licensed photos (credits at /credits)
```

## Known limitations

- Single-instance in-memory rate limiter; local private file storage only (S3 adapter interface ready).
- No real email provider; password reset works only with the dev console mail adapter.
- Some admin-only settings labels (Content/Disclosure pages) are English-only.
- No online payments, e-invoicing, escrow, cross-border flows or GPU rental (by design).
- One company per user; published listings cannot be edited (archive and relist).
- New-GPU market prices are indicative figures from internal research (Nov 2026), not verified quotations.
- Contact-detail detection in messages is heuristic and does not guarantee anonymity.

## Before a real production launch

See `docs/COMPLIANCE-REVIEW.md` and `docs/OPERATIONS.md`. In short: Vietnamese counsel review of classification, disclosure fields, all terms and the anti-circumvention approach; accountant review of USD-equivalent billing, VAT and invoicing; a compliant e-invoicing integration; a real email provider; S3-compatible private storage, backups and monitoring; a shared rate limiter; security review/pen-test; replace demo data and set `DEMO_MODE=false`.

## How it was built

Built incrementally with Claude Code: empty workspace → Prisma schema → server-side service layer with RBAC and policy engine → tests for every rule → bilingual dictionaries → seed → UI (server components + Server Actions) → docs → lint/typecheck/tests/build → Playwright smoke test against the production build. Mid-build change requests were folded in additively (licensed photos & What/Why, the broker-controlled anonymity model, the new data-centre GPU market page).
