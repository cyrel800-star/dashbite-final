# DashBite — API Reference Specification (Task W7.03)

## A1. Document Header

| Field | Value |
| :--- | :--- |
| **Document owner** | Edelyn (QA & API Spec Lead) |
| **Repository** | `dashbite-backend` / `dashbite-frontend` |
| **Contract pack version** | v1.1 |
| **Date last updated** | 11/12/2026 |
| **Reviewed by** | Cyrel (Architect), Jelvie (Full-Stack Lead) |
| **Status** | **Approved & Production-Aligned** |

---

## 1. Authentication & Session Endpoints

### Endpoint: User Login

| Field | Value |
| :--- | :--- |
| **Purpose** | Authenticates users across all roles and issues a Sanctum Bearer token. |
| **Method and path** | `POST /api/auth/login` |
| **Who may call it** | Public (Customer, Restaurant, Rider, Admin) |
| **Account status required** | Any (`APPROVED` or `PENDING_APPROVAL` receive tokens; `DISABLED` is blocked). |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`LoginFlow.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Edelyn / Jelvie |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `email` | string | Yes | Valid email format |
| `password` | string | Yes | Plaintext password |
| `role` | string | No | `customer`, `restaurant`, `rider`, `admin` |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `token` (string), `role` (string), `status` (string), `user` (object: `id`, `name`, `email`, `role`, `account_status`, `restaurant_id`) |
| **Status value set** | Exact contract word: `APPROVED` or `PENDING_APPROVAL` |

#### Error outcomes
| Situation | HTTP status | Error code | What the user sees | Does any status change? |
| :--- | :---: | :--- | :--- | :---: |
| Missing email or password | 401 | `INVALID_CREDENTIALS` | "Login failed. Please enter your email and password." | No |
| Password mismatch or user not found | 401 | `INVALID_CREDENTIALS` | "Login failed. Invalid email or password." | No |
| Account has been disabled | 403 | `ACCOUNT_DISABLED` | "This account has been disabled. Please contact the administrator." | No |
| Rate limit exceeded (>5/min) | 429 | `TOO_MANY_REQUESTS` | "Too many attempts. Please wait 1 minute." | No |

---

### Endpoint: Request OTP Code

| Field | Value |
| :--- | :--- |
| **Purpose** | Generates and sends a 6-digit one-time passcode for passwordless authentication. |
| **Method and path** | `POST /api/auth/otp/request` |
| **Who may call it** | Public |
| **Account status required** | N/A |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`LoginFlow.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Edelyn |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `email` | string | Yes | Registered user email address |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("OTP sent successfully."), `expires_in` (seconds) |
| **Status value set** | N/A |

#### Error outcomes
| Situation | HTTP status | Error code | What the user sees | Does any status change? |
| :--- | :---: | :--- | :--- | :---: |
| Email field omitted | 422 | `VALIDATION_ERROR` | "The email field is required." | No |
| Sixth request in 1 minute | 429 | `OTP_THROTTLED` | "Too many OTP requests. Please wait before trying again." | No |

---

## 2. Public Catalog Endpoints

### Endpoint: List Active Restaurants

| Field | Value |
| :--- | :--- |
| **Purpose** | Retrieves town restaurants available for ordering within municipal boundaries. |
| **Method and path** | `GET /api/catalog/restaurants` |
| **Who may call it** | Public / Customer |
| **Account status required** | N/A |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`CustomerPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Jelvie |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `data` (array of objects: `id`, `name`, `address`, `phone`, `is_open`, `service_boundary`) |
| **Status value set** | N/A (disabled and unapproved restaurants are automatically filtered out) |

---

### Endpoint: View Restaurant Menu

| Field | Value |
| :--- | :--- |
| **Purpose** | Retrieves food items for a specific restaurant. |
| **Method and path** | `GET /api/catalog/restaurants/{id}/menu` |
| **Who may call it** | Public / Customer |
| **Account status required** | N/A |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`CustomerPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Jelvie |

#### Request parameters
| Parameter | Type | Required? | Description |
| :--- | :--- | :---: | :--- |
| `include_unavailable` | boolean | No | When `true`, returns all items including out-of-stock items (with `is_available: false`). |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `restaurant` (object), `menu_items` (array: `id`, `restaurant_id`, `name`, `price`, `is_available`) |
| **Status value set** | N/A |

---

## 3. Order Placement & Customer Lifecycle

### Endpoint: Place Customer Order

