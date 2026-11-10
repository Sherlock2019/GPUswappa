# Operations

## Listing review process
1. `/admin/listings` → queue (filter by status). Admin assigns a reviewer and a broker.
2. Review panel: read flags (neutral), specs, private data; open documents (each download audited); accept/reject documents and images.
3. Record each of the 10 checks: status, evidence reference (required for PASSED), internal notes, optional expiry, and **public badge** toggle (badge-eligible checks only).
4. Reviewer: return for information (message required), hold (reason), recommend approve/reject, escalate.
5. Admin: approve / reject (reason) / archive. Approving with unmet required checks or against the latest recommendation requires *confirm override* + reason ≥ 10 chars (audited as `REVIEW_DECISION_OVERRIDE`).
6. Approval publishes the listing, approves pending images, activates the agreement and opens the first fee period.

## Broker case handling
`/admin/cases` (filters: status, broker, seller/buyer alias, dates) → case workspace: verify buyer company (`/admin/companies`), relay questions, relay offers, schedule inspections, request introduction, open transaction. Admin approves introductions at `/admin/introductions`.

## Document handling
Accepted types PDF/JPG/PNG (documents) and JPG/PNG/WebP (photos), ≤ `MAX_UPLOAD_MB`. Never email documents; link to the authorised download instead. Delete via UI (file removed, metadata retained).

## Fees, agreements, commission
`/admin/fees` (record payment / waive / modify — reasons required), `/admin/agreements` (revise, terminate), `/admin/transactions/[id]` (commission status, invoice ref, dispute, overrides with reason). Tax line appears only after `tax.feeTaxPct` is configured.

## Changing categories, models, provinces, services, texts
- `/admin/catalog`: categories, GPU models (incl. export-review flag), provinces.
- `/admin/content`: policies & fee settings, FX (rate + date + source all required), operator registration, service statuses (Available / Through partner / Coming soon / Contact us; certification claim requires evidence ref), badge texts, legal pages (draft flag).
- `/admin/disclosure`: legally required public seller fields; payment-partner status/approval.
- `src/lib/market-data.ts`: New-GPU market reference prices and sources (review before launch).

## Backups
Daily `pg_dump` of the database (encrypted, off-site, 30-day retention suggested) **and** a backup of `STORAGE_DIR` (or bucket versioning). Test restores monthly. Example: `docker exec gpuswapper-db pg_dump -U gpuswapper gpuswapper | gzip > backup-$(date +%F).sql.gz`.

## Incident response
1. Contain: suspend affected users (`/admin/users`, reason required), unpublish/hold listings, rotate `SESSION_SECRET` (invalidates all sessions).
2. Investigate with `/admin/audit` (filter by resource) and server logs.
3. Assess personal-data impact; notify per Vietnamese law with counsel; inform affected parties.
4. Fix, document, review controls.

## Local operations
Start: `npm run db:up && npm run dev` (or `npm run build && npm start`). Stop the app by its port (3410), not by process name, when other Node apps run on the same host.
