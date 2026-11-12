# 🛵 DashBite — Team Monorepo

> **For Jelvie & Archie:** This is the single source of truth for the final phase of the DashBite project. Read this entire file before writing a single line of code.

---

## 📋 Project Overview

**DashBite** is a food delivery platform built for a local market. It supports **four distinct user roles**, each with their own portal:

| Role | Portal | What they do |
|------|--------|-------------|
| **Customer** | React PWA (`/`) | Browse restaurants, place orders, track delivery in real time |
| **Restaurant** | React Portal (`/restaurant`) | Receive orders, Accept/Reject, mark PREPARING → READY |
| **Rider** | React Portal (`/rider`) | Receive dispatch blast offers, Accept, Confirm Pickup, Confirm Delivery + COD entry |
| **Admin** | React Portal (`/admin`) | Approve rider/restaurant accounts, manage delivery fee & service boundary, resolve COD discrepancy queue |

The system uses a **ring-blast dispatch engine**: when a restaurant marks an order `READY`, the backend broadcasts an offer to all online+available riders within 1 km. If no one accepts, the ring expands by 1 km increments up to the service boundary limit.

---

## 📁 Folder Structure

```
dashbite-final/              ← This monorepo root
│
├── backend/                 ← Laravel 11 REST API (PHP 8.2+, MySQL 8)
│   ├── app/
│   │   ├── Http/Controllers/Api/   ← All API controllers
│   │   ├── Models/                 ← Eloquent models
│   │   ├── Jobs/                   ← DispatchRingJob (queued blast engine)
│   │   └── Services/               ← Business logic services
│   ├── database/
│   │   ├── migrations/             ← All schema definitions (source of truth)
│   │   └── seeders/                ← DatabaseSeeder with test accounts
│   ├── routes/api.php              ← All API routes
│   ├── .env.example                ← Copy this to .env — fill in your DB creds
│   └── ...
│
├── frontend/                ← React 18 + Vite 5 SPA
│   ├── src/
│   │   ├── pages/                  ← CustomerApp, RestaurantPortal, RiderPortal, AdminPortal
│   │   ├── components/             ← Shared UI components
│   │   └── api/                    ← Axios wrappers for all backend calls
│   ├── .env.example                ← Copy this to .env — set VITE_API_URL
│   └── ...
│
├── docs/                    ← 📚 THE RULEBOOKS — READ BEFORE CODING
│   ├── CONTRACT_PACK_v1.1.md       ← ⭐ THE LAW — status vocab, dispatch rules, error codes
│   ├── API_REFERENCE.md            ← Every endpoint, request/response shape, auth headers
│   ├── USER_MANUALS.md             ← Step-by-step guides for all 4 roles
│   ├── TEST_EVIDENCE_W7.02.md      ← QA regression evidence (9 flows, 102 tests passing)
│   ├── UAT_LUNCH_RUSH_SCRIPT.md    ← Final acceptance test script
│   └── PRODUCTION_DEPLOYMENT_GUIDE.md ← Server deployment reference
│
├── .gitignore               ← Keeps secrets and build artifacts out of git
└── README.md                ← This file
```

---

## ⚙️ Local Setup Instructions

Follow these steps **exactly** in order. Do not skip any step.

### Prerequisites

Make sure you have these installed before starting:

- **PHP 8.2+** — `php -v`
- **Composer 2+** — `composer -V`
- **Node.js 20+ & npm** — `node -v && npm -v`
- **MySQL 8** — running locally (e.g., via XAMPP, Laragon, or native install)
- **Git** — `git -v`

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/dashbite-final.git
cd dashbite-final
```

---

### Step 2 — Set up the Backend (Laravel)

```bash
cd backend

# 1. Install PHP dependencies
composer install

# 2. Copy the environment file and open it in your editor
cp .env.example .env

# 3. Edit .env — fill in your local MySQL credentials:
#    DB_DATABASE=dashbite
#    DB_USERNAME=root
#    DB_PASSWORD=your_password

# 4. Generate the application encryption key
php artisan key:generate

# 5. Create the database in MySQL first (run this in MySQL shell or phpMyAdmin):
#    CREATE DATABASE dashbite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 6. Run all migrations AND seed test data
php artisan migrate --seed

# 7. Start the backend development server
php artisan serve --port=8000
```

> **Backend is now running at:** http://127.0.0.1:8000

---

### Step 3 — Set up the Frontend (React/Vite)

Open a **second terminal** (keep the backend running in the first):

```bash
cd frontend

# 1. Install JS dependencies
npm install

# 2. Copy the environment file
cp .env.example .env

# 3. Verify .env contains:
#    VITE_API_URL=http://127.0.0.1:8000/api

