# EduPath

EduPath is a Next.js web app that helps students (especially in MENA) discover universities, compare options, understand costs, and move through parts of the application journey.

> **Note:** Stripe billing integration exists in the codebase but is intentionally kept **on standby for future activation** in regions where Stripe is not currently usable (including Jordan). Do not assume live payments are enabled.

## What this repo includes
This codebase has grown beyond the original MVP and includes, among other things:
- **University discovery & content**: directory/search/filtering, university detail pages, country pages, comparisons, scholarships, transfer pathways, visa-readiness content.
- **Student tools**: saved lists, applications tracker, essay review flow, scholarship matching, onboarding, profile/account pages.
- **AI agent ("Rihla")**: conversational intake/matching endpoints and UI.
- **Reviews & moderation**: review submission, admin moderation flows, scraped/university admin tooling.
- **Auth & user accounts**: Supabase-based authentication/session handling.
- **Family/sponsor/claims flows**: parent/family views/invites, university claim flow, sponsor-related pages and APIs.
- **Operational features**: analytics/events, email hooks, cron endpoints (secret-protected), health checks, SEO routes (`sitemap`, `robots`).
- **Payments scaffolding (standby)**: Stripe checkout/portal/webhook code and subscription models for future activation.

## Tech stack
- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **UI**: Tailwind CSS 4, shadcn/ui, Radix UI, Lucide icons
- **Data**: Prisma ORM
  - `prisma/schema.prisma` -> **SQLite** (active/local dev schema)
  - `prisma/schema.postgres.prisma` -> **PostgreSQL/Supabase** (production schema, synced to current domain model)
- **Auth**: Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **i18n/Theming**: `next-intl`, `next-themes`
- **Payments (standby)**: Stripe SDK + webhook/checkout routes (not enabled in all regions)
- **Email/Monitoring/Analytics (optional/integrations)**: Resend, Sentry, PostHog
- **Testing**: Vitest, Testing Library, Playwright

## Project structure (high level)
- `src/app/` - App Router pages/layouts and API route handlers (`src/app/api/**`)
- `src/components/edupath/` - feature/client components
- `src/components/ui/` - shadcn/ui primitives
- `src/lib/` - shared utilities (auth helpers, db, validation, csrf/rate-limit, stripe/email/analytics, agent logic, etc.)
- `src/data/` - bundled/static fallback data
- `prisma/` - Prisma schemas, migrations, seed scripts
- `scripts/` - maintenance/dev scripts (seeding, static data generation, admin promotion, etc.)
- `e2e/`, `tests/` - test suites/config support

## Getting started (local dev)

### Prerequisites
- Node.js 18+ (or Bun)
- A Supabase project (for auth flows)

### 1) Install dependencies
```bash
bun install
# or
npm install
```

### 2) Configure environment variables
```bash
cp .env.example .env
```
Fill in required values in `.env` (see `.env.example` for the full list). At minimum for local dev you will typically need:
- `DATABASE_URL` (SQLite local path, e.g. `file:./db/custom.db`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- server-side Supabase vars as required by your setup

Optional integrations (enable only if configured): Stripe, Resend, Sentry, PostHog, LLM provider keys, `CRON_SECRET`, etc.

### 3) Set up the database (SQLite local dev)
```bash
bun run db:push
bun run db:generate
# optional seed (if you want sample data)
bun run prisma/seed.ts
```

### 4) Run the app
```bash
bun run dev
```
App runs on `http://localhost:3000` by default.

## Database notes (SQLite vs PostgreSQL)
- **Local/dev (default):** use `prisma/schema.prisma` with `DATABASE_URL=file:./db/custom.db`
- **Production/Postgres:** use `prisma/schema.postgres.prisma` with a PostgreSQL `DATABASE_URL` (e.g. Supabase Postgres)

The Postgres schema is intended to mirror the current app domain model. Before production deployment, validate migrations and data compatibility in your environment (especially JSON-like string fields and any app-specific assumptions).

## Stripe (standby / future activation)
Stripe-related code and schema support are present (checkout, portal, webhook, subscription records), but Stripe is **intentionally not active** in regions where it is unavailable (including Jordan).

- Keep Stripe env vars unset unless you are explicitly preparing a supported-region deployment.
- Webhook endpoint includes signature verification and idempotency handling for future activation.
- Treat billing features as dormant/standby until regional/payment readiness is confirmed.

## Security & reliability notes
Implemented in parts of the codebase (coverage continues to improve):
- CSRF same-origin checks for browser-based state-changing requests (`src/lib/csrf.ts`)
- Zod-based request validation (`src/lib/validation.ts`)
- In-memory rate limiting helper (`src/lib/rate-limit.ts`) for abuse reduction (not distributed)
- Supabase server-side auth/session handling
- CSP and security headers in `next.config.ts`
- Cron endpoint auth via `CRON_SECRET` (fail-closed when missing)
- Stripe webhook signature verification + idempotency logging (standby-ready)

## Testing & checks
Common commands:
```bash
bun run lint
bunx tsc --noEmit
bun run test
# or: bunx vitest run
bun run test:e2e
```
(Exact setup may depend on installed dependencies and environment variables.)

## Useful scripts
- `bun run db:push` - push Prisma schema to DB
- `bun run db:generate` - generate Prisma client
- `bun run db:seed` - run seed script
- `bun run db:static` - generate static data artifacts
- `bun run scripts/promote-admin.ts <email>` - promote a user to admin (when DB/user exists)

## Current status / maintenance notes
- The app contains many product surfaces and is actively evolving; some docs/comments may lag behind features.
- API route hardening and schema parity should be reviewed continuously as new routes/features are added.
- For production, validate authz, billing/webhooks, migrations, and observability in a staging environment before rollout.
