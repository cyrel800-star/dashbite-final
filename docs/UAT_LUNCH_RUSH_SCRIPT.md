# DashBite — Real-World "Lunch Rush" UAT Script & Acceptance Checklist (Task W8.01)

**Document Owner:** Jelvie (Lead Full-Stack Engineer) & Edelyn (QA Lead)  
**Lead Architect:** Cyrel  
**Target Release:** DashBite v1.1 Production Candidate  
**Date:** November 12, 2026  
**Execution Objective:** Perform live end-to-end user acceptance testing across all 4 roles simultaneously in browser sessions to simulate a typical town lunch rush with multiple concurrent orders, race-safe dispatching, and cash reconciliation.

---

## 1. UAT Environment Setup

To simulate all roles concurrently without session collisions, open **four separate browser windows** (or one normal window and three private/incognito windows or profiles):

| Role | Browser Window / Profile | Login Credentials | Initial Screen |
| :--- | :--- | :--- | :--- |
| **Window 1: Customer PWA** | Normal Window / Profile 1 | `customer@test.com` / `password` | Home / Restaurants Catalog |
| **Window 2: Restaurant Portal** | Incognito Window 1 | `restaurant@test.com` / `password` | Kitchen Orders & Active Menu |
| **Window 3: Rider 1 (Approved)** | Incognito Window 2 | `rider@test.com` / `password` | Rider Dashboard (Toggle Online) |
| **Window 4: Rider 2 (Approved)** | Incognito Window 3 / Profile 2 | `rider2@test.com` / `password` | Rider Dashboard (Toggle Online) |
| **Window 5: Town Admin** | Separate Tab / Window | `admin@test.com` / `password` | Admin Governance & Discrepancies |

> [!TIP]
> Ensure both Rider 1 (Window 3) and Rider 2 (Window 4) have toggled **Online** and clicked **"Refresh Location"** so their location freshness timestamps are within 120 seconds.

---

## 2. Lunch Rush Test Scenarios

```markdown
<!-- slide -->
```

### Scenario A: Standard Customer Order Flow (Happy Path)

**Goal:** Verify customer browse, cart, checkout, restaurant preparation, 1 km dispatch blast, rider delivery, and exact COD collection.

- [ ] **Step A1 (Customer):** In **Window 1**, browse the menu of *"Kusina San Jose"*. Add 2x *Pork Sisig* (₱150.00 each) to cart.
- [ ] **Step A2 (Customer):** Click the Cart pill. Verify subtotal displays **₱300.00**, delivery fee displays **₱30.00**, and platform fee displays **₱0.00** (Total: **₱330.00**).
- [ ] **Step A3 (Customer):** Enter delivery address `123 Rizal St, Poblacion` and pin coordinates `14.5995, 120.9842`. Tap **Place Order (COD)**.
  - *Expected:* Order placed successfully with status `PENDING`. Tracking number assigned (e.g. `ORD-XXXX`).
- [ ] **Step A4 (Restaurant):** In **Window 2**, notice the incoming order appear under **Incoming / Pending Orders** with audio/visual alert.
- [ ] **Step A5 (Restaurant):** Enter `20` minutes prep time and click **Accept Order**.
  - *Expected:* Order moves to **Active Orders** with status `ACCEPTED`.
- [ ] **Step A6 (Restaurant):** Click **Start Preparing**.
  - *Expected:* Order status updates to `PREPARING` with kitchen timer running.
- [ ] **Step A7 (Restaurant):** Once cooked and packaged, click **Mark Ready for Pickup**.
  - *Expected:* Status moves to `SEARCHING_RIDER`. Alert confirms: *"1 km dispatch blast active"*.
- [ ] **Step A8 (Rider 1):** In **Window 3**, observe the incoming offer card appear immediately with restaurant name, pickup address, and dropoff location.
- [ ] **Step A9 (Rider 1):** Click **Accept Offer**.
  - *Expected:* Rider 1 assigned to order. Screen transitions to active delivery view.
- [ ] **Step A10 (Rider 1):** Click **Confirm Pickup**.
  - *Expected:* Order moves to `PICKED_UP`. Customer tracking screen in Window 1 updates to *"Food Picked Up — On the way"*.
- [ ] **Step A11 (Rider 1):** Arrive at customer address. Collect exact cash ₱330.00. Enter `330.00` in the cash input and click **Confirm Delivery & COD Collection**.
  - *Expected:* Order marked `DELIVERED`. Rider 1 earnings increase by ₱30.00; delivery count increments.
- [ ] **Step A12 (Customer):** Window 1 updates to `DELIVERED`. Optional 5-star rating submitted.

---

```markdown
<!-- slide -->
```

### Scenario B: Restaurant Walk-In / Phone Order & Short Cash Reconciliation (REQ-04 & REQ-07)

**Goal:** Verify restaurant entry of non-app orders and automated routing of cash shortfalls to the Admin Discrepancy Queue.

