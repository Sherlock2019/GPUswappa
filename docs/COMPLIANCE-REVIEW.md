# Compliance review — questions for Vietnamese counsel, accountants and partners

> Nothing in this application is legal advice. All legal texts are drafts. Platform safeguards are **configurable policies**, not statements of law.

## Business rules implemented as platform policy
- Used GPUs already in Vietnam are not treated as prohibited from domestic resale.
- Listing approval and badges are never presented as legal guarantees or government approvals.
- Missing original invoice ≠ illegality; alternative evidence accepted for manual review.
- “Unknown” answers on location, authority, third-party rights or customs → internal **On hold** (neutral wording, policy toggle).
- Badges appear only after an authorised reviewer records PASSED + enables the badge; each badge states what it covers and does not mean.
- Links to a foreign country or foreign-invested ownership are not treated as proof of prohibition; foreign-invested flag is for review only.
- Flagged GPU models (H100, H200, A100, L40S, MI300X, MI325X by default) require a case-by-case export-control check before approval (admin may override with reason). No claim that every H100/H200 transfer needs a US licence.
- Domestic resale and import restrictions are explained separately (Trust page, New-GPU market page).
- No funds handled; no escrow; payment partner hidden unless configured **and** approved.
- Platform role (intermediary vs seller) shown on every listing.

## Questions requiring legal confirmation
1. **Platform classification** under Vietnamese e-commerce rules (e.g. e-commerce trading floor / intermediary) and resulting registration/notification duties; fill operator registration fields in admin only with real evidence.
2. **Mandatory seller disclosures** on listings — which fields must be public despite the anonymity model? Configure `/admin/disclosure` accordingly.
3. Enforceability and wording of the **brokerage agreement**, click-wrap acceptance evidence, the existing-buyer declaration, introduction-protection period and any **anti-circumvention** clause (no automatic penalties are implemented).
4. **Buyer introduction terms** and privacy notice; lawful basis, consent and cross-border data aspects under Vietnamese personal-data protection law.
5. Whether charging fees as **US$-equivalent** and invoicing in USD or VND is permitted; FX basis; foreign-exchange control.
6. **VAT / tax** on listing fees and commission; e-invoice obligations (a compliant e-invoicing integration is required — none is built).
7. Customs: treatment of used/refurbished digital-technology products — the operator's research references **Circular 63/2026/TT-BKHCN** (prohibition on importing listed used/refurbished items by HS code from 1 Jan 2027). Confirm scope, and confirm that domestic resale of equipment already lawfully in Vietnam is unaffected.
8. Export controls: US EAR re-export/transfer analysis for domestic transfers of advanced GPUs, Country Group D:5 / Macau ownership screening, recordkeeping. Which checks must be mandatory vs. advisory?
9. Requirements for listing equipment that is leased, financed or pledged.
10. Complaints/dispute process requirements and consumer-protection applicability to B2B.
11. Retention periods for documents, messages and audit records.
12. Advertising rules for prices (illustrative/demo labelling, VND display).

## Marketplace registration
Admin fields: operator legal name, business registration number, e-commerce notification/registration — shown as “Not yet provided” until filled. Do not claim registration without evidence.

## Privacy & document handling
See `PRIVACY-ACCESS.md`. Private storage outside `/public`; authorised, audited downloads; neutral filenames; masked data in public DTOs.

## Customs & export-control review questions per listing
Location in Vietnam? Ownership/authority evidence? Encumbrances? Import route and customs documents (or lawful alternatives)? Model flagged for export review? Ultimate parent/beneficial owner of both parties? End use and onward transfer plans? Evidence references recorded on each check.

## Needs a lawyer / accountant / bank / payment provider before production
- Lawyer: items 1–12 above; final legal pages; disclosure list; agreements.
- Accountant: fee currency, VAT, e-invoicing, commission recognition.
- Bank / payment provider: any future payment, escrow or financing feature (none operational).
- E-invoicing provider: compliant invoice issuance.
