# DashBite frontend

DashBite is a React 19 + Vite 7 food-delivery demo. The main customer, restaurant, rider, and admin flows work in the browser without an API server. Accounts and activity are stored in the current browser and do not sync across devices.

## Run locally

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite (normally `http://localhost:5173/`). To create a production build:

```bash
npm run build
```

The build creates `dist/`; the `postbuild` script copies build output to the project root for XAMPP.

### Demo sign-in

Use any valid email and any password, choose a role, and enter OTP `123456`. This is a local demo flow, not secure authentication. Restaurant and rider sign-ups wait for approval by the local admin; no notification is sent when approved, so applicants must check back and sign in. Customer sign-ups are immediately available. Demo accounts, approvals, and saved records exist only in the same browser profile.

Select **Admin** from the sign-in role menu to open the local demo admin portal. Enter any valid email and a non-empty password, then use demo OTP `123456`. No pre-created admin account is required, and the password is not verified. This is not private or secure authentication and must not be used to protect real data.

## Demo features and limitations

- Customers can browse menus, build a cart, enter checkout details, select a demo payment method, review order confirmation, and see an order-status timeline and history for orders tagged to their signed-in email. The timeline shows status updates only—not live GPS. Orders, favorites, messages, and reviews are stored locally in the browser.
- Restaurant owners can add, edit, pause, and remove menu items, upload food images, update order status and hours, reply to customers, and see reviews.
- Approved riders can go online after granting browser location permission, see fresh/stale location messaging and received/expired/accepted/closed offer states, accept orders, confirm pickup and delivery, and record COD collections with explicit mismatch confirmation. GCash/Maya deliveries are marked paid online with no cash collection. Rider activity remains browser-local; it is not published to a backend.
- Admins can manage local accounts and orders, moderate reviews, view activity summaries, and upload homepage feature images.
- Uploaded images are resized and saved in browser storage. Clearing site data removes local demo changes.
- Maps, real payments, external chat, secure authentication, and backend rider location/offer dispatch require online services and are not implemented as real services.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/main.jsx` | React application entry point and stylesheet loading |
| `src/App.jsx` | Restores demo session state and routes landing, auth, and role portals |
| `src/components/Landing.jsx` | Public home/about sections and restaurant previews |
| `src/components/LoginFlow.jsx`, `SignupFlow.jsx`, `Forms.jsx` | Demo sign-in, OTP, registration, and shared auth fields |
| `src/components/PortalFrame.jsx` | Shared role portal navigation, profile/settings routes, and shell |
| `src/components/ProfileSettings.jsx` | Profile editing, preferences, dark theme, and admin feature-image uploads |
| `src/components/customer/CustomerPortal.jsx` | Customer browsing, checkout, owned-order status timeline/history, favorites, reviews, and chat |
| `src/components/restaurant/RestaurantPortal.jsx` | Menu editing, food-image uploads, order management, hours, and chat |
| `src/components/rider/RiderPortal.jsx` | Rider status, offers, deliveries, earnings, and chat |
| `RIDER-CONTRACT.md` | Rider workflow behavior and backend integration evidence/limitations |
| `src/components/admin/AdminPortal.jsx` | Local account, order, review, report, and activity management |
| `src/ui/components.jsx`, `src/ui/ui.css` | Reusable UI primitives and global/responsive styling |
| `src/data/` | Role/status constants, sample restaurant data, and bundled image references |
| `src/lib/localData.js` | Browser storage, persistent React state, and image validation/resizing |
| `src/lib/previewSession.js` | Session-only demo login state |
| `src/lib/api.js` | Optional API client retained for future backend integration; unused by current demo screens |
| `assets/` | Bundled logo and food photography |
| `scripts/deploy-build.js` | Copies production build output into the project root for XAMPP |

## Code comments

Short comments mark the main logical groups in application code and stylesheets, such as state setup, user actions, screen routing, shared UI, storage helpers, and responsive CSS. Use these section comments as landmarks when locating a feature; keep them concise and update them when moving or substantially changing a group.

## Backend integration

The current screens use browser-local data and do not require a backend. `src/lib/api.js` is a future integration helper only; maps, real payment processing, secure authentication, and cross-device synchronization are not provided by this demo. Checkout field and fee comparisons against the adjacent Laravel implementation are recorded in [CHECKOUT-CONTRACT.md](./CHECKOUT-CONTRACT.md); checkout is not yet wired to that backend.
