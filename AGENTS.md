# BookHuntBD

Book price-comparison app for Bangladeshi e-commerce: a Next.js frontend and an Express API that scrapes book prices. The two live in **sibling, independently-owned git repos** — there is no root workspace, workspace config, or root `package.json`. Run git commands inside each subdirectory.

## Repos & tools

- `bookhuntbd_frontend/` — Next.js 16 App Router + React 19. **pnpm**. TanStack Query, better-auth client, Tailwind v4, Radix UI. See its own `AGENTS.md` for the Next 16 breaking-changes warning (docs in `node_modules/next/dist/docs/`). Commands: `pnpm dev`, `pnpm build`, `pnpm lint` (eslint). No test suite. Alias `@/*` → `./src/*`. Calls the API server, not in-repo.
- `bookHuntBD-Server/` — Express 5 + TypeScript (ESM). **npm** (do not use pnpm here). Prisma + PostgreSQL, BullMQ + Redis, better-auth. Commands: `npm run dev` (`tsx watch src/index.ts`), `npm run build` (tsc → `dist`), `npm start`, `npm run db:generate|db:migrate|db:push`. No lint or test scripts.

## Critical server gotchas

- **Legacy v1 code is live at the top level**: `server.js`, `routes/`, `scrapers/` are old plain-JS leftovers. The real app lives under `src/` (modules + scrapers) with a modular v2 architecture built on `src/app.ts` + `src/index.ts` + `src/config.ts`. Don't edit the legacy files.
- Imports are ESM/NodeNext: relative imports **must include the `.js` extension** (`import { config } from "./config.js"`), matching the existing style.
- `src/config.ts` zod-parses the whole env at startup — any missing/invalid var crashes the process. Required: `DATABASE_URL`, `REDIS_URL`, `BETTER_AUTH_SECRET` (≥32 chars), `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (must start `re_`), `ALERT_FROM_EMAIL`, `FRONTEND_URL`. Copy `.env.example` → `.env`.
- To run you need **PostgreSQL and Redis running locally**; `src/index.ts` connects to Prisma, registers BullMQ repeatable jobs, and starts workers before listening on `config.PORT` (env default 3000, `.env.example` uses 5000).
- Search is rate-limited via Redis (10 req/min/IP) and cached in `BookCache` (24h).

## Data flow

`GET /api/books/search?query&page&limit&site&sort` → checks `BookCache`, on miss live-scrapes all sites (5s timeout each, failures tolerated and reported) → persists cache → returns paginated JSON with a `cached` flag. Auth routes are served by better-auth at `/api/auth/*` (mounted before JSON body parsing in `src/app.ts`).