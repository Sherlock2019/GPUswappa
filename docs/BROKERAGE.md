# Brokerage workflow

## Listing & fees
1. Seller registers, creates company profile (gets alias `VN-S-####`).
2. Seller completes the 10-step wizard and **accepts the listing & brokerage terms** (version, timestamp, method `WEB_CLICKWRAP`, user and IP are stored; agreement status `ACCEPTED`).
3. Submit → review. On approval the agreement becomes **ACTIVE** (start/end date) and the first **ListingFee** period opens (`DUE`, due date = start + deadline days).
4. Monthly periods are created lazily while the listing is published; `NOT_DUE → DUE → OVERDUE`. Admin records payments manually (billed currency, amount, FX basis, invoice ref, tax treatment) or waives/modifies with a reason (audited). No online payment provider; no claim that USD billing is lawful in every case.

## Agreements
- Standard: US$100-equivalent/month, 5 % commission paid by the seller, fee trigger (default *sale agreement signed*), payment deadline, listing-fee credit (default no), inclusions (taxes/shipping/installation), introduction-protection months, existing-buyer declaration.
- Admin “Prepare revision” (e.g. negotiated rate — requires an evidence note and reason) creates an `AWAITING_SELLER_REVIEW` version; it only takes effect when the seller accepts it. No automatic penalties.

## Enquiry (case) statuses
New · Buyer verification required · Under broker review · Questions relayed · Offer received · Negotiating · Inspection requested · Introduction pending · Introduced · Closed · Cancelled.

## Messaging
Channels: **BUYER_BROKER**, **SELLER_BROKER**, **INTERNAL**, and **SHARED** (exists only after a completed introduction with the shared channel enabled). Parties can write only to their own channel. Relaying = the broker composes a new message to the other channel; the original message and the approving broker are recorded. Text that looks like contact details (email, phone, URL, chat handles) must be explicitly confirmed. Brokers see a standing warning that content may identify a party.

## Offers
Party submits → broker relays → receiving party accepts/rejects. A new offer counters the other side's latest relayed offer.

## Introduction control
Request (broker) requires: active seller agreement · buyer terms accepted · buyer company profile · seller & buyer identity reviewed (policy, configurable) · listing approved · written purpose · chosen disclosure scope per direction.
Seller is asked whether the buyer is already known / in documented negotiations. Admin approves (re-checks preconditions; missing declaration needs an override reason), requests more info, or rejects (reason required). Broker completes → per-recipient **Disclosure** snapshots of only the approved fields + `IDENTITY_DISCLOSED` audit events + optional shared channel.

## Inspections
Video / on-site / independent partner. Scheduling requires agreement + buyer terms + identity checks. Location is private unless “share with participants” is enabled. UI warns that inspections may reveal information.

## Transactions & commission
Statuses: Enquiry → Negotiation → Inspection → Offer accepted → Introduction approved → Sale agreement pending → Sale agreement signed → Payment pending → Equipment delivered → Completed; Cancelled; Disputed.
Commission: % of sale price (negotiated ?? standard) or fixed; listing-fee credit only if the agreement says so (capped at commission). Status is automatic until an admin sets a manual state: `NOT_YET_EARNED` → `PENDING_TRIGGER` (offer accepted) → `DUE` (agreement trigger reached); cancellation resets to `NOT_YET_EARNED`; `PAID` cannot be set on a cancelled transaction. Tax line appears only when configured. The system does not issue Vietnamese e-invoices; invoices are external and only referenced.

Illustrative example (demo TX-2026-0001): sale US$80,000 × 5 % = US$4,000 commission; two months of listing fees US$200 shown separately; no credit.
