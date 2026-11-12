# DashBite — Role-by-Role Operational User Manuals (Task W7.03)

**Document Owner:** Jelvie (Lead Full-Stack Engineer) & Edelyn (QA Lead)  
**Reviewed by:** Cyrel (System Architect)  
**Release Target:** DashBite Town Delivery Platform v1.1  
**Date:** November 12, 2026  
**Status:** **Approved for Team Reference & User Acceptance Testing (UAT)**

---

## Table of Contents
1. [Customer PWA User Manual](#1-customer-pwa-user-manual)
2. [Restaurant Portal User Manual](#2-restaurant-portal-user-manual)
3. [Rider Portal User Manual](#3-rider-portal-user-manual)
4. [Admin Portal User Manual](#4-admin-portal-user-manual)

---

## 1. Customer PWA User Manual

The Customer Progressive Web Application (PWA) is a lightweight, mobile-first web app designed for town residents to discover local restaurants, order food, and track deliveries in real time.

### 1.1 Access & Authentication
1. **Opening the App:** Navigate to the DashBite web URL (e.g. `http://localhost:5173` on local testing, or town domain in production).
2. **Signing In:**
   - Tap **Login** on the header.
   - Enter your registered email address (`customer@test.com` for local testing) and password (`password`).
   - Alternatively, enter your mobile phone number / email and tap **Request OTP** to receive a 6-digit login code.
   - Tap **Sign In**. Once authenticated, your user profile will appear in the top-right corner.

### 1.2 Discovering Restaurants & Menus
1. **Browse Restaurants:** The Home tab displays all actively open restaurants located within your town's service boundary. Disabled or closed restaurants are automatically hidden or marked unavailable.
2. **View Menu:** Tap on any restaurant card to view its categories and menu items.
3. **Availability Badges:**
   - Items with a green or neutral price badge are **in stock** and ready to order.
   - Items with an orange or red **"Sold Out"** / **"Unavailable"** badge cannot be added to the cart. If you attempt to checkout with an unavailable item, the system prevents placement and displays an `OUT_OF_STOCK` notice.

### 1.3 Cart Management & Checkout
1. **Adding Items:** Tap the **"+"** button next to any item to add it to your order. The floating cart button updates with your item count and current food subtotal.
2. **Reviewing Cart:** Tap the cart pill to view line items, adjust quantities, or remove items.
3. **Delivery Address & Coordinates:**
   - Input your delivery address (e.g. `Plaza Rizal, Poblacion`).
   - Pin or enter your latitude and longitude coordinates.
   - **Service Boundary Check:** If your delivery location is outside the official municipal boundary polygon, the checkout form prevents submission and alerts you: *"The delivery address is outside the town service boundary (OUT_OF_BOUNDARY)"*.
4. **Transparent Fee Breakdown:**
   - **Food Subtotal:** Exact sum of selected dishes.
   - **Delivery Fee:** Town-wide flat fee (e.g. ₱30.00 or ₱40.00 as set by the Admin).
   - **Total Payable:** `Subtotal + Delivery Fee`.
   - **Platform Fee:** **₱0.00** (DashBite charges 0% platform commission).
5. **Placing the Order:** Select **Cash on Delivery (COD)** as your payment method and tap **Place Order (COD)**.

### 1.4 Real-Time Tracking & History
1. **Live Order Tracking:** After placement, your order is assigned a unique tracking number (e.g. `ORD-20261112-0005`) and appears under **My Orders**.
2. **Status Progression:**
   - `PENDING`: Sent to the kitchen; waiting for restaurant confirmation.
   - `ACCEPTED`: Confirmed by restaurant with estimated preparation time.
   - `PREPARING`: Actively being cooked.
   - `READY / SEARCHING_RIDER`: Food is packed; dispatching offers to nearby riders.
   - `PICKED_UP`: Rider has collected your food and is on the way.
   - `DELIVERED`: Handed to you; pay the exact total in cash.
3. **Rating & Feedback:** Once delivered, you can submit an optional 1–5 star rating and comment for the restaurant and rider separately.

---

## 2. Restaurant Portal User Manual

The Restaurant Portal gives kitchen operators, managers, and cashiers complete control over their active menu, incoming orders, and kitchen preparation stages.

### 2.1 Logging In
1. Navigate to the DashBite login screen and select the **Restaurant** tab.
2. Enter your restaurant manager email (`restaurant@test.com`) and password (`password`).
3. Tap **Sign In**. You are immediately taken to the **Restaurant Dashboard**.

### 2.2 Menu Management & Stock Availability
1. Navigate to the **Menu Management** tab.
2. **Adding an Item:** Tap **+ Add Dish**, provide the dish name, category, and price in PHP, and tap **Save**.
3. **Real-Time Out-of-Stock Toggle:**
   - If an ingredient runs out during a dinner rush, simply toggle the **Available** switch next to the dish.
   - Setting an item to **Off / Unavailable** immediately prevents customers from ordering that item across all PWAs without reloading.

### 2.3 Managing Incoming Orders
1. **Incoming Alert:** When a customer places an order, it appears immediately in the **Pending Orders** section with an audible ping.
2. **Accepting an Order:**
   - Review the ordered items and customer delivery notes.
   - Select or type the estimated preparation time (e.g. `20 mins`).
   - Tap **Accept Order**. The order moves to `ACCEPTED`.
3. **Rejecting an Order:**
   - If the kitchen is at capacity or closing early, tap **Reject Order**.
   - Select or type the mandatory decline reason (e.g. *"Kitchen closing early"*).
   - Tap **Confirm Rejection**. The order moves to `REJECTED`, the customer is notified, and rider dispatch is **never** started.

### 2.4 Kitchen Progression & Dispatch Trigger
1. **Marking "Preparing":** When the cooks fire the ticket, tap **Start Preparing**. The order transitions to `PREPARING` and displays an active countdown timer.
2. **Marking "Ready" (Dispatch Trigger):**
   - Once food is packed, bagged, and placed on the pickup counter, tap **Mark as Ready**.
   - **System Action:** This triggers the backend dispatch engine (`DispatchService::start()`), initiating the simultaneous 1 km ring broadcast to all eligible riders in the area.
   - The order status updates to `Searching for rider (1 km blast active)`.

### 2.5 Walk-in, Phone & Social Media Orders (REQ-04)
1. For orders received over phone or Facebook Messenger:
   - Tap **+ External Order**.
   - Input the customer's name, phone number, and delivery street address.
   - Select menu items and tap **Create Order**.
   - The ticket enters the standard kitchen lifecycle with source tag `phone` or `message`.

---

## 3. Rider Portal User Manual

The Rider Portal is an optimized mobile tool for delivery drivers to manage availability, claim delivery blast offers, navigate to merchants, and collect COD payments.

### 3.1 Account Registration & Pending Approval Screen
1. When a new rider registers, their account is placed in `PENDING_APPROVAL` status while the town administrator verifies their vehicle registration and license.
2. **Pending Screen:** Logging in displays an orange status pill: *"Account Pending Administrator Approval"*. Operational actions (such as going online or claiming orders) are locked until approved.
3. Once the Admin approves the account, the rider gains immediate operational access.

### 3.2 Toggling Online & Location Heartbeat
1. Tap the **Online / Offline** switch at the top of the portal.
2. **Automatic Location Heartbeat:**
   - When online, the portal automatically transmits GPS coordinates every 25 seconds (`PATCH /api/rider/location`).
   - To receive order blast offers, your location must have been updated within the last 120 seconds. If your device goes to sleep or loses signal, tap **Refresh Location** to wake the heartbeat.

### 3.3 Receiving & Claiming Blast Offers (1 km Ring)
1. **Incoming Blast:** When a nearby restaurant marks an order ready, all eligible online riders within 1 km receive a simultaneous audible offer card showing:
   - Restaurant Name & Address
   - Customer Delivery Neighborhood
   - Estimated Delivery Distance
   - Delivery Pay (Flat fee)
2. **Atomic Offer Acceptance:**
   - Tap **Accept Offer**.
   - **Race Safety:** The system awards the delivery to the first rider to click.
   - If you win: the screen updates with a green confirmation *"Assigned to Order #X"* and switches to the active delivery view.
   - If another rider clicks a fraction of a second earlier: a yellow notice alerts you *"Offer closed. Another rider accepted it first (OFFER_ALREADY_CLAIMED)"*. Your status remains available for the next order.

### 3.4 Pickup & Delivery Workflow
1. **Arriving at Restaurant:** Walk into the restaurant, verify the Order Number (e.g. `#ORD-0005`), inspect the sealed bag, and tap **Confirm Pickup**. The status moves to `PICKED_UP`.
2. **Dropoff & COD Cash Collection:**
   - Drive to the customer's delivery address.
   - Hand over the food order.
   - Collect the exact Cash on Delivery amount shown on screen (e.g. `₱330.00`).
   - Enter the collected cash in the **Cash Collected (₱)** input box.
   - Tap **Confirm Delivery & COD Collection**.
   - The order transitions to `DELIVERED`, your daily completed delivery count increments, your earnings balance updates, and your availability is reset to receive new orders.

---

## 4. Admin Portal User Manual

The Admin Portal is the town authority's command center for onboarding partners, tuning logistics parameters, resolving financial discrepancies, and reviewing platform operations.

### 4.1 Login & Dashboard Overview
1. Sign in with Admin credentials (`admin@test.com` / `password`).
2. The dashboard displays four core management consoles:
   - **User Management & Partner Approvals**
   - **Settings & Service Boundary**
   - **Financial Auditing & Discrepancy Queue**
   - **Monitoring & Quality Oversight**

### 4.2 Partner Approvals & Account Governance
1. Navigate to the **User Management** tab.
2. **Pending Approvals Queue:** Filter by status `Pending Approval`. Newly registered riders and merchants appear here with their contact details.
3. **Approving Partners:** Tap the green **Approve** button. The account status transitions immediately to `APPROVED`, enabling the partner to accept orders or go online.
4. **Suspending Accounts:** Tap **Disable Account** on any user row to immediately revoke operational access and block future logins.

### 4.3 Setting Delivery Fee & Service Boundary
1. Navigate to the **Settings & Boundary** tab.
2. **Delivery Fee Configuration:**
   - Enter the town flat delivery fee in the **Town Delivery Fee (PHP)** input (e.g. `₱30.00`).
   - Tap **Save Fee**.
   - *Rule:* Active in-flight orders preserve their frozen checkout fee; only new checkouts use the updated fee.
3. **Municipal Service Boundary:**
   - View the interactive polygon coordinates for the town service zone.
   - Update bounding coordinates (`lat_min, lat_max, lng_min, lng_max`) or polygon points to reflect town limits.
   - Tap **Update Service Boundary**. Any customer attempting to order outside this perimeter will be blocked with `OUT_OF_BOUNDARY`.

### 4.4 Financial Auditing & COD Discrepancy Queue
1. Navigate to the **COD Discrepancy Queue** tab.
2. **Flagged Discrepancies:**
   - When a rider confirms delivery but collects less than the total order amount (e.g. collecting ₱250 on a ₱280 order), the backend automatically flags the payment as `FLAGGED_DISCREPANCY` and halts automatic remittance.
   - The flagged record appears with the expected total, actual cash collected, variance (-₱30), and rider identity.
3. **Resolving Discrepancies:**
   - Review the incident details.
   - Type resolution audit notes (e.g. *"Customer short ₱30 waived per team lead approval"* or *"Rider remitted remaining ₱30 at town hall"*).
   - Tap **Resolve Discrepancy**.
   - The status updates to `REMITTED_TO_ADMIN`, releasing the payment for merchant settlement.

### 4.5 Ratings & Complaint Resolution
1. Navigate to the **Monitoring** tab.
2. **Customer Feedback:** Review recent star ratings and comments left for merchants and drivers.
3. **Attendance Logs:** Inspect rider online/offline check-in logs.
4. **Customer Complaints:** Review open dispute tickets filed by customers, input resolution notes, and mark tickets as **Resolved**.
