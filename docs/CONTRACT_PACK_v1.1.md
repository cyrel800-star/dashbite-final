# DashBite — Core Data Model & API Contract Pack v1.1

**Document Owner:** Cyrel (System Architect)  
**Co-Authors & Reviewers:** Edelyn (QA Lead), Jelvie (Full-Stack Engineer)  
**Contract Version:** v1.1  
**Supersedes:** Contract Pack v1.0 (November 1, 2026)  
**Effective Date:** November 12, 2026  
**Status:** **APPROVED & IMPLEMENTED**

---

## 1. Summary of Contract Updates (v1.0 → v1.1)

Contract Pack v1.1 incorporates crucial real-world architectural and operational refinements identified during integration and cross-repo QA:

1. **Identifier Standard: Integer `bigint` Across All Entities**
   - *v1.0 Specification:* Specified UUID string identifiers.
   - *v1.1 Update:* Standardized all primary keys and foreign keys to unsigned 64-bit integers (`bigint unsigned auto-increment`). This aligns MySQL database indexing, URL routing, and lightweight payload serialization while eliminating UUID parsing overhead on mobile PWAs.
2. **Intermediate Restaurant Order States: `PREPARING` and `READY`**
   - *v1.0 Specification:* Jumped directly from `ACCEPTED` to `SEARCHING_RIDER`.
   - *v1.1 Update:* Added explicit `PREPARING` (kitchen preparation in progress) and `READY` (food packed and waiting on dispatch counter). Marking an order `READY` serves as the programmatic trigger for `DispatchService::start()`, initiating the simultaneous 1 km rider ring blast.
3. **Repository Architecture: 3-Repository Topology**
   - *v1.0 Specification:* Assumed 4 frontend repositories (`dashbite-customer-pwa`, `dashbite-restaurant`, `dashbite-rider`, `dashbite-admin`).
   - *v1.1 Update:* Consolidated frontend portals into a single high-performance SPA (`dashbite-frontend` Vite 7 / React 19) featuring role-based route switching, reducing code duplication and deployment overhead.
4. **Hardcoded Zero Platform Commission Policy**
   - *v1.0 Specification:* Mentioned configurable platform commission fee.
   - *v1.1 Update:* Codified Decision Log W1.02: `platform_fee = 0.00` (₱0.00) hardcoded. 100% of food subtotal is remitted to the restaurant merchant; delivery fee belongs to rider logistics.
5. **Location Freshness Threshold for Dispatch**
   - *v1.0 Specification:* Stated riders must be online and available.
   - *v1.1 Update:* Added strict 120-second location freshness constraint (`RiderProfile::LOCATION_FRESHNESS_SECONDS = 120`). Riders must emit coordinates within 2 minutes to qualify for 1 km dispatch blast rings. Frontend maintains a 25-second location heartbeat.
6. **Strict COD Reconciliation & Discrepancy Queue**
   - *v1.0 Specification:* General remittance tracking.
   - *v1.1 Update:* Any cash collected less than order total automatically halts auto-settlement and flags payment status as `FLAGGED_DISCREPANCY`, immediately queueing the incident in the Admin Discrepancy Queue.

---

## 2. Core Status Vocabulary (Strict Normative Standard)

All backend endpoints, frontend screens, test scripts, and database records MUST strictly emit and parse the exact uppercase strings below. No synonyms or casing variations are permitted.

### 2.1 Order Statuses (`orders.status`)
```
PENDING           → Customer submitted order; awaiting restaurant review.
ACCEPTED          → Restaurant confirmed order; preparation estimated.
REJECTED          → Restaurant declined order (reason required; dispatch blocked).
PREPARING         → Kitchen is actively preparing the items.
READY             → Food is ready for pickup; triggers 1 km rider dispatch blast.
SEARCHING_RIDER   → Automated dispatch ring blast active; broadcasting offers.
NO_RIDER          → Maximum municipal boundary reached without rider claim.
PICKED_UP         → Assigned rider collected food from restaurant.
DELIVERED         → Assigned rider completed customer delivery & collected COD cash.
CANCELLED         → Order cancelled prior to pickup.
```

