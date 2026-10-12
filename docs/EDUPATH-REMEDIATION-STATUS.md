# EduPath Remediation Status

**Last updated:** 2026-10-13
**Current phase:** Phase 0 (Audit) → Phase 1 (Data Integrity)

---

## Phase 0 — Baseline Audit
- [x] Inspect codebase architecture
- [x] Establish functional inventory
- [x] Produce baseline audit report (`docs/audit/EDUPATH-BASELINE-AUDIT.md`)
- [x] Identify data quality issues
- [x] Identify security findings
- [x] Identify Rihla AI issues
- [x] Identify Arabic/RTL gaps

## Phase 1 — University & Program Data Integrity
- [ ] Add data provenance fields to schema (source, verifiedStatus, lastVerified, sourceUrl)
- [ ] Mark all existing data as `UNVERIFIED`
- [ ] Add uncertainty labels to tuition display
- [ ] Audit tuition data for duplicates and implausible values
- [ ] Create data quality report
- [ ] Add `dataQualityScore` to University model

## Phase 2 — Affordability & Total-Cost Engine
- [ ] Extend cost calculator with transparent component breakdown
- [ ] Add mandatory fees, visa, insurance, travel, one-time costs
- [ ] Mark cost components as required/optional/estimated/unknown
- [ ] Add currency conversion transparency (rate source + date)
- [ ] Add budget feasibility analysis
- [ ] Extract cost calculation into reusable testable module

## Phase 3 — Rihla AI Advisor
- [ ] Separate deterministic matching from LLM generation
- [ ] Add eligibility classification (ELIGIBLE / POTENTIALLY / NOT / UNVERIFIED)
- [ ] Ground LLM explanations in actual DB records
- [ ] Validate LLM output against database
- [ ] Add fallback when AI unavailable (structured results without explanations)
- [ ] Add test scenarios (budget too low, missing data, AI failure)

## Phase 4 — Reviews, Verification & Trust
- [ ] Remove "verified student" badge until verification process exists
- [ ] Add review disclosure: "Unverified" label on all reviews
- [ ] Add privacy policy page
- [ ] Add terms of service page
- [ ] Add data verification methodology page
- [ ] Add AI limitations disclosure

## Phase 5 — Arabic, RTL & UX
- [ ] Translate remaining 55 Arabic descriptions
- [ ] Add Arabic program/scholarship name translations
- [ ] Audit RTL layout across all breakpoints
- [ ] Add accessibility audit (WCAG 2.2 AA)

## Phase 6 — Administration
- [ ] Consolidate requireAdmin() into shared helper
- [ ] Add audit logging for admin actions
- [ ] Add data completeness dashboard

## Phase 7 — Security & Operations
- [ ] Remove debug route
- [ ] Verify all CSRF/rate-limit/zod coverage
- [ ] Add account deletion mechanism
- [ ] Audit PII in logs

## Phase 8 — Testing
- [ ] Add cost calculation tests
- [ ] Add LLM response parsing tests
- [ ] Add API route integration tests
- [ ] Add auth/authorization tests
- [ ] Add E2E test scenarios

---

## Immediate Actions (P0)
- [x] Remove debug route (`/api/agent/debug`)
- [ ] Add `verifiedStatus` field to University schema (default: `UNVERIFIED`)
- [ ] Add uncertainty label to tuition display
- [ ] Add `sourceUrl` + `lastVerified` fields to University + Program
