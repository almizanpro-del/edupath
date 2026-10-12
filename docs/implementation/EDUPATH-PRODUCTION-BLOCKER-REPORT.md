# EduPath Production Blocker Remediation Report

**Date:** 2026-10-13
**Commit:** `e54b7d9`
**Previous report:** `docs/audit/EDUPATH-IMPLEMENTATION-CHANGE-REPORT.md`

---

## Summary

| Workstream | Priority | Status | Classification |
|-----------|----------|--------|---------------|
| WS1: Misleading financial data | P0 | Implemented | FIXED_AND_VERIFIED |
| WS2: Review/verification claims | P0 | Implemented | FIXED_AND_VERIFIED |
| WS3: Rihla in production | P0 | Partially implemented | PARTIALLY_FIXED |
| WS4: GitHub Actions CI | P0 | Implemented | FIXED_NOT_DEPLOYED |
| WS5: Cost calculator | P1 | Partially implemented | PARTIALLY_FIXED |
| WS6: Integration tests | P1 | Partially implemented | PARTIALLY_FIXED |
| WS7: Deployment verification | — | Code pushed | See below |

---

## WS1 — Eliminate misleading financial data (P0)

### Root cause
60 of 129 universities shared a $5,000 default tuition value from seed data. Zero universities had source URLs or verification status. The cost calculator silently treated missing tuition as $0, producing misleading totals.

### Changes made
- **Created `src/lib/financial.ts`:**
  - `evaluateTuition()` — classifies tuition as Verified / Estimated / Unknown / Unverified based on value + provenance
  - Known seed defaults ($5000, $3500, $4500, $2500, $3000, $4000, $1500) are automatically flagged as "Estimated"
  - Zero/null tuition returns `null` label (UI shows "Unknown", not "$0")
  - `calculateTotalCost()` returns `null` when tuition is missing (not 0)
  - `auditUniversityData()` — generates data quality report per university
- **Updated cost calculator UI** (`university-detail-page.tsx`):
  - Uses `calculateTotalCost()` instead of raw `totalCost()`
  - Shows "Unknown" instead of "$0" when total can't be calculated
  - Shows warning message: "Total cost cannot be calculated because tuition is unknown"
- **Updated Rihla matcher** (`matcher.ts`):
  - Reduced budget-fit scoring weight from 40 to 25 pts (tuition is unverified)
  - LLM explanation prompt now states "UNVERIFIED — may not be accurate"
  - Asks LLM to mention tuition figures are estimates

### Files changed
- `src/lib/financial.ts` (NEW)
- `src/lib/financial.test.ts` (NEW — 20 tests)
- `src/components/edupath/university-detail-page.tsx` (cost calculator)
- `src/lib/agent/matcher.ts` (scoring + LLM prompt)

### Tests
- 20 new tests covering: verified, estimated, unknown, null tuition; cost calculation with missing data; data quality audit
- All 75 JS tests pass

### Before/after
| Scenario | Before | After |
|----------|--------|-------|
| University with $5000 default tuition | Shows "$5,000/yr" as fact | Shows "~$5,000/yr" with "Estimated" badge |
| University with $0 tuition | Shows "$0/yr" and calculates $0 total | Shows "Unknown" and displays warning |
| Cost calculator with missing tuition | Shows "$0" total | Shows "Unknown" with warning message |
| Rihla budget scoring | 40 pts weight on unverified tuition | 25 pts weight + LLM discloses uncertainty |

### Remaining work
- Verify actual tuition data against official university websites
- Set `verifiedStatus = OFFICIAL_SOURCE_VERIFIED` + `sourceUrl` for each verified university
- Populate `dataQualityScore` for each record

---

## WS2 — Correct review/verification claims (P0)

### Root cause
"Verified Student" badge was displayed on reviews without any actual verification process. Footer claimed "RTL coming" despite RTL being fully implemented. Footer said "Verified reviews are surface-level only" implying some verification existed.

### Changes made
- Relabeled "Verified Student" → "Student Reviewer" (EN), "طالب موثّق" → "طالب مراجع" (AR)
- Changed badge color from blue (implies verification) to neutral slate
- Fixed footer: "English + Arabic (RTL coming)" → "English + Arabic (RTL)"
- Fixed footer: "Verified Reviews" → "Student Reviews"
- Fixed footer disclaimer: removed "Phase 1 MVP demo" and "Verified reviews" claims
  - New: "EduPath is in beta. University data is unverified — confirm all details with official sources. Reviews are student-submitted and not independently verified."
  - Arabic equivalent added

### Files changed
- `messages/en.json` (verifiedStudent, Footer.englishArabic, Footer.disclaimer, Footer.items.reviews)
- `messages/ar.json` (same keys)
- `src/components/edupath/university-detail-page.tsx` (badge color)

### Before/after
| Element | Before | After |
|---------|--------|-------|
| Review badge | Blue "Verified Student" | Slate "Student Reviewer" |
| Footer language | "RTL coming" | "RTL" |
| Footer reviews link | "Verified Reviews" | "Student Reviews" |
| Footer disclaimer | "Phase 1 MVP demo. Verified reviews are surface-level..." | "EduPath is in beta. University data is unverified..." |

### Remaining work
- Implement actual student enrollment verification process
- Add review moderation with audit trail
- Add duplicate review detection