### 2.2 Account Statuses (`users.account_status`)
```
APPROVED          → Full operational access granted for assigned role.
PENDING_APPROVAL  → Rider or restaurant registered; awaiting Admin review (operational endpoints return 403).
DISABLED          → Account suspended by Admin; sign-in blocked completely with 403.
```

### 2.3 Payment Statuses (`payment_records.status`)
```
UNPAID                   → Initial state for orders prior to delivery confirmation.
COLLECTED_BY_RIDER       → Rider received full COD cash from customer upon delivery.
REMITTED_TO_ADMIN        → Rider surrendered collected cash to town administrator.
SETTLED_TO_RESTAURANT    → Town administrator disbursed food earnings to restaurant.
FLAGGED_DISCREPANCY      → Cash collected was less than order total; pending admin review.
```

---

## 3. Data Schema Specifications

All database tables utilize standard UTF8MB4 character sets and integer relational keys.

### 3.1 `users`
| Column | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | No | Primary Key |
| `name` | `VARCHAR(255)` | No | User full name |
| `email` | `VARCHAR(255)` | No | Unique login email |
| `phone` | `VARCHAR(30)` | Yes | Contact phone number |
| `password` | `VARCHAR(255)` | No | BCRYPT hashed password |
| `role` | `ENUM('customer','restaurant','rider','admin')` | No | Role access level |
| `account_status`| `VARCHAR(40)` | No | `pending`, `approved`, `disabled` |
| `restaurant_id` | `BIGINT UNSIGNED` | Yes | Foreign Key to `restaurants.id` |
| `created_at` / `updated_at` | `TIMESTAMP` | Yes | Laravel timestamps |

### 3.2 `restaurants`
| Column | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | No | Primary Key |
| `name` | `VARCHAR(255)` | No | Commercial business name |
| `address` | `VARCHAR(500)` | No | Physical address |
| `phone` | `VARCHAR(30)` | No | Contact phone |
| `service_boundary` | `JSON` | Yes | GeoJSON or polygon coordinates `{lat_min, lat_max, lng_min, lng_max}` |
| `is_open` | `BOOLEAN` | No | Operational open/closed status (default `true`) |
| `is_disabled` | `BOOLEAN` | No | Admin operational override (default `false`) |

### 3.3 `menu_items`
| Column | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | No | Primary Key |
| `restaurant_id` | `BIGINT UNSIGNED` | No | Foreign Key to `restaurants.id` |
| `name` | `VARCHAR(255)` | No | Item name |
| `price` | `DECIMAL(10,2)` | No | Item base price in PHP |
| `is_available` | `BOOLEAN` | No | In-stock (`true`) / out-of-stock (`false`) toggle |

### 3.4 `orders`
| Column | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | No | Primary Key |
| `order_number` | `VARCHAR(50)` | No | Formatted tracking code (`ORD-YYYYMMDD-XXXX`) |
| `idempotency_key` | `VARCHAR(100)` | No | Unique client request identifier |
| `customer_id` | `BIGINT UNSIGNED` | Yes | Foreign Key to `users.id` (nullable for walk-in/phone orders) |
| `restaurant_id` | `BIGINT UNSIGNED` | No | Foreign Key to `restaurants.id` |
| `rider_id` | `BIGINT UNSIGNED` | Yes | Foreign Key to `users.id` (assigned rider) |
| `status` | `VARCHAR(40)` | No | Exact order status vocabulary |
| `payment_method` | `VARCHAR(20)` | No | Default `cod` |
| `subtotal` | `DECIMAL(10,2)` | No | Sum of line items |
| `delivery_fee` | `DECIMAL(10,2)` | No | Frozen delivery fee applied at checkout |
| `total` | `DECIMAL(10,2)` | No | `subtotal + delivery_fee` |
| `delivery_address` | `VARCHAR(500)` | No | Street address |
| `delivery_lat` | `DECIMAL(10,7)` | Yes | Delivery latitude coordinate |
| `delivery_lng` | `DECIMAL(10,7)` | Yes | Delivery longitude coordinate |
| `cash_collected` | `DECIMAL(10,2)` | Yes | Exact cash collected by rider upon delivery |
| `placed_at` / `accepted_at` / `delivered_at` | `TIMESTAMP` | Yes | Lifecycle transition timestamps |