| Field | Value |
| :--- | :--- |
| **Purpose** | Validates stock, calculates delivery fee, verifies boundary, and registers a new order. |
| **Method and path** | `POST /api/orders` (alias: `POST /api/checkout`) |
| **Who may call it** | Customer |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`CustomerPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Cyrel |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `idempotency_key` | string | Yes | Unique UUID or client string (prevents duplicate orders) |
| `restaurant_id` | integer | Yes | Valid `restaurants.id` |
| `delivery_address` | string | Yes | Delivery street address |
| `delivery_lat` | number | Yes | Delivery latitude coordinate |
| `delivery_lng` | number | Yes | Delivery longitude coordinate |
| `payment_method` | string | Yes | Must be `cod` |
| `items` | array | Yes | Array of `{ "menu_item_id": integer, "quantity": integer }` |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 201 Created |
| **Body fields** | `order_id` (integer), `status` ("PENDING"), `message` (string), `data` (`id`, `order_number`, `subtotal`, `delivery_fee`, `total`, `status`, `placed_at`) |
| **Status value set** | `PENDING` |

#### Error outcomes
| Situation | HTTP status | Error code | What the user sees | Does any status change? |
| :--- | :---: | :--- | :--- | :---: |
| Item is out of stock (`is_available: false`) | 400 | `OUT_OF_STOCK` | "One or more items in your cart are currently out of stock." | No |
| Delivery coordinates outside polygon | 400 | `OUT_OF_BOUNDARY` | "The delivery address is outside the town service boundary." | No |
| Restaurant is closed or disabled | 400 | `INVALID_ORDER` | "Restaurant is currently closed or unavailable." | No |
| Unapproved customer account | 403 | `account_pending` | "Your account is pending administrator approval." | No |
| Duplicate submission (same `idempotency_key`)| 201 | N/A | Returns previously created order cleanly | No duplicate created |

---

## 4. Restaurant Operations & Dispatch Triggers

### Endpoint: Accept Order

| Field | Value |
| :--- | :--- |
| **Purpose** | Restaurant accepts an incoming order and inputs estimated prep time. |
| **Method and path** | `POST /api/restaurant/orders/{id}/accept` |
| **Who may call it** | Restaurant |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`RestaurantPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Jelvie |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `prep_minutes` | integer | No | Estimated preparation minutes (1–180) |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Order accepted."), `data` (`id`, `status: accepted`, `accepted_at`) |
| **Status value set** | `ACCEPTED` |

---

### Endpoint: Reject Order

| Field | Value |
| :--- | :--- |
| **Purpose** | Restaurant rejects order with required reason. Prevents rider dispatch. |
| **Method and path** | `POST /api/restaurant/orders/{id}/reject` |
| **Who may call it** | Restaurant |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`RestaurantPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Jelvie |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `reason` | string | Yes | Reason string (e.g. "Kitchen closed", "Ingredients exhausted") |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Order rejected."), `data` (`id`, `status: rejected`, `rejection_reason`) |
| **Status value set** | `REJECTED` |

---

### Endpoint: Mark Order Ready (Triggers Dispatch Blast)

| Field | Value |
| :--- | :--- |
| **Purpose** | Marks food packed and ready, immediately triggering the simultaneous 1 km rider ring blast. |
| **Method and path** | `PATCH /api/restaurant/orders/{id}/ready` |
| **Who may call it** | Restaurant |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`RestaurantPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Cyrel |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Order marked as ready and rider dispatch started."), `data` (`id`, `status: searching_rider`) |
| **Status value set** | `SEARCHING_RIDER` (internal: creates `dispatch_attempts` row at `ring_km: 1`) |

---

## 5. Rider Logistics & Dispatch Engine

### Endpoint: Rider Atomic Claim (Accept Offer)

