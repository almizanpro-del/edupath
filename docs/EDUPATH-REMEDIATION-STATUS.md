# EduPath Remediation Status

**Last updated:** 2026-10-23
**Current phase:** Production Blocker Remediation Sprint

---

## Production Blocker Sprint (2026-10-23 update)

### WS1 — Misleading Financial Data (P0) — FIXED_AND_VERIFIED
- [x] Created `src/lib/financial.ts` with `evaluateTuition()`, `calculateTotalCost()`, `auditUniversityData()`
- [x] Known seed defaults ($5000, $3500, etc.) flagged as "Estimated"
- [x] Missing tuition returns null (not $0) — UI shows "Unknown"
- [x] Cost calculator uses `calculateTotalCost()` — returns null for missing data
- [x] Rihla matcher reduces weight on unverified tuition (40→25 pts)
- [x] LLM explanation prompt discloses "UNVERIFIED"
- [x] 20 financial tests added
- [x] Rihla scoring weight reduction covered by automated test (rihla.test.ts)
- [ ] Verify actual tuition data against official sources
- [ ] Set verifiedStatus + sourceUrl for each university

### WS2 — Review/Verification Claims (P0) — FIXED_AND_VERIFIED
- [x] "Verified Student" badge → "Student Reviewer" (EN + AR)
- [x] Badge color changed from blue to neutral slate
- [x] Footer: "RTL coming" → "RTL"
- [x] Footer: "Verified Reviews" → "Student Reviews"
- [x] Footer disclaimer updated (removed verification claims)
- [x] E2E test asserts no "Verified Reviews" / "Verified Student" in footer
- [ ] Implement actual student enrollment verification

### WS3 — Rihla in Production (P0) — PARTIALLY_FIXED
- [x] Graceful degradation: llmFailed shows helpful fallback message
- [x] Rihla scoring adjusted for unverified data
- [x] LLM prompt discloses unverified tuition
- [x] 24 Rihla pipeline tests added (rihla.test.ts) — covers parseIntakeComplete, isIntakeComplete, buildMessages, findMatches, scoring weights, LLM fallback
- [ ] Set OPENAI_API_KEY or XAI_API_KEY on Vercel (EXTERNAL DEPENDENCY)
- [ ] Add eligibility classification
- [ ] Add LLM output validation

### WS4 — GitHub Actions CI (P0) — FIXED_AND_DEPLOYED
- [x] Fixed YAML syntax: `branches: ain]` → `branches: [main]`
- [x] Replaced bun with npm throughout
- [x] Added Python tests to CI
- [x] Added Playwright E2E step to CI with browser install + artifact upload
- [ ] Verify CI runs successfully on GitHub Actions (next push will trigger)

### WS5 — Cost Calculator (P1) — PARTIALLY_FIXED
- [x] Shows "Unknown" instead of $0 for missing tuition
- [x] Shows warning when total can't be calculated
- [ ] Add mandatory fees, visa, insurance, travel, setup costs
- [ ] Distinguish one-time vs recurring costs
- [ ] Extract into reusable testable module
- [ ] Add currency conversion transparency

### WS6 — Integration Tests (P1) — FIXED_AND_VERIFIED
- [x] 20 financial tests added (total: 144 JS + 61 Python)
- [x] 30 API integration tests added (src/app/api/integration.test.ts) — covers /api/health, /api/leads, /api/agent/intake, /api/reviews (GET/PATCH/POST)
- [x] 15 auth/authorization tests added (src/lib/auth-helpers.test.ts) — covers requireAdmin, requireRecruiterOrAdmin, getOrCreateProfile
- [x] 24 Rihla pipeline tests added (src/lib/agent/rihla.test.ts) — covers intake parsing, message building, matching/scoring, LLM fallback
- [x] 12 Playwright E2E tests added (e2e/smoke.spec.ts) — covers home page, navigation, auth modal, /api/health, footer claims

### WS7 — Deployment (—) — Code pushed, UNVERIFIED
- [x] Code committed and pushed (`e54b7d9`)
- [ ] Verify Vercel build succeeded
- [ ] Test affected live user journeys
- [ ] Confirm no regressions

