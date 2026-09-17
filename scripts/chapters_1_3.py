"""Chapters 1-3: Executive Summary, PRD Review, Architecture.
This module imports from build_pdf to access shared styles and helpers."""

# Import shared state from build_pdf
import sys
sys.path.insert(0, '/home/z/my-project/scripts')
from build_pdf import (
    style_body, style_body_left, style_h1, style_h2, style_h3,
    style_bullet, style_caption, style_code, style_toc_title,
    add_major_section, add_subsection, make_table, code_block,
    callout, embed_image, stat_row,
    ACCENT, ACCENT_2, AVAILABLE_WIDTH, AVAILABLE_HEIGHT,
    BODY_FONT, BODY_BOLD, BODY_ITALIC,
)
from reportlab.platypus import Paragraph, Spacer, PageBreak, HRFlowable
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT, TA_JUSTIFY
from reportlab.lib import colors


def build_story():
    story = []

    # ─────────────────────────────────────────────────────────
    # TOC PAGE
    # ─────────────────────────────────────────────────────────
    story.append(Paragraph('Table of Contents', style_toc_title))
    story.append(HRFlowable(width='100%', thickness=1.2, color=ACCENT,
                            spaceBefore=2, spaceAfter=18))
    from reportlab.platypus.tableofcontents import TableOfContents
    toc = TableOfContents()
    toc.levelStyles = [
        ParagraphStyle(name='TOC1', fontName=BODY_BOLD, fontSize=11.5,
                       leading=20, leftIndent=0,
                       textColor=colors.HexColor('#1b1c1d')),
        ParagraphStyle(name='TOC2', fontName=BODY_FONT, fontSize=10,
                       leading=15, leftIndent=18,
                       textColor=colors.HexColor('#81888b')),
    ]
    story.append(toc)
    story.append(PageBreak())

    # ═════════════════════════════════════════════════════════
    # CHAPTER 1: EXECUTIVE SUMMARY
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 1 - Executive Summary'))

    story.append(Paragraph(
        'EduPath is a comprehensive digital platform that empowers Middle East and North Africa (MENA) students to discover, compare, and apply to affordable universities globally. The product addresses a critical gap in higher education: Arabic-speaking students lack a centralized, transparent, and trustworthy resource to navigate the fragmented landscape of international university admissions, financial aid, and visa requirements. This development plan translates the Product Requirements Document (PRD v1.0) into an actionable engineering blueprint, with explicit attention to the four areas the original PRD left underspecified - data sourcing, review verification, AI essay review architecture, and monetization implementation.',
        style_body))

    story.append(Paragraph(
        'The Phase 1 Minimum Viable Product (MVP) targets a 12-week build with a focused scope: a university directory of 500-1,000 budget-friendly institutions across the United Kingdom, Germany, Turkey, Poland, Lithuania, Malaysia, Egypt, Lebanon, Jordan, and the United Arab Emirates; advanced search and filtering; a side-by-side comparison tool; a cost calculator with daily-refreshed currency conversion; verified peer reviews; saved lists with email alerts; and bilingual user authentication supporting both English and Arabic from day one. The MVP launches to 100 beta testers in week 12, with a public launch targeted for the end of month 4 after a soft-launch iteration cycle.',
        style_body))

    story.append(Spacer(1, 8))
    story.append(stat_row([
        ('12 weeks', 'Phase 1 MVP timeline'),
        ('500-1K', 'Universities seeded'),
        ('$220K-$950K', 'Year 1 ARR target'),
    ]))
    story.append(Spacer(1, 14))

    story.append(Paragraph(
        'The revenue model is dual-sided. On the student side, a freemium model with three premium tiers ($9.99, $19.99, $49.99 per month) unlocks AI essay reviews, transfer pathway analysis, financial aid matching, and advisor calls. On the university side, two sponsor tiers ($2,000 and $5,000 per month) offer featured placement, lead generation, and an analytics dashboard. A 20% commission on advisor bookings rounds out the model. Year 1 revenue is projected between $220,000 and $950,000 in Annual Recurring Revenue, with university sponsorships contributing the majority share.',
        style_body))

    story.append(callout(
        'Critical gaps addressed by this plan',
        'The original PRD left four engineering areas underspecified: (1) how 500-1,000 universities will be sourced and kept current, (2) how peer reviews will be verified to prevent fraud, (3) the prompt architecture for AI essay review, and (4) the Stripe billing state machine. This document devotes a full chapter to each, with code snippets, schema decisions, and sequence diagrams. Skipping these in the PRD was reasonable for a product document - skipping them in implementation would be fatal.',
        accent_color=ACCENT_2,
    ))

    story.append(Paragraph(
        'This document is structured for the engineering team. It assumes familiarity with the PRD and focuses on implementation decisions, trade-offs, and risks. Code snippets appear throughout. Where a decision contradicts the PRD, the rationale is explicit. The 12-week sprint plan in Chapter 10 breaks down work into three parallel tracks (Backend, Frontend, Content/Ops) with named owners and acceptance criteria. The risk register in Chapter 11 surfaces 15 risks across technical, product, operational, legal, and market categories, with mitigations and ownership assignments.',
        style_body))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 2: PRD REVIEW & GAP ANALYSIS
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 2 - PRD Review and Gap Analysis'))

    story.append(Paragraph(
        'The Product Requirements Document (PRD v1.0) establishes a clear product vision: a centralized, affordable, and transparent platform for MENA students seeking international university education. Its strengths include a well-framed problem statement that names specific pain points (fragmented information, language barriers, hidden affordability pathways, lack of trust, transfer invisibility); a phased rollout strategy that keeps Phase 1 genuinely MVP-sized; a monetization model that avoids over-reliance on a single customer segment; and three concrete personas (Fatima, Ahmed, Leila) that anchor feature decisions to real user needs.',
        style_body))

    story.append(Paragraph(
        'However, the PRD leaves several engineering-critical areas underspecified. The table below enumerates ten gaps, their impact on the build, and the recommendation this plan adopts. Gaps marked High impact would, if left unaddressed, either block the Phase 1 launch or undermine the core value proposition (trust, affordability, transparency). Gaps marked Medium impact would not block launch but would require rework or operational workarounds within the first three months of operation.',
        style_body))

    story.append(Spacer(1, 8))
    gap_rows = [
        ['1', 'No i18n strategy in Phase 1', 'High',
         'Add RTL + Arabic UI chrome in Phase 1 via next-intl. Postpone full content translation to Phase 3 only for editorial content.'],
        ['2', 'Data sourcing for 500-1K universities undefined', 'High',
         'Build a Python+Playwright scraping pipeline (QS, Times HE, gov portals, OpenAlex) with admin CMS for editorial review.'],
        ['3', 'Data model too thin (5 tables)', 'Medium',
         'Expand to 10 tables - add moderation, tags, deadlines, currency, audit. See Chapter 4.'],
        ['4', 'No review verification mechanism', 'High',
         'Three-tier verification: .edu email, acceptance letter upload, university-issued certificate. See Chapter 6.'],
        ['5', 'Stripe + premium tiers in Phase 2, no billing state machine', 'Medium',
         'Design subscriptions + entitlements tables in Phase 1 schema even if UI ships in Phase 2. See Chapter 8.'],
        ['6', 'Cost calculator uses fixed FX rates', 'Medium',
         'Use exchangerate.host daily-refreshed API cached in Postgres.'],
        ['7', 'No SEO/content strategy', 'High',
         'Programmatic SEO pages at /universities/[country]/[slug], sitemap.xml, schema.org/University structured data.'],
        ['8', 'No moderation/admin tooling in Phase 1', 'Medium',
         'Ship a minimal admin dashboard alongside Phase 1 - reviews cannot launch without it.'],
        ['9', 'AI essay review has no abuse protection', 'Low',
         'Rate limiting + fair-use policy + OpenAI moderation API in Phase 2.'],
        ['10', 'No analytics/observability', 'Medium',
         'Add PostHog (product analytics) + Sentry (errors) from day 1.'],
    ]
    story.append(make_table(
        ['#', 'Gap', 'Impact', 'Recommendation'],
        gap_rows,
        col_ratios=[0.04, 0.30, 0.10, 0.56],
    ))
    story.append(Paragraph('Table 2.1 - PRD gaps with impact rating and recommended mitigation.', style_caption))

    story.extend(add_subsection('2.1 Tech Stack Adjustments'))
    story.append(Paragraph(
        'The PRD proposes Next.js 15, Supabase, TailwindCSS, Shadcn/ui, Stripe, OpenAI, and Vercel. This is a solid baseline. The table below recommends specific adjustments, each with a rationale grounded in either cost, developer experience, or technical fit for the MENA audience.',
        style_body))
    story.append(Spacer(1, 6))

    stack_rows = [
        ['Framework', 'Next.js 15', 'Next.js 16 (App Router, RSC)', 'Latest stable, better RSC streaming, partial prerendering'],
        ['ORM', 'Not specified', 'Prisma + Supabase', 'Type-safe queries, migrations, works with Supabase pooler'],
        ['Auth', 'Supabase Auth + OAuth', 'Add phone OTP for users without Google', 'MENA users often lack LinkedIn or Google accounts'],
        ['i18n', 'Not in Phase 1', 'next-intl with ar + en locales, RTL', 'Non-negotiable for the Arabic-speaking audience'],
        ['Search', 'Not specified', 'Postgres FTS + trigram for Phase 1', 'Avoid premature infra; FTS handles 1K rows fine'],
        ['Charts', 'Not specified', 'Recharts', 'Already in Shadcn ecosystem, works well with RSC'],
        ['Email', 'Not specified', 'Resend', 'DX > SendGrid, generous free tier'],
        ['Analytics', 'Not specified', 'PostHog (cloud free tier)', 'Funnel + session replay for early iteration'],
        ['Payments', 'Stripe', 'Stripe Checkout + Customer Portal', 'No PCI scope, fastest integration path'],
        ['AI', 'OpenAI GPT-4', 'GPT-4o-mini for essay review', '10x cheaper, comparable quality for review use case'],
        ['Hosting', 'Vercel + Supabase', 'Add Cloudflare R2 for assets', 'Cheaper than Vercel blob for university logos'],
    ]
    story.append(make_table(
        ['Layer', 'PRD proposal', 'Recommendation', 'Why'],
        stack_rows,
        col_ratios=[0.13, 0.20, 0.27, 0.40],
    ))
    story.append(Paragraph('Table 2.2 - Technology stack adjustments with rationale.', style_caption))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 3: SYSTEM ARCHITECTURE
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 3 - System Architecture'))

    story.append(Paragraph(
        'The architecture follows a server-first React Server Components (RSC) model on Next.js 16, with Supabase Postgres as the system of record and Stripe as the source of truth for billing state. The diagram below shows the six layers of the system, from client through edge, application, data, external APIs, and observability. The design optimizes for three properties: low operational overhead (no Kubernetes, no self-hosted databases), fast page loads (ISR caching, RSC streaming), and bilingual first-class support (Arabic RTL and English LTR from day one).',
        style_body))

    story.append(Spacer(1, 12))
    story.append(embed_image('/home/z/my-project/scripts/assets/architecture.png',
                             max_width=AVAILABLE_WIDTH,
                             max_height=AVAILABLE_HEIGHT * 0.62))
    story.append(Paragraph('Figure 3.1 - EduPath system architecture (Phase 1). Six layers with clear separation of concerns.', style_caption))

    story.extend(add_subsection('3.1 Layer-by-Layer Rationale'))

    story.append(Paragraph(
        '<b>Client layer.</b> Three browser contexts share the same Next.js codebase via route groups: the student-facing app (/), the recruiter sponsor dashboard (/sponsor), and the internal admin console (/admin). All three use Shadcn/ui components for consistency. Arabic and English locales are routed via the /ar and /en prefixes, with RTL switching handled by Tailwind logical properties (ps-, pe-, ms-, me-) rather than physical properties (pl-, pr-, ml-, mr-).',
        style_body))

    story.append(Paragraph(
        '<b>Edge / CDN.</b> Vercel Edge Network handles ISR caching, image optimization, and edge middleware (auth + i18n routing). Cloudflare R2 stores university logos (cached at the edge), acceptance letter uploads (encrypted at rest with AES-256, accessible only to admin reviewers), and brochure PDFs. R2 is chosen over Vercel Blob for cost reasons: at 1,000 universities x 50KB average logo size, the storage cost is negligible on R2 ($0.015/GB/month) but would be 4-5x more expensive on Vercel Blob.',
        style_body))

    story.append(Paragraph(
        '<b>Application layer.</b> Next.js 16 App Router with React Server Components as the default rendering strategy. Server Actions handle mutations (form submissions, saved-list updates) without separate API endpoints. Middleware at the edge handles auth token refresh and locale routing before requests reach the application. Prisma ORM connects to Supabase Postgres via the connection pooler (port 6543) to avoid exhausting direct connections during ISR revalidation bursts.',
        style_body))

    story.append(Paragraph(
        '<b>Data and services.</b> Supabase provides Postgres (with Row Level Security on User, Review, and SavedList tables), Auth (email + Google OAuth + phone OTP for users without OAuth providers), and Storage (user avatars, review photos). Inngest handles async job scheduling: weekly FX rate refresh, daily deadline alert email batches, and the review moderation queue worker. Vercel Cron is used as a fallback for time-based triggers if Inngest is unavailable.',
        style_body))

    story.append(Paragraph(
        '<b>External APIs.</b> OpenAI GPT-4o-mini powers AI essay review in Phase 2 (cost: approximately $0.001 per essay at 4K tokens). Stripe handles all payment flows via Checkout (new subscriptions), Customer Portal (self-service management), and Webhooks (state sync to Postgres). Resend sends transactional email. exchangerate.host provides daily FX rates, cached in a Postgres table and refreshed by a daily cron job.',
        style_body))

    story.append(Paragraph(
        '<b>Observability.</b> PostHog captures product analytics (funnels, session replay, feature flags, A/B tests) with the cloud free tier (1M events/month). Sentry captures errors and performance traces. Vercel Analytics provides web vitals (LCP, CLS, INP) and edge function traces. All three are read-only and add no operational burden.',
        style_body))

    story.extend(add_subsection('3.2 Tech Stack Summary'))
    story.append(Paragraph(
        'The table below summarizes the technology choices, the phase in which each component is introduced, and the rationale. Components marked Phase 1 are required for MVP launch. Components marked Phase 2 or Phase 3 are introduced as the platform scales.',
        style_body))
    story.append(Spacer(1, 6))

    arch_rows = [
        ['Frontend', 'Next.js 16 App Router + RSC', 'Phase 1', 'Server-first, SEO-friendly, ISR for directory pages'],
        ['UI library', 'Shadcn/ui + TailwindCSS 4', 'Phase 1', 'Accessible, customizable, RSC-compatible'],
        ['i18n', 'next-intl (ar + en, RTL)', 'Phase 1', 'First-class Arabic support is non-negotiable'],
        ['Backend', 'Supabase Postgres + RLS', 'Phase 1', 'Startup-friendly, strong SQL, built-in auth'],
        ['ORM', 'Prisma 5', 'Phase 1', 'Type-safe queries, migrations, Supabase pooler support'],
        ['Auth', 'Supabase Auth (email + Google + OTP)', 'Phase 1', 'MENA users often lack OAuth providers'],
        ['Search', 'Postgres FTS + pg_trgm', 'Phase 1', 'Sufficient for 1K rows; defer Meilisearch to Phase 2'],
        ['Payments', 'Stripe Checkout + Portal + Webhooks', 'Phase 2', 'No PCI scope; fastest integration path'],
        ['AI', 'OpenAI GPT-4o-mini', 'Phase 2', '10x cheaper than GPT-4, comparable quality for review'],
        ['Email', 'Resend', 'Phase 1', 'Generous free tier, superior DX to SendGrid'],
        ['Analytics', 'PostHog + Sentry', 'Phase 1', 'Cloud free tiers cover early-stage volume'],
        ['Asset storage', 'Cloudflare R2', 'Phase 1', 'Cheaper than Vercel Blob at scale'],
        ['Job queue', 'Inngest + Vercel Cron', 'Phase 1', 'Async jobs (FX, alerts) without infra overhead'],
        ['Hosting', 'Vercel (frontend) + Supabase (backend)', 'Phase 1', 'Zero-infra, generous free tiers'],
    ]
    story.append(make_table(
        ['Layer', 'Choice', 'Phase', 'Why'],
        arch_rows,
        col_ratios=[0.13, 0.27, 0.10, 0.50],
    ))
    story.append(Paragraph('Table 3.1 - Technology choices by layer with phase and rationale.', style_caption))

    return story
