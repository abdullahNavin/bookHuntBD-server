**Book Comparison API**

Backend Product Requirements Document

Revised & Improved Edition

March 2026

  ----------------------- -----------------------------------------------
  **Version**             2.0 (Revised)

  **Target Scale**        Small startup --- hundreds of users

  **Alert Channel**       Email (Resend / Postmark)

  **Scraping Policy**     Polite --- rate-limited with jitter
  ----------------------- -----------------------------------------------

**Table of Contents**

**1. Objective**

Build a scalable backend system for comparing book prices across
Bangladeshi e-commerce sites. The platform aggregates book data from
multiple sources, supports user accounts, wishlists, and email price
alerts, and uses a hybrid scraping strategy --- real-time on cache miss,
cached on hit --- to balance freshness against politeness to source
sites.

  ----------- -------------------------------------------------------------
  **Scope**   This PRD covers the backend API only. Frontend clients (web,
              mobile) are out of scope and will consume this API.

  ----------- -------------------------------------------------------------

**2. Tech Stack**

  ------------------ ----------------------------------------------------
  **Layer**          **Technology**

  Runtime            Node.js + Express

  Language           TypeScript

  Database           PostgreSQL

  ORM                Prisma

  Cache & Queue      Redis
  store              

  Queue system       BullMQ

  Authentication     Better Auth

  Email delivery     Resend (or Postmark)

  Config validation  Zod (process.env parsing at startup)
  ------------------ ----------------------------------------------------

**3. Architecture Pattern**

The system uses a layered architecture where each layer has a single
responsibility and dependencies only flow downward.

  -----------------------------------------------------------------------
  Client

  │

  Rate Limiter (Redis token bucket)

  │

  Controller Layer ← HTTP, input validation

  │

  Service Layer ← Business logic

  │ └── Scraper Layer (on cache miss)

  Repository Layer ← DB access via Prisma

  │

  Database (PostgreSQL) ←→ Redis (cache + queues)
  -----------------------------------------------------------------------

BullMQ workers run independently and are not part of the request
lifecycle. They handle scraping jobs and price alert checks on a
scheduled basis.

**4. Core Modules**

**4.1 Auth Module**

Handles registration, login, session management, and OAuth via Better
Auth.

-   Register with email + password

-   Login returning a JWT / session token

-   Google OAuth (via Better Auth built-in provider)

-   GET /auth/me --- returns current user from token

  ---------- -------------------------------------------------------------
  **Note**   Passwords are never stored in plain text. Better Auth handles
             hashing via bcrypt. The password field on the User model is
             nullable to support OAuth-only users.

  ---------- -------------------------------------------------------------

**4.2 User Module**

Manages user profile and preferences. Kept minimal at this scale ---
extend as needed.

-   GET / PATCH /users/me --- read and update profile

-   Preferences: language, default sort order for search results

**4.3 Book Search Module**

The core feature. Accepts a search query, checks the cache, and either
returns cached results or triggers live scraping across all configured
sites.

**Search flow**

  -----------------------------------------------------------------------
  GET /books/search?query=\...&page=1&limit=10

  1\. Validate query (Zod schema --- reject empty / too-long strings)

  2\. Check BookCache: WHERE query = ? AND site = ? AND expiresAt \>
  NOW()

  3\. If fresh results exist → return paginated slice

  4\. Else → run scraper layer (Promise.allSettled, 5s timeout each)

  5\. Save successful results to BookCache with expiresAt = NOW() + 24h

  6\. Return unified response with failed: string\[\] for any scraper
  errors
  -----------------------------------------------------------------------

**Response shape**

  -----------------------------------------------------------------------
  {

  \"results\": BookResult\[\],

  \"cached\": boolean,

  \"failed\": string\[\], // e.g. \[\"eboighar\", \"baatighar\"\]

  \"page\": number,

  \"total\": number

  }
  -----------------------------------------------------------------------

**4.4 Scraper Module**

Each site is implemented as an independent service conforming to a
shared interface. This makes it easy to add, remove, or disable
individual scrapers without touching the rest of the system.

**Directory structure**

  -----------------------------------------------------------------------
  src/scrapers/

  base.scraper.ts ← shared interface + timeout wrapper

  bookshoper.service.ts

  dheebooks.service.ts

  boibazar.service.ts

  harekrokom.service.ts

  eboighar.service.ts

  baatighar.service.ts

  index.ts ← exports all scrapers as an array
  -----------------------------------------------------------------------

