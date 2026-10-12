# EduPath Baseline Audit

**Date:** 2026-10-13
**Auditor:** GLM (automated)
**Repository:** github.com/almizanpro-del/edupath
**Deployment:** https://edupath-amber-three.vercel.app

---

## 1. System Architecture

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 16.3.5 |
| Language | TypeScript | 5.x |
| UI | Tailwind CSS 4 + shadcn/ui (New York) | — |
| Database | Prisma ORM + SQLite (dev) / Postgres (prod) | Prisma 6.19 |
| Auth | Supabase Auth (email + Google OAuth) | — |
| AI | z-ai-web-dev-sdk + OpenAI + Grok (unified LLM client) | — |
| Email | Resend | — |
| Payments | Stripe | — |
| i18n | next-intl | — |
| Testing | Vitest (JS) + pytest (Python) | — |
| CI | GitHub Actions | — |
| Deployment | Vercel (standalone output) | — |

### Routes
- **Pages:** 14 (home, university detail, essay-review, scholarships, transfer-finder, pricing, sponsor, admin, admin/analytics, admin/scraped, agent, claim, auth/callback, sitemap)
- **API routes:** 20 (admin, agent, auth, claim, cron, essay-review, events, leads, me, reviews, saved-lists, scholarship-match, sponsor, stripe, subscription, transfer-pathways)
- **Components:** 21 edupath components + shadcn/ui library

### Database Models (14)
University, Program, Scholarship, User, Review, SavedList, TransferPathway, AnalyticsEvent, Lead, Subscription, ScrapedUniversity, IntakeSession, IntakeMessage, AgentMatch

---

## 2. Feature Inventory

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 1 | University discovery & search | **WORKING** | 129 universities, 14 countries, filter panel with country/field/language/tuition |
| 2 | University profile pages | **WORKING** | Hero, tabs (overview, programs, scholarships, cost calculator, reviews), contact dialog |
| 3 | Program-level discovery | **PARTIALLY_WORKING** | Programs shown on university pages but no standalone program search/filter |
| 4 | Country & subject filters | **WORKING** | Redesigned filter sheet with country search, chip pills, tuition presets |
| 5 | University comparison | **WORKING** | Up to 3 universities, comparison table with 12 metrics |
| 6 | Tuition & living-cost estimates | **PARTIALLY_WORKING** | All 129 universities have tuition + living cost data, but 60 share same $5000 default |
| 7 | Total-cost calculations | **PARTIALLY_WORKING** | Cost calculator on detail page: tuition + living × duration. No fees, visa, insurance, travel |
| 8 | Rihla AI advisor | **PARTIALLY_WORKING** | Intake conversation + match pipeline exist. LLM fails on Vercel (ZAI internal API unreachable). OpenAI/Grok fallback added but requires API keys |
| 9 | Student reviews | **WORKING** | 6-dimension ratings, moderation queue, verified-student badge (but no actual verification process) |
| 10 | Scholarships | **WORKING** | 147 scholarships across universities, AI-powered scholarship matcher |
| 11 | Application deadlines | **PARTIALLY_WORKING** | 272/379 programs have deadlines. Cron job for alerts exists but requires CRON_SECRET + RESEND_API_KEY |
| 12 | User accounts & saved lists | **WORKING** | Supabase auth, saved universities, compare list |
| 13 | Arabic & English | **PARTIALLY_WORKING** | 679 translation keys × 2 languages, RTL support, Tajawal font. 55/129 universities lack Arabic descriptions |
| 14 | Administrative data management | **WORKING** | CMS for universities, analytics dashboard, scraped university review queue |
| 15 | Privacy, security & accessibility | **PARTIALLY_WORKING** | CSRF, rate limiting, zod validation, security headers, CSP. 15 aria-labels. No privacy policy or terms of service pages |

---

## 3. Data Quality Findings

### Critical Issues

1. **No data provenance tracking.** Zero universities have source, verified, or lastUpdated fields. All data is presented as factual without evidence backing.

2. **Tuition data homogeneity.** 60 of 129 universities (47%) share the exact same tuition of $5,000/year. This is a seed-data default, not researched data. 8 more share $3,500 and 5 share $4,500.

3. **Program tuition = university tuition.** 147 of 379 programs (39%) have the same tuition as their parent university — suggesting program-level tuition was copied from the university default rather than researched individually.

4. **Missing Arabic descriptions.** 55 of 129 universities (43%) have no Arabic description.

5. **Missing program deadlines.** 107 of 379 programs (28%) have no application deadline.

6. **Missing entry requirements.** 373 of 379 programs (98%) have no entry requirements listed.

### Assessment
The university data is seed/demo quality. It's structurally correct (proper slugs, countries, cities, programs) but the financial and academic detail data is placeholder-level. This is the #1 issue to address for product credibility.

---

## 4. Security & Privacy Findings

### Working
- ✅ CSRF protection on 7 POST/PATCH/DELETE routes
- ✅ Rate limiting on 4 routes (leads, events, scholarship-match, agent intake)
- ✅ Zod schema validation on 7 routes
- ✅ Admin role checks on all admin API routes
- ✅ Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- ✅ Stripe webhook signature verification
- ✅ Open redirect fix on OAuth callback
- ✅ Cron secret required (fail-closed)
- ✅ JSON-LD XSS escaping
- ✅ Sponsor dashboard scoped by universityId for recruiters

### Issues
- ⚠️ Debug route still exists at `/api/agent/debug` (exposes env var status)
- ⚠️ `/api/leads` has no auth check (intentional — anonymous contact form — but no spam protection beyond rate limiting)
- ⚠️ No privacy policy or terms of service pages
- ⚠️ No data deletion/account deletion mechanism
- ⚠️ Review "verified student" badge displayed without actual verification process

