# EduPath Remediation Status

**Last updated:** 2026-10-13
**Current phase:** Production Blocker Remediation Sprint

---

## Production Blocker Sprint (2026-10-13)

### WS1 — Misleading Financial Data (P0) — FIXED_AND_VERIFIED
- [x] Created `src/lib/financial.ts` with `evaluateTuition()`, `calculateTotalCost()`, `auditUniversityData()`
- [x] Known seed defaults ($5000, $3500, etc.) flagged as "Estimated"
- [x] Missing tuition returns null (not $0) — UI shows "Unknown"
- [x] Cost calculator uses `calculateTotalCost()` — returns null for missing data
- [x] Rihla matcher reduces weight on unverified tuition (40→25 pts)
- [x] LLM explanation prompt discloses "UNVERIFIED"
- [x] 20 financial tests added
- [ ] Verify actual tuition data against official sources
- [ ] Set verifiedStatus + sourceUrl for each university

### WS2 — Review/Verification Claims (P0) — FIXED_AND_VERIFIED
- [x] "Verified Student" badge → "Student Reviewer" (EN + AR)
- [x] Badge color changed from blue to neutral slate
- [x] Footer: "RTL coming" → "RTL"
- [x] Footer: "Verified Reviews" → "Student Reviews"
- [x] Footer disclaimer updated (removed verification claims)
- [ ] Implement actual student enrollment verification

### WS3 — Rihla in Production (P0) — PARTIALLY_FIXED
- [x] Graceful degradation: llmFailed shows helpful fallback message
- [x] Rihla scoring adjusted for unverified data
- [x] LLM prompt discloses unverified tuition
- [ ] Set OPENAI_API_KEY or XAI_API_KEY on Vercel (EXTERNAL DEPENDENCY)
- [ ] Add eligibility classification
- [ ] Add LLM output validation
- [ ] Add Rihla integration tests

### WS4 — GitHub Actions CI (P0) — FIXED_NOT_DEPLOYED
- [x] Fixed YAML syntax: `branches: ain]` → `branches: [main]`
- [x] Replaced bun with npm throughout
- [x] Added Python tests to CI
- [ ] Verify CI runs successfully on GitHub Actions

### WS5 — Cost Calculator (P1) — PARTIALLY_FIXED
- [x] Shows "Unknown" instead of $0 for missing tuition
- [x] Shows warning when total can't be calculated
- [ ] Add mandatory fees, visa, insurance, travel, setup costs
- [ ] Distinguish one-time vs recurring costs
- [ ] Extract into reusable testable module
- [ ] Add currency conversion transparency

### WS6 — Integration Tests (P1) — PARTIALLY_FIXED
- [x] 20 financial tests added (total: 75 JS + 61 Python)
- [ ] API route integration tests
- [ ] E2E tests (Playwright)
- [ ] Auth/authorization tests
- [ ] Rihla pipeline tests

### WS7 — Deployment (—) — Code pushed, UNVERIFIED
- [x] Code committed and pushed (`e54b7d9`)
- [ ] Verify Vercel build succeeded
- [ ] Test affected live user journeys
- [ ] Confirm no regressions

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
- [ ] LLM working on Vercel (requires API key)
- [ ] Eligibility classification
- [ ] LLM output validation

### Phase 4 — Reviews & Trust — PARTIALLY_FIXED
- [x] "Verified Student" badge relabeled
- [x] Footer claims corrected
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
- [ ] Wire shared helper into all 4 admin routes
- [ ] Add audit logging
- [ ] Add program-level editing

### Phase 7 — Security — MOSTLY_FIXED
- [x] CSRF, rate limiting, zod validation, security headers
- [x] Debug route removed
- [ ] Privacy policy
- [ ] Account deletion
- [ ] Distributed rate limiting (Upstash Redis)

### Phase 8 — Testing — PARTIALLY_FIXED
- [x] 75 JS tests + 61 Python tests
- [x] Financial data tests (missing, stale, estimated, verified)
- [ ] Integration tests
- [ ] E2E tests