### WS8 — Health Check & Security (NEW, 2026-10-23) — FIXED_AND_VERIFIED
- [x] Added `GET /api/health` route with subsystem checks (database, LLM, Supabase, Stripe)
- [x] Health route does not leak environment variable values
- [x] Removed leftover `/api/agent/debug` route (security risk — leaked env var presence and tested arbitrary LLM endpoints)
- [x] npm audit: 35 vulnerabilities → 5 (all 5 are dev-only eslint tooling via `braces` advisory, no upstream fix available)
- [x] Upgraded `next` to 16.4.2 (fixes critical RCE in next/og ImageResponse)
- [x] Upgraded `sharp` to 0.35.5 (fixes libvips/libheif/librsvg CVEs)
- [x] Upgraded `react-syntax-highlighter` to 16.1.2 (fixes PrismJS DOM clobbering)
- [x] Upgraded `eslint-config-next` to 16.4.2 (fixes @next/eslint-plugin-next chain)
- [x] Upgraded `@mdxeditor/editor` to 4.3.3 (fixes js-yaml DoS)
- [x] Upgraded `vitest` to 5.0.5 (fixes @vitest/mocker code injection)

---

## Previous Phases

### Phase 0 — Baseline Audit — COMPLETED
- [x] docs/audit/EDUPATH-BASELINE-AUDIT.md
- [x] docs/audit/EDUPATH-IMPLEMENTATION-CHANGE-REPORT.md

### Phase 1 — Data Provenance — PARTIALLY_FIXED
- [x] Schema fields added (verifiedStatus, sourceUrl, lastVerifiedAt, dataQualityScore)
- [x] "Unverified Data" badge on university detail page
- [x] Financial data utilities (evaluateTuition, calculateTotalCost, auditUniversityData)
- [ ] Verify data against official sources
- [ ] Populate dataQualityScore for all records

### Phase 2 — Affordability Engine — PARTIALLY_FIXED
- [x] Cost calculator shows "Unknown" for missing data
- [x] Unverified data warning
- [ ] Full component breakdown (fees, visa, insurance, travel, setup)
- [ ] Reusable calculation module
- [ ] Budget feasibility analysis

### Phase 3 — Rihla AI — PARTIALLY_FIXED
- [x] Intake + match + results architecture
- [x] Unified LLM client (ZAI → OpenAI → Grok)
- [x] Graceful degradation for LLM failures
- [x] Scoring adjusted for unverified data
- [x] Rihla pipeline tests (24 tests)
- [ ] LLM working on Vercel (requires API key)
- [ ] Eligibility classification
- [ ] LLM output validation

### Phase 4 — Reviews & Trust — PARTIALLY_FIXED
- [x] "Verified Student" badge relabeled
- [x] Footer claims corrected
- [x] Footer claims covered by E2E test
- [ ] Privacy policy page
- [ ] Terms of service page
- [ ] Account deletion mechanism

### Phase 5 — Arabic & RTL — PARTIALLY_FIXED
- [x] 784 translation keys × 2 languages
- [x] RTL layout works
- [x] Footer text corrected
- [ ] Translate 55 missing Arabic descriptions
- [ ] Translate program/scholarship names in data

### Phase 6 — Administration — PARTIALLY_FIXED
- [x] Shared auth-helpers.ts created
- [x] auth-helpers covered by 15 automated tests
- [ ] Wire shared helper into all 4 admin routes
- [ ] Add audit logging
- [ ] Add program-level editing

### Phase 7 — Security — MOSTLY_FIXED
- [x] CSRF, rate limiting, zod validation, security headers
- [x] Debug route removed (and verified removed in WS8)
- [x] /api/health route added (no env var leakage)
- [ ] Privacy policy
- [ ] Account deletion
- [ ] Distributed rate limiting (Upstash Redis)

### Phase 8 — Testing — FIXED_AND_VERIFIED
- [x] 144 JS tests + 61 Python tests (was 75 JS + 61 Python)
- [x] Financial data tests (missing, stale, estimated, verified)
- [x] API integration tests (30 tests in src/app/api/integration.test.ts)
- [x] Auth/authorization tests (15 tests in src/lib/auth-helpers.test.ts)
- [x] Rihla pipeline tests (24 tests in src/lib/agent/rihla.test.ts)
- [x] E2E tests (12 Playwright tests in e2e/smoke.spec.ts)
