# BookHuntBD — Project Documentation

> Complete onboarding document for developers and AI agents. Merged from `frontend_prd_v2.md` and `book_comparison_prd_v2.md` (now deleted).

## Table of Contents
- [1. Project Overview](#1-project-overview)
- [2. Goals / Non-Goals](#2-goals--non-goals)
- [3. Features by Module (with status)](#3-features-by-module-with-status)
- [4. User Flows and Key Screens](#4-user-flows-and-key-screens)
- [5. Tech Stack and Architecture](#5-tech-stack-and-architecture)
- [6. Folder Structure](#6-folder-structure)
- [7. Data Models and API Endpoints](#7-data-models-and-api-endpoints)
- [8. Business Rules, Constraints, Edge Cases](#8-business-rules-constraints-edge-cases)
- [9. Setup and Run Instructions](#9-setup-and-run-instructions)
- [10. Conventions](#10-conventions)
- [11. Open Questions, Known Issues, Future Work](#11-open-questions-known-issues-future-work)
- [12. Notes for AI Agents](#12-notes-for-ai-agents)

---

## 1. Project Overview

**BookHuntBD** is a price-comparison web app for Bangladeshi online bookstores. Users search a book by title/ISBN/author once and instantly see prices across multiple BD book e-commerce sites (Rokomari, Wafilife, Prothoma, Harek Rokom, Eboighar, BoiBazar, Baatighar, DheeBooks, BookShoper). Users can maintain a wishlist and set price-drop alerts that fire via email when a book's price falls below a target.

Two independent codebases live side by side in this repo:

| Part | Path | Role |
|------|------|------|
| Frontend | `bookhuntbd_frontend/` | Next.js 16 App Router SPA |
| Backend | `bookHuntBD-Server/` | Express 5 + Prisma + BullMQ API |

There is no root workspace/package.json; each subdirectory is its own git repo.

## 2. Goals / Non-Goals

### Goals
- One search → multi-site price comparison for BD books.
- Fast results via Redis caching; graceful degradation when one site's scraper fails.
- Price alerts (email) when tracked books drop below a user-set threshold.
- Wishlist persisted per authenticated user (Google OAuth via better-auth).
- Mobile-first, clean UI in Bangla/English.

### Non-Goals
- Not a bookstore — no cart, checkout, payments, or inventory.
- No mobile apps (web only).
- No admin dashboard in current PRDs (planned later).
- No scraping behind logins / CAPTCHAs; only public search endpoints.

## 3. Features by Module (with status)

### 3.1 Search & Comparison — Done
- Global search bar (`/search`) with debounce; queries all scrapers in parallel (5s timeout each).
- Partial failures tolerated; response reports per-site errors without failing the whole request.
- Results paginated (`page`, `limit`), sorted by price/discount/relevance.
- 24h server-side cache (`BookCache`); responses include a `cached` flag.
- Redis-backed rate limit: 10 req/min/IP on search.

### 3.2 Auth — Done
- better-auth at `/api/auth/*`; Google OAuth only (no email/password in PRDs).
- Session cookie-based; frontend uses better-auth React client + `/api/users/me`.
- Profile view/update: `GET/PATCH /api/users/me`.

### 3.3 Wishlist — Done
- Add/remove/list wishlist items tied to a book result (title, site, URL, price snapshot).
- Frontend page `/wishlist`; optimistic UI via TanStack Query.

### 3.4 Price Alerts — Done (backend), In Progress (frontend)
- CRUD: `POST/GET/PATCH/DELETE /api/alerts` (auth required).
- BullMQ repeatable job every 6h re-scrapes tracked books; compares current vs target price; sends email via Resend when price ≤ target.
- Cleanup worker daily 3 AM deletes stale cache rows.
- Frontend page `/alerts` exists; polish/status UX still incomplete.

### 3.5 Scrapers — Done (9 sites, may need maintenance)
- Implemented in `src/scrapers/*.service.ts`: bookshoper, dheebooks, boibazar, harekrokom, eboighar, baatighar, rokomari, wafilife, prothoma.
- Shared `Scraper` interface, `withTimeout`, jitter, shared UA, `MAX_RESULTS_PER_SCRAPER = 5`, `parsePrice`, `calcDiscount`.
- Sites' HTML changes frequently — see `reports/scraper-fix-2026-09-07.md` for a recent fix pass.

### 3.6 Planned / Not Built
- Admin moderation of scrapers, ISBN auto-matching, user ratings — TBD in PRDs.
- Rokomari affiliate link support: env var `ROKOMARI_AFFILIATE_TOKEN` exists; full affiliate flow not wired end-to-end.
- Multi-currency / out-of-stock handling beyond simple parse failures.

## 4. User Flows and Key Screens

### Key screens (frontend routes)
| Route | Purpose |
|-------|---------|
| `/` | Landing + hero search |
| `/search` | Search results with per-site price cards, sort/filter |
| `/wishlist` | Saved books (auth required) |
| `/alerts` | Price alerts CRUD (auth required) |
| `/auth/login`, `/auth/register` | Google sign-in |
| `not-found.tsx`, `error.tsx` | 404 / error boundaries |

### Primary flows
1. **Search** → enter query → results across sites → sort by cheapest → open product on retailer site.
2. **Wishlist** → sign in → add from results → manage list on `/wishlist`.
3. **Alert** → add book + target price → daily/6-hourly checks → email when price drops → link back to product.
4. **Auth** → Google OAuth → session cookie → protected routes redirect to login.

## 5. Tech Stack and Architecture

### Frontend (`bookhuntbd_frontend`)
- **Next.js 16.2.0** (App Router), **React 19**, TypeScript, **pnpm**
- **Tailwind CSS v4**, Radix UI, lucide-react, sonner (toasts)
- **TanStack Query v5**, Axios, React Hook Form + Zod, @tanstack/react-virtual
- **better-auth** client; env via `src/lib/env.ts` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_NAME` — app refuses to boot without them)

### Backend (`bookHuntBD-Server`)
- **Node.js + Express 5**, TypeScript **ESM** (`"type": "module"`, imports need `.js` extensions)
- **Prisma 6** + PostgreSQL (`engineType = "library"`)
- **BullMQ + ioredis** (queues: `alert-queue`, `scrape-queue`, `cleanup-queue`)
- **cheerio** scrapers; **Resend** for alert emails; **better-auth** (Google OAuth); **helmet** + CORS; **zod** env validation at boot

### Architecture
```
Browser → Next.js frontend
            │  NEXT_PUBLIC_API_URL
            ▼
        Express API
   ├── /api/auth/*   (better-auth)
   ├── /api/books/search  → BookCache → (miss) parallel scrapers → persist cache
   ├── /api/users, /api/wishlist, /api/alerts
   └── BullMQ workers: check-alerts (cron 0 */6 * * *), cleanup (cron 0 3 * * *)
              │                    │
         PostgreSQL             Redis
```

## 6. Folder Structure

```
bookHuntBD/
├── about.md                     ← this file (single source of truth)
├── AGENTS.md
├── reports/                     ← investigation notes (e.g. scraper-fix-2026-09-07.md)
├── bookhuntbd_frontend/         ← independent git repo, pnpm
│   └── src/
│       ├── app/                 # App Router pages (see §4)
│       ├── components/          # ui, search, wishlist, shared
│       ├── hooks/               # useBooks, useWishlist, useAlerts, useFilters, useDebounce
│       ├── lib/                 # axios, auth, env, providers, queryClient
│       └── types/               # book, wishlist, alert, api
└── bookHuntBD-Server/           ← independent git repo, npm
    ├── book_comparison_prd_v2.md (deleted → about.md)
    ├── prisma/schema.prisma
    ├── src/
    │   ├── index.ts             # boot: Prisma → scheduleJobs → workers → listen
    │   ├── app.ts               # Express app, routers, auth, CORS
    │   ├── config.ts            # zod-parsed env
    │   ├── lib/                 # prisma, redis, mailer, …
    │   ├── middleware/          # validate, rate-limiter, requireAuth
    │   ├── modules/             # books, users, wishlist, alerts (controller/service/schema)
    │   ├── scrapers/            # base + 9 site scrapers + index registry
    │   └── queues/              # queue.ts, alert.worker, cleanup.worker
    └── legacy: server.js, routes/, scrapers/  ← OLD plain-JS v1; do not edit
```

⚠️ Legacy top-level `server.js` / `routes/` / `scrapers/` are superseded by `src/`. The Express app that runs is built in `src/`.

## 7. Data Models and API Endpoints

### Prisma models (PostgreSQL)
- **User / Session / Account / Verification** — managed by better-auth; relations to Wishlist & PriceAlert.
- **Wishlist** — per-user saved book (title, site, product URL, price snapshot; timestamps).
- **PriceAlert** — per-user target price on a book (title, site, URL, targetPrice, active flag, lastChecked/lastPrice as implemented in schema).
- **BookCache** — search cache: query key → JSON results + expiry (24h TTL logic in service).

*(Exact field list: see `bookHuntBD-Server/prisma/schema.prisma`.)*

### HTTP API
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/` | — | Health: `{status, service:"BookHuntBD API", version:"2.0.0"}` |
| * | `/api/auth/*` | — | better-auth handlers (before JSON body parser) |
| GET | `/api/books/search?query&page&limit` | rate-limited | Live search + cache |
| GET | `/api/users/me` | ✓ | Profile |
| PATCH | `/api/users/me` | ✓ | Update profile |
| POST | `/api/wishlist` | ✓ | Add |
| GET | `/api/wishlist` | ✓ | List |
| DELETE | `/api/wishlist/:id` | ✓ | Remove |
| POST | `/api/alerts` | ✓ | Create alert |
| GET | `/api/alerts` | ✓ | List |
| PATCH | `/api/alerts/:id` | ✓ | Update (e.g. target/active) |
| DELETE | `/api/alerts/:id` | ✓ | Delete |

### Search response shape (conceptual)
```json
{
  "results": [{ "title", "author", "price", "currency", "site", "url", "imageUrl", "inStock", "discount" }],
  "errors": [{ "site", "message" }],
  "page": 1, "limit": 10, "total": 42, "cached": false
}
```

### Background jobs
| Job | Schedule | Behavior |
|-----|----------|----------|
| check-alerts | every 6h (`0 */6 * * *`) | Re-scrape alerted books; if price ≤ target → email via Resend |
| cleanup-stale-cache | daily 3 AM (`0 3 * * *`) | Purge expired BookCache rows |
| scrape-queue | on-demand | Available queue for async re-scrapes |

Queue defaults: alert jobs 3 attempts exp backoff 2s; scrape 3 attempts 1s; cleanup 2 attempts.

## 8. Business Rules, Constraints, Edge Cases

- **Price parsing**: Bangla/English digits and "৳/Tk" handled in `parsePrice`; unparseable prices → site error entry, not whole-request failure.
- **Discount**: computed as `calcDiscount` (list vs sale price) when both available.
- **Per-scraper cap**: max 5 results per site per query (`MAX_RESULTS_PER_SCRAPER`).
- **Timeouts**: each scraper 5s; jitter 200–800ms between site calls to be polite.
- **Rate limit**: search 10/min/IP via Redis; other routes unlimited for now.
- **Cache**: 24h TTL; same query hits cache first; `cached: true` in response.
- **Alert emails**: only sent when current price ≤ target; from `ALERT_FROM_EMAIL` via Resend.
- **CORS**: `FRONTEND_URL` origin with credentials; production must set correct URL.
- **No secrets in repo**: only `.env.example` keys; real `.env` gitignored.
- **Edge cases**: all scrapers down → empty results + errors array; user unauthenticated on wishlist/alerts → 401; Better Auth mounted before `express.json` (cookie body parsing quirks).

## 9. Setup and Run Instructions

> Never commit real secrets. Copy env examples and fill locally.

### Prerequisites
Node 20+, **pnpm** (frontend), **npm** (backend), PostgreSQL, Redis.

### Backend — `bookHuntBD-Server/`
```bash
npm install
cp .env.example .env   # fill values (names below)
npm run db:generate
npm run db:push        # or npm run db:migrate
npm run dev            # tsx watch src/index.ts → PORT (default 3000)
```

**Required env (names only):**
`DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`, `ALERT_FROM_EMAIL`, `NODE_ENV`, `PORT`, `FRONTEND_URL`.  
Optional: `ROKOMARI_AFFILIATE_TOKEN`.

### Frontend — `bookhuntbd_frontend/`
```bash
pnpm install
# set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_APP_NAME in .env.local
pnpm dev               # http://localhost:3000 (or Next default)
pnpm build && pnpm start
pnpm lint
```

**Required env:** `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:3000/api`), `NEXT_PUBLIC_APP_NAME`.

## 10. Conventions

- **Frontend**: pnpm only; App Router; server components by default, `"use client"` only when needed; TanStack Query for all API reads/writes; Zod schemas colocated with forms; Tailwind utility classes; `@/*` → `src/*`.
- **Backend**: npm only; ESM with **`.js` extension on relative imports**; module = `*.controller.ts` + `*.service.ts` + `*.schema.ts` (zod); register routers in `src/app.ts`; validate via `middleware/validate`; errors → JSON `{ error: string }`; Prisma for all DB access; BullMQ for async work.
- **Commits**: conventional-ish messages; each subdir is its own git repo — commit inside each.
- **Docs**: `about.md` is the single product doc. Do not reintroduce per-app PRD duplicates without updating this file.

## 11. Open Questions, Known Issues, Future Work

### Conflicts found when merging PRDs
- Frontend PRD listed port 5173 habit; server default PORT is **3000** (`config.ts` default) while `.env.example` uses **5000**. **Use whatever `PORT` env is set; frontend `NEXT_PUBLIC_API_URL` must match.**
- Frontend PRD described password login in places; implementation and server PRD use **Google OAuth only** via better-auth. Password login: **TBD**.
- `FRONTEND_URL` default in server config is `http://localhost:5173` (Vite-style); actual Next dev is typically `http://localhost:3000`. Set explicitly.

### Known issues
- Scraper HTML drift is ongoing (see `reports/scraper-fix-2026-09-07.md`).
- Alert frontend polish incomplete; no dedup of identical alerts per user+book.
- Affiliate token not fully integrated.
- Legacy v1 code (`server.js`, top-level `routes/`, `scrapers/`) may confuse agents — ignore for new work.

### Future work
- ISBN-based matching; admin dashboard; notification channels beyond email (SMS/Telegram); scraper health monitoring; multi-currency.

## 12. Notes for AI Agents

1. **Two repos**: run pnpm only in `bookhuntbd_frontend/`, npm only in `bookHuntBD-Server/`. Never install with wrong package manager.
2. **Backend ESM**: every relative import must end in `.js` (`import { config } from "./config.js"`).
3. **Env is fatal**: server crashes at boot if any required env is missing/invalid (zod in `src/config.ts`). Don't "fix" by hardcoding secrets.
4. **Don't touch legacy** top-level `server.js` / `routes/` / old `scrapers/` in the server package.
5. **Search path**: `/api/books/search` → BookCache → parallel scrapers with timeout → persist. Preserve per-site error reporting.
6. **Auth**: better-auth mounts before `express.json()` — keep that order when editing `src/app.ts`.
7. **Scraper interface**: implement `Scraper` (`site`, `search`), reuse `withTimeout`, `parsePrice`, `calcDiscount`, `USER_AGENT`, `MAX_RESULTS_PER_SCRAPER`. Register in `src/scrapers/index.ts`.
8. **Jobs**: repeatable schedules live in `src/queues/queue.ts` (`scheduleJobs`).
9. **This file is canonical**: if product behavior changes, update `about.md` — do not create new root-level PRD files without a reason.
10. **No invented features**: anything not in code/PRDs above is out of scope until explicitly requested; mark proposals as TBD.
11. **Frontend framework version**: Next.js 16 + React 19 differ from older training data — check `node_modules/next/dist/docs/` before large frontend changes.
12. **No secrets in files**: never write API keys, OAuth secrets, or connection strings into code or docs; reference env var names only.

---

*Generated from full reads of `frontend_prd_v2.md` and `book_comparison_prd_v2.md` plus codebase inspection. PRD files have been removed; point all references here.*
