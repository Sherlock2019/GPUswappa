# Architecture

## Components
- **Next.js App Router** — server components render all pages; mutations are **Server Actions** (`src/app/actions/*`), which have built-in same-origin (CSRF) protection.
- **Service layer** (`src/lib/services/*`) — every business rule and every authorisation check lives here. Actions and pages call services with the current `Actor`; tests call the same services directly.
- **Policy & pure logic** — `rbac.ts` (permission matrix), `policy.ts` (review flags, hold rules, approval blockers), `badges.ts` (public badge rule), `commission.ts` (commission, triggers, contact-detail heuristic), `settings.ts` (configurable policies, disclosure, payment-partner gating).
- **PostgreSQL + Prisma** — schema in `prisma/schema.prisma`, migrations in `prisma/migrations`.
- **Private storage** — `storage.ts` `StorageAdapter`; local driver writes random UUID filenames to `STORAGE_DIR` (outside `/public`). Files are served only through `/api/files/image/[id]` and `/api/files/doc/[id]`, which authorise every request.
- **i18n** — `src/lib/i18n/{vi,en}.ts` dictionaries (identical key structure, enforced by tests); locale cookie, Vietnamese default; dates in `Asia/Ho_Chi_Minh`; VND formatting.

## Data flow (enquiry → sale)
Visitor → listing (public DTO, alias only) → buyer signs in, accepts buyer terms → `Enquiry` + `BuyerIntroAgreement` + first `Message` (BUYER_BROKER) → broker relays composed messages / offers to SELLER_BROKER → inspection → broker requests `Introduction` (checklist) → seller declares relationship → admin approves → broker completes → `Disclosure` snapshots + `IDENTITY_DISCLOSED` audit → `Transaction` → commission status follows the agreement trigger → admin records invoice/payment manually.

## Authentication & roles
iron-session encrypted httpOnly cookie (`gs_session`, SameSite=Lax, Secure in production), bcrypt (12 rounds), user re-loaded from DB per request (suspension/role changes apply immediately). Rate limits on login, register, reset, enquiry and public forms. Self-registration only as Buyer or Seller.

| Permission | Buyer | Seller | Reviewer | Broker | Admin |
|---|---|---|---|---|---|
| enquire / request / swap | ✓ | ✓ | | | |
| create listings | | ✓ | | | |
| review assigned listings, record checks, recommend | | | ✓ | ✓ | ✓ |
| approve / reject / override | | | | | ✓ |
| handle assigned cases (channels, relays, offers, inspections, transactions) | | | | ✓ | ✓ (all) |
| request introduction | | | | ✓ | ✓ |
| approve introduction, fees, agreements, commission | | | | | ✓ |

## Database highlights
User, Company (alias, private contacts), CompanyMembership, Category, GpuModel (export-review flag), Location, Listing, ListingImage, Document, ReviewCheck, ReviewDecision (recommendation/decision/override), ReviewMessage, BadgeDefinition, Enquiry, Message (channel, relayOf, approvedBy, flagged), Offer, BrokerageAgreement, BuyerIntroAgreement, Introduction, Disclosure, Inspection, Transaction, ListingFee, SwapProposal, BuyerRequest, ContactSubmission, PartnerEnquiry, Notification, Service, ContentPage, SiteSetting, AuditEvent. Relational integrity and indexes on all hot query paths.

## Security boundaries
- Public pages use a whitelist DTO (`toPublicDto`); serials, customs notes, flags, reviewer notes, evidence refs, identities and contacts never pass through it.
- Party case views (`getCase`) are separate DTOs per role; brokers' extra data is attached only for the broker/admin role.
- Unauthorised access to cases, documents and private listings returns 404 (no existence leak); denied document access is audited.
- Notifications carry only references, aliases and listing titles. Image responses use neutral filenames; page metadata uses listing titles only.
- Security headers (nosniff, frame DENY, referrer policy, permissions policy); document downloads use `Content-Security-Policy: sandbox`.
- Uploads: magic-byte type detection, size limit, sanitised display filenames, random storage keys.

## Deployment options
Single Node server (`npm run build && npm start`) behind a TLS reverse proxy, managed PostgreSQL, S3-compatible private bucket (implement `StorageAdapter`), shared rate-limit store (Redis) if scaling horizontally. Docker Compose is provided for local PostgreSQL only. Nothing has been deployed publicly.