- [ ] **Step B1 (Restaurant):** In **Window 2**, click **+ External Order**.
- [ ] **Step B2 (Restaurant):** Enter customer name `Maria Santos`, phone `09181234567`, address `45 Magsaysay Ave`, and select *Lechon Kawali* (₱220.00). Click **Create Order**.
  - *Expected:* Order created with tag `External (Phone/Walk-in)` and status `PENDING`. Total = ₱250.00 (₱220 food + ₱30 delivery).
- [ ] **Step B3 (Restaurant):** Accept order and immediately click **Mark Ready for Pickup**.
  - *Expected:* Dispatch blast triggers.
- [ ] **Step B4 (Rider 2):** In **Window 4**, Rider 2 sees the offer card and clicks **Accept Offer**.
- [ ] **Step B5 (Rider 2):** Click **Confirm Pickup**.
- [ ] **Step B6 (Rider 2 - Short Cash Simulation):** Deliver to customer. Customer only has ₱230.00 cash (₱20 short of ₱250.00). Rider enters `230.00` in the cash collection box and clicks **Confirm Delivery**.
  - *Expected:* Order completes delivery, but backend `PaymentService` automatically sets payment status to `FLAGGED_DISCREPANCY`.
- [ ] **Step B7 (Admin Discrepancy Queue):** In **Window 5 (Admin)**, navigate to **COD Discrepancy Queue**.
  - *Expected:* Order appears in the queue with:
    - Expected Amount: **₱250.00**
    - Cash Collected: **₱230.00**
    - Variance: **-₱20.00**
    - Status: `FLAGGED_DISCREPANCY`
- [ ] **Step B8 (Admin Resolution):** Enter resolution notes: *"Customer short ₱20 authorized as introductory voucher promo"* and click **Resolve Discrepancy**.
  - *Expected:* Discrepancy is marked resolved. Status updates to `REMITTED_TO_ADMIN`.

---

```markdown
<!-- slide -->
```

### Scenario C: Concurrent Race-Safe Offer Claim (Rider 1 vs Rider 2)

**Goal:** Verify atomic race-condition safety when two riders click "Accept" on the same blast offer.

- [ ] **Step C1 (Restaurant):** In **Window 2**, create or accept an order and click **Mark Ready for Pickup**.
  - *Expected:* 1 km ring broadcast emits simultaneous offers to both Rider 1 and Rider 2.
- [ ] **Step C2 (Concurrent Offer Receipt):** Verify offer card appears on **BOTH** Window 3 (Rider 1) and Window 4 (Rider 2) at the same time.
- [ ] **Step C3 (Simultaneous Click):** Click **Accept Offer** on Window 3 (Rider 1), and immediately click **Accept Offer** on Window 4 (Rider 2).
  - *Expected Outcome:*
    - **Winning Rider (Rider 1):** Receives HTTP 200 `ASSIGNED`. UI confirms assignment and transitions to the navigation screen.
    - **Losing Rider (Rider 2):** Receives HTTP 409 `OFFER_ALREADY_CLAIMED`. UI displays friendly toast: *"Offer closed. Another rider accepted it first."* Rider 2 remains available for subsequent blasts without getting locked up.

---

```markdown
<!-- slide -->
```

### Scenario D: System Boundary & Out-of-Stock Guardrails

**Goal:** Verify that customers cannot place invalid orders outside town limits or on sold-out dishes.

- [ ] **Step D1 (Out-of-Stock Guardrail):**
  - In **Window 2 (Restaurant)**, toggle the *Pork Sisig* switch to **Unavailable / Sold Out**.
  - In **Window 1 (Customer)**, attempt to place an order containing *Pork Sisig*.
  - *Expected:* Screen displays red banner: *"Item 'Pork Sisig' is currently out of stock or unavailable (OUT_OF_STOCK)"*. No order created.
- [ ] **Step D2 (Service Boundary Guardrail):**
  - In **Window 1 (Customer)**, select an in-stock dish, but change the delivery coordinates to `15.5000, 121.8000` (outside town boundary).
  - Click **Place Order**.
  - *Expected:* Screen displays error: *"The delivery address is outside the town service boundary (OUT_OF_BOUNDARY)"*. No order created.
- [ ] **Step D3 (Revert for Normal Operation):** In Window 2, toggle *Pork Sisig* back to **Available**.

---

## 3. UAT Sign-Off & Approval Record

| Role | Sign-Off Name | Date | Status |
| :--- | :--- | :---: | :---: |
| **System Architect** | Cyrel | 11/12/2026 | **PASSED** |
| **Full-Stack Lead** | Jelvie | 11/12/2026 | **PASSED** |
| **QA Lead** | Edelyn | 11/12/2026 | **PASSED** |
| **Town Business Owner** | Municipal Sponsor | 11/12/2026 | **ACCEPTED** |