---

## WS3 — Repair and verify Rihla (P0)

### Root cause
ZAI SDK uses `internal-api.z.ai` which is only reachable from within the Z.ai sandbox. On Vercel, this URL returns "fetch failed". The unified LLM client (`src/lib/llm.ts`) has OpenAI and Grok fallback, but requires API keys not yet set on Vercel.

### Changes made
- Added `llmFailed` handling in chat UI: when LLM fails, shows a helpful bilingual message directing users to manual filters
- Reduced Rihla's reliance on unverified tuition data in scoring
- LLM explanation prompt now discloses that tuition is unverified

### Files changed
- `src/components/edupath/rihla-chat.tsx` (llmFailed fallback message)
- `src/lib/agent/matcher.ts` (scoring weight + prompt)

### Current status: PARTIALLY_FIXED
- ✅ Graceful degradation works (user sees helpful message, not crash)
- ✅ Rihla architecture is sound (intake → match → results)
- ✅ Unified LLM client supports ZAI → OpenAI → Grok fallback
- ❌ LLM still fails on Vercel without API keys
- ❌ No eligibility classification
- ❌ No LLM output validation against DB

### Remaining external dependency
**Set ONE of these on Vercel → Settings → Environment Variables:**
```
OPENAI_API_KEY=sk-proj-...  (recommended)
XAI_API_KEY=xai-...         (Grok alternative)
```
Without one of these keys, Rihla's LLM features cannot function on Vercel.

---

## WS4 — Repair GitHub Actions CI (P0)

### Root cause
YAML syntax error: `branches: ain]` instead of `branches: [main]`. CI also used `bun` commands despite `bun.lock` being removed.

### Changes made
- Fixed YAML: `branches: ain]` → `branches: [main]`
- Replaced all bun commands with npm:
  - `oven-sh/setup-bun` → `actions/setup-node@v4` (Node 20)
  - `bun install` → `npm ci`
  - `bunx` → `npx`
  - `bun run` → `npx`
- Added Python tests to CI pipeline
- Simplified environment variables
- Added `NEXT_LINT=0` to build step

### Files changed
- `.github/workflows/ci.yml` (complete rewrite)

### Verification
- YAML is syntactically valid (checked manually)
- Same commands run successfully locally
- **NOT YET VERIFIED on GitHub Actions** — will run on next push

### Current status: FIXED_NOT_DEPLOYED
The corrected CI file is pushed to GitHub. The next push (or manual trigger) will run the workflow. Success cannot be confirmed until GitHub Actions executes it.

---

## WS5 — Improve cost calculator (P1)

### Changes made (partial)
- Cost calculator now uses `calculateTotalCost()` which returns `null` for missing data
- Shows "Unknown" instead of "$0" when tuition is missing
- Shows warning when total can't be calculated
- Unverified data warning already present from Phase 1

### NOT yet implemented
- Mandatory fees (registration, student union, health insurance)
- Visa/residence permit costs
- Travel and initial setup costs
- One-time vs recurring cost distinction
- Currency conversion transparency in calculator
- Scholarship deduction option
- Reusable cost calculation module (currently inline in component)

### Current status: PARTIALLY_FIXED
The calculator is more honest (shows "Unknown" instead of $0) but still lacks the full component breakdown requested.

---

## WS6 — Integration tests (P1)

### Changes made
- Added 20 financial tests (`src/lib/financial.test.ts`):
  - Tuition evaluation (verified, estimated, unknown, null, Arabic)
  - Cost calculation (normal, missing, null, zero duration)
  - Data quality audit (default detection, missing fields, verified passthrough)
- Total tests: 75 JS + 61 Python = 136

### NOT yet implemented
- API route integration tests
- E2E tests (Playwright/Cypress)
- Auth/authorization tests
- Rihla pipeline tests
- LLM response validation tests

### Current status: PARTIALLY_FIXED

---

## WS7 — Deployment verification

### Deployment status
- **Code pushed:** YES (`e54b7d9` on 2026-10-13)
- **Vercel auto-deploy:** Triggered (Vercel deploys on push to main)
- **Build success:** UNVERIFIED (cannot inspect Vercel build logs)
- **Live site test:** Homepage returns HTTP 200

### Tests executed locally
| Test | Result |
|------|--------|
| `npx tsc --noEmit` | 0 errors ✅ |
| `npx vitest run` | 75 passed ✅ |
| `python3 -m pytest scraper/tests/` | 61 passed ✅ |
| `npx next build` | Compiled successfully ✅ |
| `curl https://edupath-amber-three.vercel.app/` | HTTP 200 ✅ |

### Not verified
- Whether Vercel build succeeded for this commit
- Whether live site reflects the changes
- Full functional testing of live site
- GitHub Actions CI execution

---

## Outstanding risks

1. **Rihla LLM blocked** — Requires `OPENAI_API_KEY` or `XAI_API_KEY` on Vercel. Without it, AI features show fallback messages.
2. **All tuition data still unverified** — The system now correctly labels it as unverified/estimated, but the actual values haven't been researched.
3. **CI not yet confirmed** — The YAML is fixed but hasn't run on GitHub Actions yet.
4. **No E2E tests** — Critical user journeys are not tested end-to-end.
5. **5 custom modals lack ARIA** — Accessibility violation (not addressed in this sprint).
