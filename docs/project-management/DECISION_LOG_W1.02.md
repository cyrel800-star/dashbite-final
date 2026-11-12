# Official Decision Record: Hybrid Payment & Settlement (Task W1.02)
Date: October 29, 2026
Owner: Cyrel (Project Manager)
Contributors: Ezekiel

### 1. Online Payment Scope (MVP Release)
- **Decision:** INCLUDED FOR MVP RELEASE (Option B).
- **Details:** Online payment gateway integration is approved for initial release.

### 2. Cash on Delivery (COD) Remittance Policy
- **Decision:** STRICT RECONCILIATION & ADMIN QUEUE FLAG (Option A).
- **Workflow:** Customer pays Rider (100% Total) -> Rider remits cash to Admin -> Admin settles payout with Restaurant.
- **Discrepancy Rule:** Any short remittance, missing cash record, or delivery total mismatch halts auto-settlement and routes the order to the Admin Discrepancy Queue for manual review.

### 3. Online Order Rider Cut Settlement
- **Decision:** DISTINCT PAYOUT RECORD & BATCH BANK TRANSFER (Option A).
- **Workflow:** Rider delivery cuts for online orders are tracked in a pending wallet balance and settled periodically via direct bank transfer.
- **Rule:** Orders missing confirmed rider-cut calculations cannot be marked as settled.

### 4. Platform Commission & Fee Policy
- **Decision:** EXPLICITLY UNASSUMED / HARDCODED ZERO (Option A).
- **Rule:** Platform commission is set to 0% (feature-flagged) in MVP code logic until formal client sign-off. The schema field is present but uncalculated to prevent incorrect financial math.

### Downstream Dependencies Unlocked:
- [W1.06] Approve core data model and cross-repo API contract pack
- [W3.04] Deliver order submission and customer checkout
- [W6.04] Deliver hybrid payment and settlement records
