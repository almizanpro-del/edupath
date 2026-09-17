# EduPath

> Your path to affordable global education. Built for MENA students.

EduPath is a university discovery, comparison, and review platform that helps Arabic-speaking students find affordable universities worldwide. This repo contains the Phase 1 MVP — a Next.js 16 single-page app with Supabase auth, Prisma + SQLite, and Tailwind CSS + shadcn/ui.

## Features (Phase 1 MVP)

- **University directory** — 22 seeded universities across 10 countries (UK, Germany, Turkey, Poland, Lithuania, Malaysia, Egypt, Jordan, UAE, Lebanon)
- **Search & filters** — by country, field of study, language of instruction, tuition range
- **University detail view** — 5 tabs: Overview (English + Arabic), Programs, Scholarships, Cost Calculator, Reviews
- **Cost calculator** — interactive slider for program duration, toggle living expenses, total cost in USD
- **Side-by-side comparison** — up to 3 universities, 12 metrics in a sticky-header table
- **Verified reviews** — 6-dimension ratings (overall, affordability, teaching, visa, safety, social) with tags
- **Supabase auth** — email/password sign up & sign in
- **Saved lists** — bookmark universities, persisted to your account
- **Review submission** — write and publish reviews (auto-approved in MVP, admin moderation queue in production)
- **Mobile-responsive** with sticky footer

## Tech Stack

- **Framework**: Next.js 16 (App Router, React Server Components)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui (New York)
- **Database**: Prisma ORM + SQLite (dev); Supabase Postgres (production)
- **Auth**: Supabase Auth (email/password, with optional Google OAuth)
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ (or Bun)
- A Supabase project (free tier works) — get one at [supabase.com](https://supabase.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/almizanpro-del/edupath.git
cd edupath

# Install dependencies
bun install   # or: npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase project URL, anon key, and secret key

# Set up the database
bun run db:push      # creates SQLite DB + Prisma client
bun run prisma/seed.ts  # seeds 22 universities, programs, scholarships, reviews

# Start the dev server
bun run dev          # opens at http://localhost:3000
```

### Environment Variables

See [`.env.example`](./.env.example) for the full list. Required:

| Variable | Description | Where to get it |
|---|---|---|
| `DATABASE_URL` | SQLite connection string | Local file path |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable anon key | Same as above |
| `SUPABASE_SECRET_KEY` | Supabase secret key (server-only) | Same as above |

⚠️ **Never commit `.env`** — it's in `.gitignore`. The `.env.example` file is a template with placeholders.

## Project Structure

```
edupath/
├── prisma/
│   ├── schema.prisma          # 6-model Prisma schema
│   └── seed.ts                # Seeds 22 universities + programs + scholarships + reviews
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── me/             # GET current user profile
│   │   │   ├── saved-lists/    # GET + POST saved universities
│   │   │   └── reviews/        # GET + POST reviews
│   │   ├── layout.tsx          # Root layout with metadata
│   │   └── page.tsx            # Home page (RSC, fetches universities)
│   ├── components/
│   │   ├── edupath/
│   │   │   ├── edupath-app.tsx # Main client component (hero, filters, directory, detail, compare)
│   │   │   ├── auth-modal.tsx  # Sign in / sign up modal
│   │   │   └── review-form.tsx # Review submission form
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── db.ts               # Prisma client singleton
│   │   ├── edupath.ts          # Shared types, formatters, country list
│   │   └── supabase/
│   │       ├── client.ts       # Browser Supabase client
│   │       ├── server.ts       # Server Supabase client
│   │       └── middleware.ts   # Session refresh
│   └── middleware.ts           # Next.js middleware (calls Supabase updateSession)
└── .env.example                # Environment variable template
```

## Development

```bash
bun run dev          # Start dev server at localhost:3000
bun run lint         # Run ESLint
bun run db:push      # Push schema changes to DB
bun run db:generate  # Regenerate Prisma client
```

## Roadmap

This MVP covers Phase 1 of the EduPath development plan. Future phases:

- **Phase 1.x** — Full Arabic RTL UI (next-intl), admin moderation queue, on-demand ISR
- **Phase 2** — AI essay review (GPT-4o-mini), transfer pathway finder, financial aid matcher, Stripe billing + sponsor dashboard
- **Phase 3** — Visa guides, alumni network, job board, post-grad outcome tracking

See `EduPath_Development_Plan_v1.1.pdf` for the full technical blueprint (14 chapters, 35 pages, includes risk register, 12-week sprint plan, and engineering deep-dives on scraping, verification, AI prompts, and monetization).

## Authentication

EduPath uses Supabase Auth with two sign-in methods:

### Email/Password
Works out of the box. By default, Supabase requires email confirmation — for dev/demo, you can disable this in:
> Supabase Dashboard → Authentication → Sign In / Providers → Email → turn OFF "Confirm email"

### Google OAuth (optional)
To enable Google sign-in:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project (or use existing)
2. APIs & Services → Credentials → Create OAuth client ID → Web application
3. Add authorized redirect URI: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret
5. Supabase Dashboard → Authentication → Providers → Google → toggle ON → paste Client ID + Secret
6. The "Continue with Google" button in the auth modal will now work

## Admin Moderation

New reviews go to a `pending` state and appear in the admin moderation queue. To access the queue:

1. Sign in with any account
2. Promote yourself to admin:
   ```bash
   bun run scripts/promote-admin.ts your@email.com
   ```
3. Refresh the page — an "Admin" button will appear in the header
4. Click it to open the moderation panel where you can approve or reject pending reviews

## Database Migration: SQLite → Supabase Postgres

The dev environment uses SQLite (zero-config). For production, migrate to Supabase Postgres:

1. Get your Postgres connection string from Supabase Dashboard → Settings → Database → Connection string → URI
2. Update `.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
   ```
3. Replace the Prisma schema:
   ```bash
   cp prisma/schema.postgres.prisma prisma/schema.prisma
   ```
4. Push the schema to Postgres:
   ```bash
   bun run db:push --accept-data-loss
   ```
5. Re-seed:
   ```bash
   bun run prisma/seed.ts
   ```
6. Promote yourself to admin again (the User table is fresh):
   ```bash
   bun run scripts/promote-admin.ts your@email.com
   ```

The Postgres schema uses native `Json` type for the `tags` and `universities` fields (SQLite used `String`). The application code (`JSON.parse`/`JSON.stringify`) works with both — no code changes needed.

## License

MIT