---

## 5. Rihla AI Advisor Assessment

### Architecture
- **Intake:** Conversational chat via `/api/agent/intake` — collects 9 fields (nationality, education, field, countries, budget, language, degree, career goal, special requirements)
- **Matching:** `/api/agent/match` — 3-step pipeline: structured filter → heuristic scoring → LLM explanations
- **LLM:** Unified multi-provider client (`src/lib/llm.ts`) — tries ZAI sandbox → OpenAI → Grok → ZAI env

### Issues
1. **LLM fails on Vercel.** ZAI SDK uses `internal-api.z.ai` which is unreachable from Vercel. OpenAI/Grok fallback requires API keys not yet set.
2. **No deterministic eligibility checking.** Rihla doesn't check if a student meets program requirements before recommending.
3. **LLM can fabricate information.** No validation that LLM explanations only reference actual database records.
4. **No data grounding.** Rihla's recommendations aren't validated against the actual program database after generation.

---

## 6. Arabic & RTL Assessment

### Working
- ✅ 679 translation keys in both en.json and ar.json (perfect parity)
- ✅ RTL layout via `dir="rtl"` on `<html>`
- ✅ Tajawal Arabic font loaded
- ✅ All page metadata uses `generateMetadata()` with locale-aware translations
- ✅ Chat component uses `dir="auto"` on message bubbles
- ✅ Currency switcher, filter panel, all forms translated

### Issues
- ⚠️ 55 universities lack Arabic descriptions
- ⚠️ Program names, fields, and scholarship names are English-only (no Arabic translations in data)
- ⚠️ Some toast messages in university-detail-page use translation keys but the component is scoped to `Detail` namespace — needed separate `tToast` instance

---

## 7. Cost Calculator Assessment

### Current State
The cost calculator on university detail pages computes:
- Tuition × (duration months / 12)
- Living cost × (duration months / 12) — optional
- Total = sum

### Missing
- No mandatory fees (registration, student union, health insurance)
- No visa/residence permit costs
- No one-time costs (travel, initial setup, language tests)
- No currency conversion transparency (uses USD only despite multi-currency switcher existing)
- No scholarship deduction option
- No "unknown" state for missing data

---

## 8. Testing Assessment

### Current Coverage
- **JS tests:** 3 files, 45 tests (currency conversion, edupath utils, i18n parity)
- **Python tests:** 3 files, 61 tests (normalize, quality scoring, adapters)
- **No integration tests** (no API route tests, no database tests)
- **No E2E tests** (no Playwright/Cypress)
- **CI:** GitHub Actions runs `tsc + vitest + next build` on push

### Critical Gaps
- No tests for cost calculation logic
- No tests for LLM response parsing
- No tests for auth/authorization
- No tests for data validation schemas

---

## 9. Highest-Priority Corrective Actions

| Priority | Action | Phase |
|----------|--------|-------|
| **P0** | Remove debug route (`/api/agent/debug`) — exposes env var status | Immediate |
| **P0** | Add data provenance fields to University + Program schema | Phase 1 |
| **P0** | Mark all existing data as `UNVERIFIED` — don't present as factual | Phase 1 |
| **P0** | Add uncertainty labels to tuition display when data is unverified | Phase 1 |
| **P0** | Extend cost calculator with transparent component breakdown | Phase 2 |
| **P1** | Ground Rihla recommendations in actual DB records with validation | Phase 3 |
| **P1** | Add eligibility checking to Rihla (separate from LLM) | Phase 3 |
| **P1** | Add privacy policy + terms of service pages | Phase 4 |
| **P1** | Remove "verified student" badge until verification process exists | Phase 4 |
| **P1** | Translate remaining 55 Arabic descriptions | Phase 5 |
| **P2** | Add integration tests for API routes | Phase 8 |
| **P2** | Consolidate requireAdmin() into shared helper | Phase 6 |

---

## 10. External Dependencies & Authorization Requirements

| Dependency | Status | Action Needed |
|-----------|--------|---------------|
| Supabase (auth + DB) | Configured in env, may not be set on Vercel | Verify `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` on Vercel |
| OpenAI API | Env var documented, not yet set on Vercel | Set `OPENAI_API_KEY` for Rihla + essay review + scholarship match |
| Grok / xAI | Env var documented, not yet set on Vercel | Set `XAI_API_KEY` as fallback |
| Resend (email) | Env var documented, not yet set | Set `RESEND_API_KEY` + verify sending domain |
| Stripe | Env vars documented, not yet set | Set `STRIPE_SECRET_KEY` + price IDs for payments |
| Postgres (production DB) | Schema is SQLite, Postgres schema exists but not active | Set `DATABASE_URL` to Postgres connection string on Vercel |
| CRON_SECRET | Documented, may not be set | Set on Vercel for deadline alerts + FX refresh |

---

## 11. Proposed Implementation Sequence

1. **Immediate:** Remove debug route, mark data as unverified
2. **Phase 1:** Add provenance fields, uncertainty labels, data quality report
3. **Phase 2:** Extend cost calculator with transparent breakdown
4. **Phase 3:** Ground Rihla in DB records, add eligibility checking
5. **Phase 4:** Trust labels, privacy policy, remove false verification claims
6. **Phase 5:** Complete Arabic translations
7. **Phase 6:** Consolidate admin helpers
8. **Phase 7:** Verify all security findings are addressed
9. **Phase 8:** Add integration tests
