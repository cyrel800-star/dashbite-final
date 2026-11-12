# Rider workflow contract

Reviewed on 2026-11-08 against the frontend demo and the adjacent local Laravel checkout at `dashbite-backend-main`. The backend checkout is not the current frontend repository and is not confirmed as the authoritative rider API; the observations below describe only the local files inspected.

## Frontend demo behavior

- Rider approval is read from the browser-local account record. Pending, disabled, or unregistered riders cannot go online.
- An approved rider must grant browser geolocation permission and receive a location fix before going online. A location watch runs only while online and stops when the rider goes offline.
- The UI identifies location older than two minutes as stale. Location permission, unsupported browser, unavailable location, and timeout errors are shown to the rider.
- A restaurant records `readyAt` when marking an order ready. The local demo offer expires five minutes after `readyAt`; older records fall back to `updatedAt` or `createdAt`.
- Offer states are derived from local order data: `READY` becomes received or expired; a `RIDER_ASSIGNED` or `ON_THE_WAY` order is accepted for its assigned rider and closed for other riders; cancellation, rejection, or delivery closes a previously ready offer.
- Acceptance re-reads browser storage before updating and rejects stale, assigned, expired, or no-longer-ready offers. This is a demo concurrency guard, not a server-side atomic claim.
- Rider preferences and latest location are stored in browser local storage. Coordinates are not sent to a backend and are not shared across devices.
- Accepting an offer records `RIDER_ASSIGNED`; the rider must confirm pickup to advance it to `ON_THE_WAY`, then confirm delivery.
- COD deliveries require the collected amount. An amount that differs from the order total requires a second, explicit mismatch confirmation; both the amount and match/mismatch result are stored on the local order. Failed saves retain the entered amount and expose a retry action; duplicate actions are guarded and status is rechecked before writing.
- GCash/Maya orders are labeled paid online and are delivered without a cash amount field. Unknown/missing payment methods are clearly flagged and never prompt for cash collection.

## Backend evidence and integration gaps

- The inspected `routes/api.php` has `POST /api/rider/availability` behind Sanctum, rider-role, and approved-account middleware. Its handler currently returns only `{"ok":true}`; it does not persist availability.
- No rider location update, offer listing, offer acceptance, expiration, or closed-offer API route was found in that file.
- The inspected orders migration includes `payment_method` and `payment_reference`, but no `rider_id`, pickup/delivery collection status, or `cod_collected_amount` field.
- No rider location or offer-dispatch fields were found in the inspected database migrations.
- The inspected `Order` model's `rider()` relation points to `user_id`, which is also the customer relation, and the model has no rider assignment field in `$fillable`. This is not a usable assignment contract.
- No backend pickup/delivery action, COD collection recording, mismatch confirmation, or idempotent delivery-completion contract exists in the inspected API.
- The API availability stub does not specify payload fields or response shapes, and the frontend demo does not call it. Backend contract alignment for rider location and offer dispatch is therefore incomplete and must be agreed before wiring these local behaviors to a service.

## Verification

- `npm run build` passed and deployed the production frontend into the XAMPP project root.
- Browser-tested disabled-account gating, a granted location flow (using mocked browser coordinates), offline stopping location updates, and a denied-permission error.
- Browser-tested received, expired, accepted, and closed offer states; accepting an order changed it to `RIDER_ASSIGNED` and recorded the rider identity.
- Browser-tested stale-location messaging, disabled acceptance while location was stale, and rejection of an offer whose order changed to `CANCELLED` before acceptance.
- Browser-tested the rider views at 390px and 1280px; document width matched the viewport at both sizes.
- Browser-tested pickup (`RIDER_ASSIGNED` → `ON_THE_WAY`), exact COD collection, mismatch warning and explicit confirmation, duplicate-click behavior, and GCash delivery without a cash field.
- Simulated a browser-storage quota failure, confirmed the COD amount remained entered with a retry action, then retried successfully without duplicate completion.
- Browser-tested pickup and delivery actions at 390px; document width did not exceed the viewport.

These are frontend demo checks only; they do not verify a backend rider dispatch or location contract.