### 3.5 `dispatch_attempts` & `dispatch_offers`
- **`dispatch_attempts`**: Records each ring blast wave (`ring_km: 1, 2, 3...`, `status: broadcasting, assigned, timed_out`, `winner_rider_id`).
- **`dispatch_offers`**: Individual rider offer rows (`order_id`, `dispatch_attempt_id`, `rider_id`, `status: pending, accepted, closed, expired`, `offered_at`).

### 3.6 `payment_records`
| Column | Type | Nullable | Description |
| :--- | :--- | :---: | :--- |
| `id` | `BIGINT UNSIGNED AUTO_INCREMENT` | No | Primary Key |
| `order_id` | `BIGINT UNSIGNED` | No | Foreign Key to `orders.id` |
| `method` | `VARCHAR(20)` | No | Payment method (`cod`) |
| `status` | `VARCHAR(40)` | No | Payment status vocabulary |
| `amount` | `DECIMAL(10,2)` | No | Expected order total |
| `rider_cut` | `DECIMAL(10,2)` | No | Flat rider cut (₱20.00) |
| `platform_fee` | `DECIMAL(10,2)` | No | Hardcoded ₱0.00 (Decision Log W1.02) |
| `restaurant_share` | `DECIMAL(10,2)` | No | Full subtotal (₱0% platform commission) |

---

## 4. Business & Dispatch Rules

1. **Simultaneous 1 km Ring Blast**:
   - Initial blast reaches all approved, online riders whose distance to restaurant is $\le 1\text{ km}$ and whose location heartbeat was received within 120 seconds.
   - Offers are dispatched simultaneously to all eligible riders in the ring.
2. **Race-Safe Atomic Offer Acceptance**:
   - The first rider to click "Accept" executes a database pessimistic row lock (`lockForUpdate`).
   - The winning rider receives HTTP 200 `ASSIGNED`.
   - All subsequent or simultaneous attempts receive HTTP 409 `OFFER_ALREADY_CLAIMED`.
   - Losing offers are immediately closed.
3. **Ring Expansion & Boundary Limit**:
   - If an attempt expires without acceptance, the system expands the radius by 1 km (e.g. 1 km → 2 km → 3 km).
   - If the maximum municipal service boundary (5 km) is reached without an acceptance, the order is set to `NO_RIDER`.
4. **Dispatch Isolation Rule**:
   - Dispatch eligibility is determined solely by `[approved_account, is_online, is_available, distance_km <= ring_km, last_location_at >= now - 120s]`.
   - Customer ratings, feedbacks, complaints, and attendance logs are strictly isolated from the dispatch ranking algorithm.
5. **Strict Financial Discrepancy Routing**:
   - When marking an order `DELIVERED`, the rider must enter the exact cash amount collected.
   - If `cash_collected < total`, the payment status is marked `FLAGGED_DISCREPANCY`.
   - Auto-settlement is halted and the record is surfaced on the Admin Discrepancy Queue for manual review.

---

## 5. Architectural Topology

```mermaid
flowchart TD
    subgraph Client ["Frontend Single Page App (dashbite-frontend :5173)"]
        CP["Customer PWA Screen"]
        RP["Restaurant Portal Screen"]
        RD["Rider Portal Screen"]
        AP["Admin Portal Screen"]
    end

    subgraph Server ["Backend API (dashbite-backend :8000)"]
        AUTH["Sanctum Auth & Throttle"]
        CAT["Catalog & Pricing Engine"]
        ORD["Order Lifecycle Service"]
        DISP["Race-Safe Dispatch Engine (1km Rings)"]
        PAY["COD Settlement & Discrepancy Service"]
    end

    subgraph Storage ["Persistent Storage (MySQL 8.0)"]
        DB[(dashbite_db)]
    end

    CP -->|POST /orders| ORD
    RP -->|PATCH /ready| DISP
    RD -->|POST /accept-offer (lock)| DISP
    RD -->|PATCH /delivered (COD)| PAY
    AP -->|Resolve Discrepancies| PAY
    AUTH --> DB
    ORD --> DB
    DISP --> DB
    PAY --> DB
```
