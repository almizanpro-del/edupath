"""Chapters 10-14: Implementation plan, Risks, roadmap, metrics, appendix."""


def append_chapters_10_14(story, helpers):
    add_major_section = helpers['add_major_section']
    add_subsection = helpers['add_subsection']
    make_table = helpers['make_table']
    code_block = helpers['code_block']
    callout = helpers['callout']
    embed_image = helpers['embed_image']
    stat_row = helpers['stat_row']
    styles = helpers['styles']
    ACCENT = helpers['ACCENT']
    ACCENT_2 = helpers['ACCENT_2']

    from reportlab.platypus import Paragraph, Spacer, PageBreak, HRFlowable

    AVAILABLE_WIDTH = helpers['AVAILABLE_WIDTH']
    AVAILABLE_HEIGHT = helpers['AVAILABLE_HEIGHT']

    # ═════════════════════════════════════════════════════════
    # CHAPTER 10: 12-WEEK IMPLEMENTATION PLAN
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 10 - 12-Week Phase 1 Implementation Plan'))

    story.append(Paragraph(
        'Phase 1 runs as three parallel tracks: Backend/Data (track A), Frontend (track B), and Content/Ops (track C). Each track has a single owner (senior engineer for A and B, content operator for C) with cross-track coordination via a 15-minute daily standup and a 60-minute weekly sprint planning meeting. The Gantt chart below shows the week-by-week task distribution across the three tracks. The buffer in week 11 is intentional - it absorbs slippage from the two critical-path risks (weeks 2-3 scraping and week 8 comparison tool) and is the difference between launching on time and launching two weeks late.',
        styles['style_body']))

    story.append(Spacer(1, 10))
    story.append(embed_image('/home/z/my-project/scripts/assets/gantt.png',
                             max_width=AVAILABLE_WIDTH,
                             max_height=AVAILABLE_HEIGHT * 0.62))
    story.append(Paragraph('Figure 10.1 - 12-week Phase 1 Gantt chart. Three parallel tracks. Red-tinted weeks mark critical-path risks.', styles['style_caption']))

    story.append(add_subsection('10.1 Week-by-Week Breakdown')[0])
    story.append(Paragraph(
        'The table below enumerates the deliverable for each track in each week. Acceptance criteria are explicit: a week is "done" when its deliverable is merged to main, deployed to staging, and passes the agreed checks (unit tests, e2e tests for new UI, content QA for editorial work). Weeks marked with a red flag in the Gantt chart are critical-path weeks where slippage cascades - these weeks get an extra 30-minute mid-week check-in.',
        styles['style_body']))
    story.append(Spacer(1, 6))

    week_rows = [
        ['1', 'Prisma schema + Supabase migrations + CI', 'Next.js 16 scaffold + Shadcn + next-intl + RTL setup', 'Source list of 1K universities (CSV), define data schema'],
        ['2', 'Auth (email + Google OAuth), RLS policies', 'Layout, header, footer, home page', 'Start scraping pipeline (Python + Playwright)'],
        ['3', 'Universities CRUD + FTS search', '/universities listing with filters', 'First 200 universities seeded'],
        ['4', 'Programs + scholarships APIs', '/universities/[slug] detail page', 'Reviews moderation workflow spec'],
        ['5', 'Reviews API + moderation queue', 'Review form + review cards', 'Continue seeding (target: 500)'],
        ['6', 'Saved lists + share tokens', '/saved-lists UI + alert signup', 'FX rate integration (exchangerate.host)'],
        ['7', 'Alert subscription + cron email job', 'Cost calculator UI', 'Beta tester recruitment (Fatima/Ahmed personas)'],
        ['8', 'Compare API (server-side)', '/universities/compare with Recharts', 'SEO: sitemap, structured data, OG images'],
        ['9', 'User verification flow (upload + admin)', 'Account page, language toggle, RTL QA', 'Content: 50+ editorial guides on top countries'],
        ['10', 'Admin dashboard APIs', 'Admin UI (Shadcn data tables)', 'Soft launch to 20 testers'],
        ['11', 'Performance pass (RSC, ISR, image opt)', 'Polish: empty states, loading skeletons, errors', 'Iterate based on tester feedback'],
        ['12', 'Monitoring (Sentry + PostHog) + buffer', 'Bug fixes, SEO audit, Lighthouse > 90', 'Launch to 100 beta users'],
    ]
    story.append(make_table(
        ['Week', 'Track A: Backend', 'Track B: Frontend', 'Track C: Content/Ops'],
        week_rows,
        col_ratios=[0.06, 0.31, 0.31, 0.32],
    ))
    story.append(Paragraph('Table 10.1 - Week-by-week deliverables across the three parallel tracks.', styles['style_caption']))

    story.append(callout(
        'Critical-path risks',
        'Weeks 2-3 (data scraping) and Week 8 (compare tool) are the two most likely slip points. The scraping pipeline depends on third-party source availability and rate limits - if a major source blocks the scraper, fallback sources must be queued within 48 hours or the launch catalog drops below 500. The compare tool has the highest UI complexity in Phase 1 (5-column responsive table with charts, URL state, share links) - if it slips, ship a 3-column version first and add 5-column support in week 12 buffer.',
        accent_color=ACCENT_2,
    ))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 11: RISK REGISTER
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 11 - Risk Register'))

    story.append(Paragraph(
        'Fifteen risks are tracked across five categories: technical, product, operational, legal/compliance, and market. Each risk is scored on probability (High/Medium/Low) and impact (High/Medium/Low), with a mitigation strategy and a named owner. The probability-impact matrix below visualizes the distribution. Risks in the right column (High Impact) receive weekly status updates to the product owner; risks in the middle column receive biweekly updates; risks in the left column are tracked in the backlog and reviewed monthly.',
        styles['style_body']))

    story.append(Spacer(1, 10))
    story.append(embed_image('/home/z/my-project/scripts/assets/risk_matrix.png',
                             max_width=AVAILABLE_WIDTH * 0.85,
                             max_height=AVAILABLE_HEIGHT * 0.55))
    story.append(Paragraph('Figure 11.1 - Risk probability vs impact matrix. 15 risks plotted across 9 cells.', styles['style_caption']))

    story.append(add_subsection('11.1 Risk Register')[0])
    story.append(Paragraph(
        'The full risk register is below. Owners are role titles rather than names - the actual assignment happens at sprint planning. Mitigations are concrete actions with acceptance criteria, not aspirations.',
        styles['style_body']))
    story.append(Spacer(1, 6))

    risk_rows = [
        ['R1', 'No i18n strategy in Phase 1 - half the value prop is Arabic-first', 'Tech', 'M', 'H',
         'Ship RTL + Arabic UI chrome in Phase 1 via next-intl. Acceptance: 100% of UI strings localized, RTL layout verified.'],
        ['R2', 'Data scraping blocked by source anti-bot measures', 'Tech', 'H', 'H',
         'Multi-source fallback (5 tiers), respect robots.txt, manual editorial backlog. Acceptance: 500+ universities seeded by week 10.'],
        ['R3', 'Review verification fraud - fake reviews kill trust', 'Product', 'M', 'H',
         'Three-tier verification + MinHash similarity + admin review. Acceptance: <1% fraud rate in audit sample.'],
        ['R4', 'No SEO/content strategy - organic traffic too low', 'Market', 'M', 'H',
         'Programmatic SEO pages, sitemap, schema.org structured data. Acceptance: 200+ organic visits/month by month 3.'],
        ['R5', 'OpenAI API outage or rate limit during essay review', 'Tech', 'M', 'M',
         'Queue submissions, retry with exponential backoff, status page. Acceptance: 99% of essays returned within 60 seconds.'],
        ['R6', 'Low review submission rate - thin content', 'Product', 'H', 'M',
         'Email prompts to verified users, gamification badges, deadline-aligned prompts. Acceptance: 100+ reviews by month 3.'],
        ['R7', 'Stripe webhook failure - lost state sync', 'Tech', 'M', 'H',
         'Idempotent webhook handlers, hourly reconciler cron, manual sync tool. Acceptance: <0.1% webhook loss rate.'],
        ['R8', 'Vercel/Supabase downtime during launch', 'Ops', 'M', 'M',
         'Status page subscription, automated failover to backup region, runbook. Acceptance: 99.9% uptime SLA.'],
        ['R9', 'Low premium conversion (<3%)', 'Product', 'H', 'M',
         'Pricing experiments, free-trial optimization, in-app upgrade prompts. Acceptance: 5%+ conversion by month 6.'],
        ['R10', 'Cost overrun on OpenAI / Vercel / Supabase', 'Ops', 'H', 'L',
         'Budget alerts at 50/75/100% thresholds, monthly cost review. Acceptance: <10% budget variance monthly.'],
        ['R11', 'GDPR compliance for EU students', 'Legal', 'L', 'M',
         'Privacy policy, data export endpoint, right-to-delete flow. Acceptance: GDPR audit passed by month 4.'],
        ['R12', 'Key person dependency (single senior engineer)', 'Ops', 'M', 'M',
         'Pair programming, documentation, cross-training. Acceptance: two engineers can maintain each subsystem.'],
        ['R13', 'Currency volatility in cost calculator', 'Market', 'M', 'L',
         'Daily FX refresh, weekly review of major pairs. Acceptance: <5% daily variance on JOD/AED/EGP.'],
        ['R14', 'Competitor (ApplyBoard, etc.) launches Arabic version', 'Market', 'L', 'L',
         'Speed to market, deeper MENA-specific content, verified reviews as moat. Acceptance: 6-month head start.'],
        ['R15', 'MENA geopolitical disruption affects student demand', 'Market', 'L', 'M',
         'Diversify target markets within MENA, maintain flexibility on launch country. Acceptance: 2+ launch markets.'],
    ]
    story.append(make_table(
        ['ID', 'Risk', 'Cat', 'P', 'I', 'Mitigation'],
        risk_rows,
        col_ratios=[0.04, 0.26, 0.07, 0.04, 0.04, 0.55],
    ))
    story.append(Paragraph('Table 11.1 - Full risk register. P=Probability, I=Impact, H/M/L scale.', styles['style_caption']))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 12: PHASE 2 & 3 ROADMAP
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 12 - Phase 2 and 3 Roadmap'))

    story.append(Paragraph(
        'Phase 2 (Months 4-6) introduces monetization, AI features, and deeper matching tools. Phase 3 (Months 7+) extends the platform into a post-enrollment ecosystem with visa guides, alumni networking, and job placement. The roadmap is sequenced by dependency: AI essay review requires the verified user base from Phase 1; the financial aid matcher requires embeddings infrastructure (introduced for essay review); the sponsor dashboard requires the Stripe integration from Phase 2 monetization. Each phase has a single "theme" that drives prioritization decisions when scope conflicts arise.',
        styles['style_body']))

    story.append(add_subsection('12.1 Phase 2 (Months 4-6): Monetization and Advanced Features')[0])
    story.append(Paragraph(
        '<b>AI essay review (Month 4).</b> First monetizable AI feature. Uses GPT-4o-mini with the prompt architecture specified in Chapter 7. Drives Premium tier conversions. Success metric: 5% of free users convert to Premium after their first free essay review.',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Transfer pathway finder (Month 4).</b> Adds a transfer_policies table mapping (source_university, target_university) -> credit_transfer_agreement. Includes 20 curated case studies of real transfer paths (e.g., community college in Jordan -> UK post-92 university). Drives Pro tier conversions from Ahmed persona (current student seeking transfer).',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Financial aid matcher (Month 5).</b> Uses text-embedding-3-small to embed scholarship eligibility text and user profile text, computes cosine similarity, returns top 10 matches. Reuses embeddings infrastructure from essay review. Drives Premium tier conversions from Fatima persona (high-achiever seeking scholarships).',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Stripe billing and sponsor dashboard (Month 5).</b> Implements the tier structure, entitlements, and sponsor dashboard specified in Chapter 8. Three student tiers ($9.99, $19.99, $49.99) and two university tiers ($2K, $5K). Drives first revenue.',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Meilisearch migration (Month 6, conditional).</b> If Postgres FTS shows p95 latency > 200ms at 1,000 universities, migrate to self-hosted Meilisearch. Decision criterion: 95th percentile search latency measured in production over 7 days. If latency is acceptable, defer to Phase 3.',
        styles['style_body']))

    story.append(add_subsection('12.2 Phase 3 (Months 7+): Ecosystem and Outcomes')[0])
    story.append(Paragraph(
        '<b>Visa guides (Month 7).</b> Country-by-nationality matrix: for each (destination_country, applicant_nationality) pair, a step-by-step visa guide with required documents, processing time, cost, and rejection rate. Initially covers 10 destination countries x 20 MENA nationalities = 200 guides. Content written by an immigration consultant, reviewed quarterly.',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Alumni network (Month 8).</b> Verified graduate badges (Tier 3 verification extended to alumni). Alumni can opt-in to mentor current students. Drives long-term retention and creates a defensible content moat (alumni-only insights unavailable on competitor platforms).',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Job board (Month 9).</b> Employer dashboard for posting entry-level roles targeting MENA international graduates. Pricing: $500-$2,000 per listing based on duration. Reuses sponsor dashboard infrastructure. Drives Phase 3 revenue.',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Post-grad outcome tracking (Month 10).</b> Survey tool that sends 6-month and 12-month post-graduation surveys to verified alumni. Aggregated outcomes (employment rate, median salary, geographic distribution) displayed on university detail pages. Drives review trust and SEO.',
        styles['style_body']))
    story.append(Paragraph(
        '<b>Full content translation (Month 11+).</b> Translate all university descriptions, scholarship eligibility, and editorial guides to Arabic. Uses a hybrid approach: machine translation (DeepL or GPT-4o-mini) for first pass, human review for accuracy. UI chrome already bilingual since Phase 1.',
        styles['style_body']))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 13: SUCCESS METRICS
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 13 - Success Metrics and Definition of Done'))

    story.append(Paragraph(
        'Phase 1 success is measured across five dimensions: acquisition (signups), engagement (MAU, feature adoption), content (universities seeded, reviews submitted), performance (page load, Lighthouse), and operational (moderation SLA, bug count). Each metric has a target, a measurement method, and a review cadence. Metrics that miss target by more than 20% trigger a root-cause analysis. The Definition of Done for Phase 1 is a hard gate: no metric below target by more than 20%, no critical bugs open for 7+ days, beta tester feedback collected and triaged.',
        styles['style_body']))

    story.append(add_subsection('13.1 Phase 1 Metrics')[0])
    story.append(Spacer(1, 6))

    metric_rows = [
        ['Signups', '5,000 by month 5 (1 month post-public-launch)', 'PostHog funnel', 'Weekly'],
        ['MAU', '20% of signups', 'PostHog monthly active', 'Weekly'],
        ['University listings', '500-1,000', 'DB count', 'Daily'],
        ['Authentic reviews', '100+', 'DB count (approved + verified)', 'Weekly'],
        ['Comparison tool adoption', '30% of users', 'PostHog event tracking', 'Weekly'],
        ['Lighthouse score', '>90 (Performance, Accessibility, SEO)', 'Lighthouse CI on every PR', 'Per PR'],
        ['p95 page load', '<2 seconds', 'Vercel Analytics', 'Daily'],
        ['Review moderation SLA', '<24 hours', 'Time from submission to decision', 'Weekly'],
        ['Critical bugs open', '0 for 7+ days', 'Sentry + Linear', 'Daily'],
        ['Cost variance', '<10% from budget', 'Vercel + Supabase + OpenAI bills', 'Monthly'],
    ]
    story.append(make_table(
        ['Metric', 'Target', 'Measurement', 'Cadence'],
        metric_rows,
        col_ratios=[0.27, 0.27, 0.27, 0.19],
    ))
    story.append(Paragraph('Table 13.1 - Phase 1 success metrics with targets and measurement methods.', styles['style_caption']))

    story.append(add_subsection('13.2 Phase 2+ Targets')[0])
    story.append(Paragraph(
        'Phase 2 targets shift from acquisition to monetization. Signups target grows to 50,000+ by end of Year 1. Premium conversion target is 5-10% of MAU. University sponsors target is 10-15 paying universities by end of Year 1 (calibrated to the $20K MRR target at an average $3,000-$3,500/month sponsor price; the original PRD\'s 50+ sponsor target is treated as a Year 2 goal once the platform has demonstrable traction). Monthly Recurring Revenue (MRR) target is $20,000+ by month 12. Net Promoter Score (NPS) target is 50+ for university sponsors. These targets are reviewed quarterly and revised based on actuals - if premium conversion comes in below 3% in the first 60 days, a pricing experiment is launched before the next quarter.',
        styles['style_body']))
    story.append(Spacer(1, 6))

    phase2_rows = [
        ['Signups', '50K+ by Year 1', 'PostHog'],
        ['Premium conversion', '5-10% of MAU', 'Stripe + PostHog funnel'],
        ['University sponsors', '10-15 paying (Year 1); 50+ by Year 2', 'Stripe customer count'],
        ['MRR', '$20K+ by month 12', 'Stripe MRR report'],
        ['NPS (sponsors)', '50+', 'Quarterly NPS survey'],
        ['NPS (students)', '40+', 'Quarterly NPS survey'],
        ['Organic traffic', '5K+ visits/month', 'Google Search Console'],
    ]
    story.append(make_table(
        ['Metric', 'Target', 'Source'],
        phase2_rows,
        col_ratios=[0.30, 0.40, 0.30],
    ))
    story.append(Paragraph('Table 13.2 - Phase 2+ targets (Year 1).', styles['style_caption']))

    story.append(add_subsection('13.3 Definition of Done (Phase 1)')[0])
    story.append(Paragraph(
        'Phase 1 is "done" when all of the following are true: (1) all P0 features shipped to production - university directory, search, comparison, cost calculator, reviews, saved lists, auth, admin console, bilingual support; (2) 100 beta testers actively using the platform (defined as at least 1 session in the past 7 days); (3) 500+ universities seeded with completeness score >= 60; (4) 0 critical bugs open for 7+ days (critical = blocks core flow); (5) post-mortem completed for any incident that occurred during beta; (6) stakeholder demo delivered and signed off by product owner. Missing any criterion blocks the public launch.',
        styles['style_body']))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 14: APPENDIX - TOOLING & DEVOPS
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 14 - Appendix: Tooling and DevOps'))

    story.append(Paragraph(
        'The development workflow uses trunk-based development with short-lived feature branches (maximum 3 days), conventional commits (feat:, fix:, chore:, docs:, refactor:), and automated changelog generation via semantic-release. Every PR runs lint, type-check, unit tests, and Playwright e2e tests via GitHub Actions. Preview deploys are created automatically on Vercel for every PR, with the preview URL posted as a comment. Migrations are applied via Prisma migrate in a dedicated GitHub Action that runs on merge to main. Database types are regenerated via prisma generate and committed by the same action.',
        styles['style_body']))

    story.append(add_subsection('14.1 Tool Stack')[0])
    story.append(Spacer(1, 6))

    tool_rows = [
        ['Version control', 'GitHub', 'PR reviews, Actions CI, Issues'],
        ['CI/CD', 'GitHub Actions + Vercel', 'Lint, test, build, preview deploy per PR'],
        ['Database migrations', 'Prisma Migrate', 'Versioned SQL migrations, type generation'],
        ['DB inspection', 'Prisma Studio', 'Local dev DB browsing'],
        ['Error tracking', 'Sentry', 'Source maps, release health, performance'],
        ['Product analytics', 'PostHog', 'Funnels, session replay, feature flags'],
        ['Issue tracking', 'Linear', 'Sprint planning, bug triage'],
        ['Design handoff', 'Figma', 'Component library, design tokens'],
        ['Documentation', 'Notion', 'PRD, meeting notes, runbooks'],
        ['Communication', 'Slack', '#edupath-eng, #edupath-product, alerts'],
        ['Status page', 'Statuspage.io', 'Public uptime, incident communication'],
    ]
    story.append(make_table(
        ['Category', 'Tool', 'Purpose'],
        tool_rows,
        col_ratios=[0.22, 0.22, 0.56],
    ))
    story.append(Paragraph('Table 14.1 - Development tooling stack.', styles['style_caption']))

    story.append(add_subsection('14.2 Local Development Setup')[0])
    story.append(Paragraph(
        'A new engineer can be running EduPath locally in under 15 minutes. The setup script bootstraps all dependencies, starts a local Supabase instance via Docker, runs migrations, seeds 50 sample universities, and starts the Next.js dev server. The seed data is intentionally small (50 universities) to keep the dev cycle fast - the full 500-1,000 university dataset is loaded from a production snapshot via a separate script for staging environments.',
        styles['style_body']))
    story.append(Spacer(1, 8))

    setup_code = '''# Clone and install
git clone git@github.com:edupath/web.git
cd edupath-web
pnpm install

# Start local Supabase (Docker)
pnpm supabase:start
pnpm db:migrate
pnpm db:seed      # seeds 50 sample universities

# Start dev server
pnpm dev          # http://localhost:3000

# Run tests
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # Playwright end-to-end
pnpm lint         # ESLint + Prettier
pnpm typecheck    # TypeScript

# Production build
pnpm build
pnpm start'''
    story.append(code_block(setup_code, language='bash'))

    story.append(callout(
        'Environment variables',
        'Local development uses .env.local with values from the shared 1Password vault. Required variables: DATABASE_URL (Supabase pooler), SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET (configured in Supabase Auth dashboard, not NextAuth - the auth stack is Supabase Auth, not NextAuth), OPENAI_API_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, RESEND_API_KEY, POSTHOG_KEY, SENTRY_DSN, CLOUDFLARE_R2_ACCESS_KEY, CLOUDFLARE_R2_SECRET_KEY, CLOUDFLARE_R2_BUCKET, EXCHANGERATE_HOST_API_KEY. Missing variables cause the dev server to fail fast with a clear error message listing what is missing.',
        accent_color=ACCENT,
    ))