**Scraper interface**

  -----------------------------------------------------------------------
  interface Scraper {

  readonly site: string;

  search(query: string): Promise\<BookResult\[\]\>;

  }

  interface BookResult {

  title: string;

  author?: string;

  publisher?: string;

  price: number;

  oldPrice?: number;

  discount?: number;

  image?: string;

  link: string;

  site: string;

  }
  -----------------------------------------------------------------------

**Politeness policy**

All scrapers must respect the following constraints to avoid IP bans and
excessive load on source sites.

-   Per-request timeout: 5 seconds via AbortController

-   Rate limiting: token-bucket per domain stored in Redis (max 10
    req/min per site)

-   Jitter: random 200--800ms delay before each request to avoid
    thundering-herd

-   Result limit: maximum 10 results per scraper per search

-   User-Agent: set a descriptive, honest User-Agent string

**Resilience**

  -----------------------------------------------------------------------
  // Use Promise.allSettled --- never Promise.all

  const settled = await Promise.allSettled(

  scrapers.map(s =\> withTimeout(s.search(query), 5000))

  );

  const results = settled

  .filter(r =\> r.status === \'fulfilled\')

  .flatMap(r =\> r.value);

  const failed = settled

  .filter(r =\> r.status === \'rejected\')

  .map((\_, i) =\> scrapers\[i\].site);
  -----------------------------------------------------------------------

**4.5 Cache Module**

Results are persisted in PostgreSQL (BookCache table) as the primary
cache. Redis is used for the token-bucket rate limiter and BullMQ\'s
queue store. An optional Redis string cache can be added later for
sub-millisecond repeated queries.

**TTL strategy**

  --------------- --------------------- ----------------------------------
  **Data type**   **TTL**               **Rationale**

  Search results  24 hours              Prices change daily at most

  Rate-limit      60 seconds            Per-domain request window
  bucket                                

  BullMQ jobs     Managed by BullMQ     Configurable per queue
  --------------- --------------------- ----------------------------------

**4.6 Wishlist Module**

Allows authenticated users to save books for later reference. Stores
enough data to render the wishlist without re-scraping.

-   POST /wishlist --- add a book (title, link, image, price, site)

-   GET /wishlist --- return current user\'s wishlist

-   DELETE /wishlist/:id --- remove an entry

**4.7 Price Alert Module**

Users set a target price for a specific book. A BullMQ cron worker
re-scrapes the book\'s site every 6 hours, compares the current price
against the target, and sends an email notification when the threshold
is met.

**Alert lifecycle**

  -----------------------------------------------------------------------
  1\. User creates alert: POST /alerts

  { title, link, site, targetPrice }

  2\. BullMQ repeatable job runs every 6 hours:

  a\. Fetch active alerts (isActive = true, notifiedAt IS NULL)

  b\. Re-scrape each alert\'s link via the appropriate scraper

  c\. If currentPrice \<= targetPrice:

  → Send email via Resend

  → Set notifiedAt = NOW()

  → Optionally set isActive = false (one-shot) or keep active

  3\. Failed scrape jobs go to dead-letter queue --- logged, not lost
  -----------------------------------------------------------------------

  ------------ -------------------------------------------------------------
  **Email      Use Resend (resend.com) or Postmark at this scale. Both offer
  provider**   generous free tiers and reliable deliverability. Add the API
               key to .env and validate it with Zod on startup.

  ------------ -------------------------------------------------------------

**4.8 Queue System (BullMQ)**

BullMQ manages background work. Two queues are defined at launch.

  ------------------ ----------------------------------------------------
  **Queue**          **Purpose**

  scrape-queue       On-demand scraping jobs triggered by cache misses
                     (future: offload from request lifecycle)

  alert-queue        Repeatable cron job (every 6h) that checks all
                     active price alerts
  ------------------ ----------------------------------------------------

**Dead-letter queue**

Both queues should define a failed job handler that moves jobs exceeding
their retry limit (e.g. 3 attempts) to a dead-letter queue. Failed jobs
are logged with their error reason and can be inspected or retried
manually.

  -----------------------------------------------------------------------
  new Queue(\'alert-queue\', {

  defaultJobOptions: {

  attempts: 3,

  backoff: { type: \'exponential\', delay: 2000 },

  }

  });
  -----------------------------------------------------------------------

**5. Database Design (Prisma)**

All models use UUID primary keys. Indexes are defined explicitly on
columns used in frequent WHERE clauses.

**5.1 User**

  -----------------------------------------------------------------------
  model User {

  id String \@id \@default(uuid())

  email String \@unique

  password String? // nullable for OAuth-only users

  createdAt DateTime \@default(now())

  wishlist Wishlist\[\]

  alerts PriceAlert\[\]

  }
  -----------------------------------------------------------------------

**5.2 BookCache**

The expiresAt field is the key addition from v1. Indexed alongside query
and site for efficient cache lookups. Without this index, every cache
check becomes a full table scan.

  -----------------------------------------------------------------------
  model BookCache {

  id String \@id \@default(uuid())

  query String

  site String

  title String

  author String?

  publisher String?

  price Float

  oldPrice Float?

  discount Float?

  image String?

  link String

  expiresAt DateTime // NEW --- TTL field

  createdAt DateTime \@default(now())

  @@index(\[query, site\]) // cache lookup

  @@index(\[expiresAt\]) // stale-entry cleanup

  }
  -----------------------------------------------------------------------

**5.3 Wishlist**

Stores enough fields to render the wishlist page without a re-scrape.

  -----------------------------------------------------------------------
  model Wishlist {

  id String \@id \@default(uuid())

  userId String

  title String

  link String

  image String? // NEW

  price Float? // NEW --- snapshot at time of save

  site String? // NEW

  createdAt DateTime \@default(now())

  user User \@relation(fields: \[userId\], references: \[id\])

  }
  -----------------------------------------------------------------------

**5.4 PriceAlert**

The key additions from v1 are: notifiedAt (prevents duplicate sends),
site (tells the worker which scraper to use), isActive (allows
deactivating after notification), and createdAt.

  -----------------------------------------------------------------------
  model PriceAlert {

  id String \@id \@default(uuid())

  userId String

  title String

  targetPrice Float

  link String

  site String // NEW --- which scraper to use

  notifiedAt DateTime? // NEW --- null = not yet notified

  isActive Boolean \@default(true) // NEW

  createdAt DateTime \@default(now()) // NEW

  user User \@relation(fields: \[userId\], references: \[id\])

  @@index(\[isActive, notifiedAt\]) // worker query index

  }
  -----------------------------------------------------------------------

**6. API Endpoints**

**6.1 Auth**

  --------------- --------------------- ----------------------------------
  **Method**      **Endpoint**          **Description**

  POST            /auth/register        Register with email + password

  POST            /auth/login           Login, returns session token

  GET             /auth/me              Get current user (requires auth)

  POST            /auth/logout          Invalidate session
  --------------- --------------------- ----------------------------------

**6.2 Books**

  --------------- ----------------------------------- ----------------------------------
  **Method**      **Endpoint**                        **Description**

  GET             /books/search?query=&page=&limit=   Search books across all scrapers
  --------------- ----------------------------------- ----------------------------------

  --------- -------------------------------------------------------------
  **Rate    GET /books/search is rate-limited to 10 requests/minute per
  limit**   IP using a Redis token bucket. Exceeding returns HTTP 429
            with a Retry-After header.

  --------- -------------------------------------------------------------

**6.3 Wishlist**

  --------------- --------------------- ----------------------------------
  **Method**      **Endpoint**          **Description**

  POST            /wishlist             Add book to wishlist

  GET             /wishlist             List current user\'s wishlist

  DELETE          /wishlist/:id         Remove a wishlist entry
  --------------- --------------------- ----------------------------------

**6.4 Price Alerts**

  --------------- --------------------- ----------------------------------
  **Method**      **Endpoint**          **Description**

  POST            /alerts               Create a price alert

  GET             /alerts               List current user\'s alerts

  PATCH           /alerts/:id           Update target price or deactivate

  DELETE          /alerts/:id           Delete an alert
  --------------- --------------------- ----------------------------------

**7. Search Flow (Detailed)**

  -----------------------------------------------------------------------
  Client → GET /books/search?query=humayun ahmed

  Step 1: Rate limit check

  → Redis token bucket for client IP

  → 429 if exceeded

  Step 2: Input validation (Zod)

  → query: non-empty string, max 200 chars

  → page: positive integer, default 1

  → limit: 1--50, default 10

  Step 3: Cache lookup

  SELECT \* FROM BookCache

  WHERE query = ? AND expiresAt \> NOW()

  → If rows found: return paginated slice { cached: true }

  Step 4: Live scrape (cache miss)

  → Promise.allSettled over all scrapers

  → 5s AbortController timeout per scraper

  → Jitter 200--800ms delay before each request

  Step 5: Persist

  → INSERT successful results into BookCache

  → Set expiresAt = NOW() + INTERVAL \'24 hours\'

  Step 6: Respond

  → { results, cached: false, failed: \[\...\], page, total }
  -----------------------------------------------------------------------

**8. Performance Strategy**

At small startup scale (hundreds of users), the priority is simplicity
and correctness over premature optimization. The following strategies
are sufficient for launch.

  ------------------ ----------------------------------------------------
  **Strategy**       **Detail**

  DB-backed cache    BookCache with expiresAt index --- no Redis cache
                     layer needed at this scale

  Parallel scraping  Promise.allSettled runs all scrapers concurrently

  Timeout per        5s AbortController prevents one slow site from
  scraper            blocking the response

  Result cap         Max 10 results per scraper (60 max total) keeps
                     payloads small

  Pagination         All list endpoints support page + limit to avoid
                     large responses

  Rate limiting      Protects both source sites (per-domain) and the API
                     itself (per-IP)

  Index strategy     BookCache indexed on (query, site) and expiresAt;
                     PriceAlert on (isActive, notifiedAt)

  Stale entry        Nightly BullMQ job: DELETE FROM BookCache WHERE
  cleanup            expiresAt \< NOW()
  ------------------ ----------------------------------------------------

**9. Configuration & Environment**

All configuration is loaded from environment variables and validated at
startup with Zod. A misconfigured environment fails loudly on boot
rather than silently at runtime.

  -----------------------------------------------------------------------
  // src/config.ts

  import { z } from \'zod\';

  const envSchema = z.object({

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  JWT_SECRET: z.string().min(32),

  RESEND_API_KEY: z.string().startsWith(\'re\_\'),

  ALERT_FROM_EMAIL: z.string().email(),

  NODE_ENV: z.enum(\[\'development\', \'production\', \'test\'\]),

  PORT: z.coerce.number().default(3000),

  });

  export const config = envSchema.parse(process.env);
  -----------------------------------------------------------------------

**10. Security Checklist**

-   All routes except /auth/\* require a valid JWT / session --- enforce
    at middleware level

-   Input validation on every endpoint via Zod --- never trust raw
    req.body

-   Rate limiting on /books/search and /auth/register to prevent abuse

-   Parameterised queries via Prisma --- no raw SQL string interpolation

-   Passwords hashed by Better Auth (bcrypt) --- never stored plain

-   RESEND_API_KEY and JWT_SECRET loaded from env, never committed to
    source control

-   HTTP security headers via helmet middleware
    (Content-Security-Policy, X-Frame-Options, etc.)

-   CORS configured to allowlist known frontend origins only

**11. Open Questions & Future Considerations**

  ------------------ ----------------------------------------------------
  **Topic**          **Notes**

  Re-alert behaviour After notifying, should the alert deactivate
                     (one-shot) or keep monitoring? Define UX before
                     implementing.

  Scraper            Sites change their HTML frequently. Consider a
  maintenance        lightweight test suite that validates each scraper
                     returns results for a known book title.

  Redis cache layer  At current scale, PostgreSQL cache is sufficient.
                     Add Redis string cache when P99 latency on cache
                     hits exceeds 100ms.

  Search ranking     Results are currently unordered within a page.
                     Consider sorting by price ascending as the default.

  Admin panel        No admin tooling defined. At minimum, add a BullMQ
                     dashboard (bull-board) behind basic auth for
                     monitoring queue health.

  Multi-currency     All prices assumed in BDT (Bangladeshi Taka). Add a
                     currency field to BookCache if expanding
                     internationally.
  ------------------ ----------------------------------------------------

Book Comparison API --- Backend PRD v2.0 --- March 2026
