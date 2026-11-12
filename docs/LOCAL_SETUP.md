# DashBite — Local Environment Setup Guide

This guide walks you through setting up and running the DashBite API backend and frontend portals together on a local development machine.

---

## 1. Prerequisites

Ensure you have the following installed on your machine:
- **PHP** 8.2 or higher (with extensions: `pdo_mysql`, `zip`, `fileinfo`, `mbstring`, `openssl`)
- **Composer** 2.x
- **Node.js** 18+ (Node 20+ recommended) and **npm** 9+
- **MySQL** 8.0+ or **MariaDB** 10.4+ (e.g., via XAMPP)
- **Git**

---

## 2. Database Setup

1. Start your local MySQL server (e.g., via the XAMPP Control Panel or service).
2. Create an empty database named `dashbite_db`:
   ```bash
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dashbite_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```
   *(If your local MySQL root user has no password, omit `-p`)*.

---

## 3. Backend Setup (`dashbite-backend`)

1. Open your terminal and change directory into the backend repository:
   ```bash
   cd dashbite-backend
   ```

2. Copy the environment template:
   ```bash
   cp .env.example .env
   # On Windows PowerShell:
   Copy-Item .env.example .env
   ```

3. Verify your database settings in `.env`:
   ```ini
   APP_NAME=DashBite
   APP_ENV=local
   APP_KEY=
   APP_DEBUG=true
   APP_URL=http://localhost:8000

   DB_CONNECTION=mysql
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_DATABASE=dashbite_db
   DB_USERNAME=root
   DB_PASSWORD=
   ```

4. Install PHP dependencies:
   ```bash
   composer install
   ```
   *(Note: Ensure `extension=zip` is enabled in your `php.ini`)*.

5. Generate the application encryption key:
   ```bash
   php artisan key:generate
   ```

6. Run database migrations and seed default test data:
   ```bash
   php artisan migrate:fresh --seed
   ```

7. Start the local backend API server:
   ```bash
   php artisan serve --port=8000
   ```
   The backend API is now running at `http://localhost:8000`.

---

## 4. Frontend Setup (`dashbite-frontend`)

1. In a new terminal window, navigate to the frontend directory:
   ```bash
   cd dashbite-frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application is now accessible at `http://localhost:5173`.

---

## 5. Seeded Accounts & Test Credentials

The seed script creates ready-to-test accounts for every role with password: **`password`**:

| Role | Email | Password | Account Status | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Customer** | `customer@test.com` | `password` | `APPROVED` | Ready to browse and order |
| **Restaurant** | `restaurant@test.com` | `password` | `APPROVED` | Linked to "Baumbach-Lehner Kitchen" |
| **Rider 1** | `rider@test.com` | `password` | `APPROVED` | Online, available (~0.5 km from restaurant) |
| **Rider 2** | `rider2@test.com` | `password` | `APPROVED` | Online, available (~0.5 km, race test competitor) |
| **Rider (Pending)** | `rider.pending@test.com` | `password` | `PENDING_APPROVAL`| Gated from operational actions |
| **Restaurant (Disabled)** | `restaurant.disabled@test.com` | `password` | `DISABLED` | Sign-in / ordering blocked |
| **Admin** | `admin@test.com` | `password` | `APPROVED` | Full administrative controls |

---

## 6. Seeded Catalog & Settings

- **Approved Restaurant:** "Baumbach-Lehner Kitchen" (ID: 1)
  - Coordinates: Lat `14.5995`, Lng `120.9842`
  - Service boundary: `lat_min: 14.5500`, `lat_max: 14.6500`, `lng_min: 120.9400`, `lng_max: 121.0300` (radius 5 km)
- **Menu Items:**
  - 5 Available Items: Burger Classic (₱120), Pizza Pepperoni (₱180), Chicken Noodles (₱150), Chicken Wings (₱200), Kare-Kare (₱340)
  - 1 Out of Stock Item: "Sold Out Item" (`is_available = false`, ₱160)
- **System Settings:**
  - `delivery_fee`: `30.00`
  - `service_boundary`: Town-wide coordinates center (Lat `14.5995`, Lng `120.9842`)

---

## 7. Running Backend Tests

To run the full suite of automated regression tests:
```bash
cd dashbite-backend
php artisan test
```
All feature tests execute against an isolated in-memory SQLite database without modifying your MySQL `dashbite_db` data.
