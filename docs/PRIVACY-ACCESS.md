# Privacy & access control

## Anonymous until introduced
- Every company gets a generated alias (`VN-S-####` seller side, `VN-B-####` buyer side). Public pages, party case views, notifications and swap proposals show aliases only.
- Exceptions: seller fields an administrator marks as **legally required** in `/admin/disclosure` (allowed: legal name, display name, registration number, address, city, website, company type; default: company type + city). These are always shown. Counsel must confirm this list; aliases must never be used to avoid a legally required disclosure.

## Who can see what
| Data | Visitor | Buyer (own case) | Seller (own listing/case) | Assigned broker | Unrelated broker | Admin |
|---|---|---|---|---|---|---|
| Public listing data | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Seller identity/contacts | legally required fields only | only disclosed snapshot | own | ✓ | ✗ | ✓ |
| Buyer identity/contacts | ✗ | own | only disclosed snapshot | ✓ | ✗ | ✓ |
| Case messages | ✗ | BUYER_BROKER (+SHARED) | SELLER_BROKER (+SHARED), only after broker opens the channel | all | ✗ | all |
| Listing documents | ✗ | ✗ | own | assigned listings/cases | ✗ | ✓ |
| Company documents | ✗ | own company | own company | parties of assigned cases | ✗ | ✓ |
| Serials, customs notes, review flags, reviewer notes, evidence refs | ✗ | ✗ | own listing (serials/notes they entered) | assigned | ✗ | ✓ |
| Inspection location | ✗ | if shared | if shared | ✓ | ✗ | ✓ |

Reviewers see only listings assigned to them. All rules are enforced in services; the UI only mirrors them. Tests in `tests/brokerage.test.ts` verify the matrix.

## Audit
Admin decisions, overrides (with reason), check changes, role changes, document downloads and denials, fee waivers, agreement revisions, relays, introductions and every `IDENTITY_DISCLOSED` event are written to `AuditEvent`. Keys resembling secrets (password, token, hash, serial) are stripped from audit metadata.

## Logs
Server logs contain only generic error traces; no request bodies, contact details or tokens are logged. The console mail adapter is development-only and disabled when `NODE_ENV=production`.

## Retention (to be finalised with counsel)
Documents carry a retention status (`ACTIVE / SCHEDULED_DELETION / DELETED`); deletion removes the file and keeps the metadata row for audit. Define retention periods for documents, messages and audit events per Vietnamese personal-data rules before launch.
