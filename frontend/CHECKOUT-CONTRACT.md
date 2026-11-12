# Checkout contract review

Reviewed on 2026-11-08 while implementing the React customer checkout. This records the local Laravel checkout implementation observed in the adjacent `dashbite-backend-main` checkout; no backend files were changed. Provenance caveat: that checkout has pre-existing modifications and its Git remote points to `cyrel800-star/dashbite-frontend`, not a separately identified backend repository. Treat these notes as evidence from the local files, not a verified contract from a clean backend revision.

## Backend evidence

- `routes/web.php` registers `POST /restaurants/{restaurant}/orders` as `customer.orders.store`, behind customer authentication.
- `app/Http/Controllers/Customer/OrderController.php` validates:
  - `delivery_address`: required string, maximum 1000 characters.
  - `delivery_lat` and `delivery_lng`: optional numeric coordinates.
  - `payment_method`: `cod`, `gcash`, or `maya`.
  - `payment_reference`: required for GCash/Maya, optional for COD, maximum 100 characters.
  - `items`: at least one item; each `menu_item_id` is a distinct integer and each quantity is 1–50.
- The controller only accepts currently available items belonging to that restaurant, computes subtotal from current database prices, and persists the server-calculated delivery fee and total.
- `database/migrations/2026_11_01_162540_create_menu_items_table.php` has `is_available`, but no stock quantity. The observed stock contract is availability, not inventory counts.
- Fee source differs between the controller and checkout template: the controller uses `config('orders.delivery_fee')` (`config/orders.php`, default `ORDER_DELIVERY_FEE` is 0), while `resources/views/customer/restaurant-show.blade.php` displays `SystemConfig::current()->default_delivery_fee` (model default is 60). These can produce a displayed fee that differs from the saved order.
- `routes/api.php` has no customer order-creation route. The existing React API helper posts `createOrder` to `/orders`, which is not an endpoint in the observed API routes.
- The web route includes a required `{restaurant}` parameter, while the observed checkout template calls `route('customer.orders.store')` without passing it. Verify this against the intended backend revision before integration.
- The controller uses a database transaction but has no idempotency key. A client-side button guard cannot prevent duplicate requests caused by retries or multiple tabs.
- The backend order model persists `user_id`, and `User::orders()` provides an account-scoped relation. The order-creation controller assigns `user_id` from the authenticated request, so ownership is server-derived. The observed `routes/web.php` has no customer order-history route despite a customer orders Blade view in the checkout. The React demo therefore does not fetch backend-owned history.
- The backend order enum uses `pending`, `accepted`, `preparing`, `ready`, `completed`, and `cancelled`; the existing customer order Blade view additionally references `received`, `confirmed`, `finding_rider`, `rider_assigned`, `picked_up`, `out_for_delivery`, `delivered`, `rejected`, and `no_rider`. The enum and view have status-contract drift that should be resolved before API integration.

## React implementation

The React checkout in `src/components/customer/CustomerPortal.jsx` is intentionally a browser-local demo, not a backend request:

- It collects a required address (up to 1000 characters), the three backend payment-method values, and a required GCash/Maya reference (up to 100 characters).
- Quantity controls cap each line at 50. Before creating a local order, it re-reads the saved menu and rejects missing or unavailable items.
- It shows subtotal, delivery fee, total, and an order-confirmation state. A synchronous submit guard prevents repeated submission in the current page; local-storage errors are shown to the customer.
- The demo item IDs are strings such as `food-burger`, not backend integer `menu_item_id` values. It cannot yet submit a valid backend checkout payload.
- Demo delivery fees are read from the static restaurant sample data (`src/data/sample.js`), not from `SystemConfig` or `orders.delivery_fee`. They are estimates only; backend pricing must remain authoritative.

## Integration boundary

The current React flow covers the requested customer-facing checkout and outcomes for its local demo. Full contract alignment requires a customer JSON endpoint or a deliberate move to the Laravel web form, real backend menu IDs and catalog data, one shared delivery-fee source, and server-side idempotency. If quantity-based stock is required, the backend schema and checkout validation also need inventory fields and transactional decrementing; the current backend only supports available/unavailable status.

The customer status/history UI filters local orders by an exact normalized `customerEmail` match against the signed-in demo account, and new local checkouts record that email. This is display-level isolation only, not a security boundary: browser local storage is user-editable and is shared by the browser profile. Legacy demo orders without an owner email are hidden rather than exposed to every account. Production ownership must be enforced by an authenticated backend query using `user_id`.

## Verification evidence

- `npm run build` passed for the React frontend.
- `php artisan test --filter=RestaurantOperationsTest` passed in the adjacent backend checkout (4 tests, 35 assertions), including server-side price/fee calculation and unavailable-item rejection.
- Browser-tested missing address, missing GCash reference, successful GCash checkout, duplicate synchronous submit (one order saved), and an item becoming unavailable before submission (no new order).
- Browser-tested the customer order flow at a 390px viewport; the document had no horizontal overflow.
- Browser-tested owned current-order timeline, history entries for delivered/rejected/cancelled/no-rider, hidden unowned and legacy orders, empty current/history states, and a 7-step timeline on desktop.
- Browser-tested the customer order-history page at 390px; no horizontal overflow. A second account saw only its own tagged order.
