# Example user journeys (demo accounts)

**A. Seller submits a GPU server** — `seller@example.com` → Dashboard › My listings › New listing → wizard steps 1–9 (try “Unknown” customs to see the neutral hold) → upload a PDF and a photo → step 10: accept brokerage terms → Submit → status *Under review* (or *On hold*). After admin approval the listing is public under alias VN-S-1024 and a fee period appears.

**B. Buyer finds a GPU** — visitor `/marketplace` → filter model/location/price → listing shows alias, reviewed badges and “Request this GPU through our broker” → sign in as `buyer@example.com` → send enquiry (accept buyer terms) → Dashboard › Broker cases shows the case and status.

**C. Admin reviews a listing** — `admin@example.com` → Admin › Review queue › *On hold* demo cluster → open documents, record checks with evidence, toggle badges → approve (override requires reason) / return for info / reject → check `/admin/audit` and the public page.

**D. Swap proposal** — open the H200 “sale or swap” listing → Propose a swap → fill offered/requested equipment and cash adjustment → Dashboard › Swap proposals; admin updates status in Admin › Swap proposals (forwarding notifies the seller, who sees only the proposer alias).

**E. Partner contact** — `/about#partner` → choose category → submit → Admin › Partners → update status.

**F. Broker introduction & transaction** — `broker@example.com` → Admin › Broker cases › ENQ-2026-0002 → relay the buyer's question to the seller (seller now sees the case as VN-B-2048) → request introduction with disclosure scope → as `seller@example.com` declare relationship → as admin approve → as broker complete → both parties see only the approved fields; audit shows `IDENTITY_DISCLOSED` → open transaction, move to *Sale agreement signed* → commission becomes *Due*. Compare `broker2@example.com`, who cannot open the case.