| Field | Value |
| :--- | :--- |
| **Purpose** | Race-safe atomic offer acceptance by riders competing for a blast offer. |
| **Method and path** | `POST /api/dispatch/accept-offer` (alias: `POST /api/rider/offers/{id}/accept`) |
| **Who may call it** | Rider |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`RiderPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Cyrel |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `order_id` | integer | Yes | Order being claimed |
| `rider_id` | integer | Yes | Authenticated rider ID |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `status` ("ASSIGNED"), `message` ("You have accepted the order."), `data` (`order_id`, `status: ASSIGNED`) |
| **Status value set** | Order assigned to winner rider; rider marked `is_available: false`. |

#### Error outcomes
| Situation | HTTP status | Error code | What the user sees | Does any status change? |
| :--- | :---: | :--- | :--- | :---: |
| Another rider accepted the offer first | 409 | `OFFER_ALREADY_CLAIMED` | "Offer closed. Another rider accepted it first." | Losing offer closed; rider stays available |
| Order already assigned or cancelled | 409 | `OFFER_ALREADY_CLAIMED` | "Offer no longer available." | No |

---

### Endpoint: Confirm Pickup

| Field | Value |
| :--- | :--- |
| **Purpose** | Rider confirms receipt of food at restaurant. |
| **Method and path** | `PATCH /api/rider/orders/{id}/pickup` |
| **Who may call it** | Rider (must be assigned rider) |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`RiderPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Jelvie |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Order marked as picked up."), `status` ("PICKED_UP"), `data` (object) |
| **Status value set** | `PICKED_UP` |

---

### Endpoint: Confirm Delivery & Record COD

| Field | Value |
| :--- | :--- |
| **Purpose** | Rider confirms dropoff, records collected cash, frees rider availability, and initiates payment record. |
| **Method and path** | `PATCH /api/rider/orders/{id}/delivered` |
| **Who may call it** | Rider (must be assigned rider) |
| **Account status required** | `APPROVED` |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`RiderPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Cyrel |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `cash_collected` | number | Yes | Exact cash collected in PHP (required for COD) |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Order delivered."), `status` ("DELIVERED"), `data` (object: `id`, `status: delivered`, `cash_collected`, `delivered_at`) |
| **Status value set** | `DELIVERED`; Payment set to `COLLECTED_BY_RIDER` (or `FLAGGED_DISCREPANCY` if short). |

#### Error outcomes
| Situation | HTTP status | Error code | What the user sees | Does any status change? |
| :--- | :---: | :--- | :--- | :---: |
| Calling delivered before pickup | 422 | `INVALID_TRANSITION` | "Cannot mark delivered before pickup." | No |
| Missing cash amount for COD | 422 | `VALIDATION_ERROR` | "Cash amount is required for COD orders." | No |

---

## 6. Administration & Governance Endpoints

### Endpoint: Approve Pending User Account

| Field | Value |
| :--- | :--- |
| **Purpose** | Administrator approves pending rider or restaurant accounts for active operation. |
| **Method and path** | `POST /api/admin/users/{id}/approve` |
| **Who may call it** | Admin |
| **Account status required** | `APPROVED` (role:admin) |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`AdminPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Edelyn / Cyrel |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Account approved."), `data` (`id`, `account_status: approved`, `status: APPROVED`) |
| **Status value set** | `APPROVED` |

---

### Endpoint: Update System Delivery Fee

| Field | Value |
| :--- | :--- |
| **Purpose** | Sets the municipal flat delivery fee for new orders. |
| **Method and path** | `PATCH /api/admin/settings/fee` |
| **Who may call it** | Admin |
| **Account status required** | `APPROVED` (role:admin) |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`AdminPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Jelvie |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `delivery_fee` | number | Yes | Minimum ₱0.00, numeric |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Delivery fee updated."), `data` (`delivery_fee`) |
| **Status value set** | Active in-flight orders keep frozen fee snapshot. |

---

### Endpoint: Resolve COD Discrepancy

| Field | Value |
| :--- | :--- |
| **Purpose** | Reviews and clears a flagged cash shortfall from the Admin Discrepancy Queue. |
| **Method and path** | `POST /api/admin/payments/{id}/resolve-discrepancy` |
| **Who may call it** | Admin |
| **Account status required** | `APPROVED` (role:admin) |
| **Owning repo (provider)**| `dashbite-backend` |
| **Consuming repos** | `dashbite-frontend` (`AdminPortal.jsx`) |
| **Contract version** | v1.1 |
| **Endpoint owner** | Cyrel |

#### Request fields
| Field | Type | Required? | Rules / allowed values |
| :--- | :--- | :---: | :--- |
| `notes` | string | Yes | Audit notes explaining resolution reason (max 500 chars) |

#### Success response
| Item | Value |
| :--- | :--- |
| **HTTP status** | 200 OK |
| **Body fields** | `message` ("Discrepancy resolved."), `payment_status` ("REMITTED_TO_ADMIN"), `data` (object) |
| **Status value set** | Payment status updated from `FLAGGED_DISCREPANCY` to `REMITTED_TO_ADMIN`. |