# 4. Start the Vite dev server
npm run dev
```

> **Frontend is now running at:** http://localhost:5173

---

### Step 4 — Log In & Test

Use these seeded test accounts (password is always `password` for all):

| Role | Email |
|------|-------|
| Customer | `customer@test.com` |
| Restaurant | `restaurant@test.com` |
| Rider | `rider@test.com` |
| Admin | `admin@test.com` |
| Pending Rider (for approval flow) | `rider.pending@test.com` |

---

### Step 5 — Run the backend queue worker (for dispatch)

The ring-blast dispatch engine runs via Laravel queues. In a **third terminal**:

```bash
cd backend
php artisan queue:work --sleep=3 --tries=3
```

> Without this, orders marked `READY` will not trigger rider dispatch blasts.

---

## ⚠️ THE GOLDEN RULES

> **Read `docs/CONTRACT_PACK_v1.1.md` in full before making any changes.** These rules are non-negotiable and have been signed off between the development team and the project stakeholders.

### 1. Status Vocabulary is STRICTLY Uppercase

Order statuses **must always** be written in ALL CAPS, exactly as defined. Do not invent variants.

| ✅ Correct | ❌ Wrong |
|-----------|---------|
| `PENDING` | `pending`, `Pending` |
| `ACCEPTED` | `accepted`, `Accepted` |
| `PREPARING` | `preparing` |
| `READY` | `ready`, `Ready` |
| `PICKED_UP` | `pickedup`, `picked_up` |
| `DELIVERED` | `delivered`, `Delivered` |
| `CANCELLED` | `canceled`, `CANCELED` |

This applies to: database values, API responses, frontend display logic, test assertions — **everywhere**.

---

### 2. Platform Fee is Always ₱0.00

**Decision Log W1.02:** The platform fee (`platform_fee`) is **hardcoded to `0.00`** in `payment_records`. It must **never** be changed, calculated, or made configurable. Any PR that touches this value will be rejected.

---

### 3. Dispatch Race Condition Rules

When a rider accepts a dispatch offer:
- The backend uses a **database-level unique constraint + optimistic lock** to ensure only ONE rider wins the offer, even if two riders click simultaneously.
- If a rider tries to accept an already-claimed offer, they receive `HTTP 409 Conflict`.
- The frontend **must** handle `409` gracefully (show "Offer already taken" — do not crash).
- Do **not** implement any client-side "first click wins" logic — the server is the authority.

---

### 4. Error Codes the Frontend Must Handle

These are contract-level error codes returned in the `error` field of API responses:

| Code | Meaning | Frontend behavior |
|------|---------|-------------------|
| `OUT_OF_STOCK` | Item is `is_available = false` | Show inline error on cart item |
| `OUT_OF_BOUNDARY` | Delivery address outside service boundary polygon | Show address-level error |
| `THROTTLED` | OTP rate limit hit | Show cooldown message |
| `INVALID_OTP` | Wrong OTP code | Show "Incorrect code" message |
| `OFFER_TAKEN` | Rider offer already accepted by another rider | Show "Offer already taken" toast |

---

### 5. API Authentication

All protected routes require a **Sanctum Bearer token** in the `Authorization` header:

```
Authorization: Bearer <token>
```

Tokens are returned from `POST /api/auth/login`. Store them in `localStorage` (the frontend already does this). Do **not** store raw passwords anywhere.

---

## 📚 Where to Find Things

| I need to know... | Read this file |
|------------------|---------------|
| What statuses/error codes exist | [`docs/CONTRACT_PACK_v1.1.md`](./docs/CONTRACT_PACK_v1.1.md) |
| What API endpoints exist & their request/response shape | [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) |
| How each role uses the app (user flows) | [`docs/USER_MANUALS.md`](./docs/USER_MANUALS.md) |
| QA test results & what has been verified | [`docs/TEST_EVIDENCE_W7.02.md`](./docs/TEST_EVIDENCE_W7.02.md) |
| Final acceptance test procedure | [`docs/UAT_LUNCH_RUSH_SCRIPT.md`](./docs/UAT_LUNCH_RUSH_SCRIPT.md) |
| How to deploy to production | [`docs/PRODUCTION_DEPLOYMENT_GUIDE.md`](./docs/PRODUCTION_DEPLOYMENT_GUIDE.md) |

---

## 🌿 Git Workflow

We use a **feature branch workflow**. Never commit directly to `main`.

```bash
# Start a new feature
git checkout -b feat/your-feature-name

# When done, push and open a Pull Request
git push origin feat/your-feature-name
```

Branch naming conventions:
- `feat/` — new features
- `fix/` — bug fixes
- `docs/` — documentation only
- `chore/` — config, build, dependency changes

**Pull Requests require at least one review before merging to `main`.**

---

## 🔐 Security Reminders

- **NEVER commit `.env`** — it contains your database password and app key. It is in `.gitignore`.
- **NEVER commit `vendor/`** or `node_modules/` — they are generated by `composer install` / `npm install`.
- If you accidentally commit a secret, tell the team lead immediately.

---

## 👥 Team

| Name | Role |
|------|------|
| Cyrel | Project Lead / Backend Architect |
| Jelvie | Frontend / Contract Sign-off |
| Archie | Full-stack / QA |

---

*DashBite — Final Phase Monorepo. Initialized November 2026.*
