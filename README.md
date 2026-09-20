# INE Product Price Tracker

A production-quality full-stack **Product Price Tracker** built for the INE mock storefront ([https://demo.inelabteamdev.com/](https://demo.inelabteamdev.com/)).

The application enables users to search products, track price and stock over time, persist history and attempt logs in Supabase PostgreSQL, trigger manual or scheduled 2-hour automated Puppeteer scraping, and visualize price/stock trends on a React dashboard.

---

##  Architecture & Tech Stack

```
+---------------------+       REST API       +-----------------------+
|   React Dashboard   |  <---------------->  |  Node.js Express API  |
| (Vercel Frontend)   |                      |    (Render Backend)   |
+---------------------+                      +-----------+-----------+
                                                         |
                                     +-------------------+-------------------+
                                     |                                       |
                            +--------v--------+                    +---------v---------+
                            | Puppeteer Engine|                    | Supabase Postgres |
                            |(Headless/Headed)|                    |   Database Layer  |
                            +-----------------+                    +-------------------+
```

### Tech Stack
- **Frontend**: React.js, Vite, Vanilla CSS Design System, Lucide Icons
- **Backend**: Node.js, Express, Puppeteer
- **Database**: Supabase PostgreSQL (with automatic in-memory fallback for local dev)
- **Deployment**: Vercel (Frontend), Render (Backend), Supabase (Database), cron-job.org (2-hour scheduler)

---

##  Project Folder Structure

```
ine-project/
├── frontend/                 # React Vite Dashboard
│   ├── src/
│   │   ├── components/       # Header, ProductSearch, TrackedProductsList, PriceHistoryChart, ScrapeLogTable, ProductDetailModal
│   │   ├── lib/              # API client wrapper
│   │   ├── App.jsx           # Main Dashboard Container
│   │   ├── main.jsx          # React Entrypoint
│   │   └── index.css         # Custom CSS Design System
│   ├── index.html            # HTML Template
│   ├── vite.config.js        # Vite Config with Dev Proxy
│   └── package.json
│
├── backend/                  # Node.js Express API & Scraper Service
│   ├── src/
│   │   ├── config/           # Environment configuration (env.js)
│   │   ├── controllers/      # API Controllers (productController, trackingController)
│   │   ├── middleware/       # Auth (auth.js) & Error Handling (errorHandler.js)
│   │   ├── repositories/     # Supabase DB Repository (trackingRepository.js)
│   │   ├── routes/           # Express API Router (api.js)
│   │   ├── services/
│   │   │   ├── scraper/      # Browser, ProductScraper, Selectors, Retry, Types
│   │   │   └── tracking/     # TrackingService (Search, Scrape & Persist)
│   │   ├── app.js            # Express App setup
│   │   └── server.js         # HTTP Server Entrypoint
│   ├── scripts/
│   │   └── headed-scrape.js  # CLI Headed Puppeteer Demonstration Script
│   ├── tests/
│   │   └── scraper.test.js   # Unit & Data Integrity Tests
│   └── package.json
│
├── database/
│   └── schema.sql            # PostgreSQL Migration Schema for Supabase
│
├── docs/
│   └── design-note.md        # Technical Rationale, Scraper Strategy, and AI Lessons
│
├── .env.example              # Environment variables template
├── package.json              # Monorepo scripts
└── README.md
```

---

## ⚙️ Environment Variables

Create `.env` in the project root or `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# Supabase PostgreSQL Credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# INE Storefront Base URL
STORE_BASE_URL=https://demo.inelabteamdev.com

# Scraper Settings
SCRAPE_TIMEOUT_MS=30000
SCRAPE_MAX_RETRIES=3
SCRAPE_RETRY_BASE_DELAY_MS=1000

# Authentication Secret for External Scheduled Cron Job
CRON_SECRET=super-secret-cron-token-12345
```

---

##  Quick Start (Local Setup)

### 1. Install Dependencies
From root directory:
```bash
npm --prefix backend install
npm --prefix frontend install
```

### 2. Run Backend API Server
```bash
npm run dev:backend
```
Backend will start on `http://localhost:5000`.

### 3. Run Frontend Dashboard
```bash
npm run dev:frontend
```
Frontend will start on `http://localhost:3000`.

### 4. Run Unit Tests
```bash
npm test
```
Executes tests for price parsing, stock extraction, validation, and data overwrite safety.

---

##  Running Headed Puppeteer Scraper Demo

To visually demonstrate Puppeteer automation in **headed mode** (opening live Chrome, handling cookie banner, simulating mouse hover dwell time over `.price-block`, clicking `"Reveal price"`, and extracting data):

```bash
npm run scrape:headed -- 871
```
*Replace `871` with any valid product ID from the storefront.*

---

##  Database Schema & Supabase Setup

Run `database/schema.sql` in your Supabase SQL Editor:

1. **`tracked_products`**: Stores tracked items, `external_product_id`, name, URL, `current_price`, `current_stock`, and active status.
2. **`price_history`**: Stores timestamped price and stock history for tracked products.
3. **`scrape_logs`**: Stores attempt-by-attempt scrape outcome logs (`SUCCESS`, `RETRIED`, `FAILED`), duration in ms, attempt count, and error messages.

---

##  Scheduled Scraping & External Cron Setup

Production scraping runs every 2 hours via an authenticated endpoint to avoid free-tier server sleep issues:

- **Endpoint**: `POST /api/scrape/run`
- **Authentication**: Header `x-cron-secret: <CRON_SECRET>` or `Authorization: Bearer <CRON_SECRET>`

### Configuring cron-job.org (Free 2-Hour Cron)
1. Sign up at [cron-job.org](https://cron-job.org).
2. Create a new Cronjob:
   - **URL**: `https://your-render-backend.onrender.com/api/scrape/run`
   - **Method**: `POST`
   - **Schedule**: Every 2 hours (`0 */2 * * *`)
   - **Headers**: Add `x-cron-secret: <CRON_SECRET>`
3. Save. The external cron will trigger automated batch scraping across all active products every 2 hours.

---

##  API Endpoint Reference

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | Public | System health check |
| `GET` | `/api/products/search?q=...` | Public | Search INE storefront products by full/partial query |
| `POST` | `/api/tracked-products` | Public | Start tracking a product by `externalProductId` |
| `GET` | `/api/tracked-products` | Public | List all active tracked products |
| `GET` | `/api/tracked-products/:id` | Public | Get single tracked product |
| `GET` | `/api/tracked-products/:id/history` | Public | Get price & stock history timeseries |
| `GET` | `/api/tracked-products/:id/scrape-logs` | Public | Get attempt-by-attempt scrape logs |
| `POST` | `/api/tracked-products/:id/scrape` | Public | Trigger manual scrape for a product |
| `POST` | `/api/scrape/run` | Cron Secret | Authenticated endpoint for 2-hour scheduled batch scrape |

---

## Security & Data Integrity Guarantees

1. **No Fake Overwrites**: A failed scrape **never** overwrites existing `current_price` or inserts fake `$0` records in `price_history`. Failed scrapes are recorded honestly in `scrape_logs`.
2. **No Secret Exposure**: Supabase service role keys and `CRON_SECRET` remain strictly server-side.
3. **Restricted Scraping Domain**: The scraper only navigates to known URLs under `STORE_BASE_URL` (`https://demo.inelabteamdev.com`). Arbitrary URL submission is prohibited.

---

## Deployment Guide

### Deploy Backend to Render
1. Connect repository to Render as a **Web Service**.
2. Environment: `Node`. Root Directory: `backend`.
3. Build Command: `npm install && npx puppeteer browsers install chrome`
4. Start Command: `npm start`
5. Add Environment Variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `STORE_BASE_URL`).

### Deploy Frontend to Vercel
1. Connect repository to Vercel.
2. Root Directory: `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add Environment Variable if needed (or configure rewrite proxy in `vercel.json` pointing `/api/*` to Render backend URL).
