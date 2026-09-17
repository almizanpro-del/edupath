"""Chapters 7-9: AI Essay Review, Monetization, Routes."""


def append_chapters_7_9(story, helpers):
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
    # CHAPTER 7: AI ESSAY REVIEW PROMPT ARCHITECTURE
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 7 - Deep-Dive #3: AI Essay Review Prompt Architecture'))

    story.append(Paragraph(
        'The AI essay review feature is the cornerstone of the Phase 2 premium subscription. It must deliver feedback that is specific, actionable, and culturally aware - generic "good essay, well-written" feedback is worse than no feedback because it erodes trust. This chapter specifies the prompt architecture, model choice, token budget, abuse prevention, and failure modes. The system uses GPT-4o-mini rather than GPT-4 because the use case (structured rubric-based feedback on 500-word essays) does not require GPT-4\'s reasoning depth, and the 10x cost difference makes the unit economics viable: at $0.001 per essay, a $9.99/month subscriber submitting the 2-essay allotment costs $0.002 in API fees, leaving $9.988 for product and acquisition.',
        styles['style_body']))

    story.append(Spacer(1, 8))
    story.append(stat_row([
        ('~$0.001', 'Cost per essay (GPT-4o-mini)'),
        ('~4K tokens', 'Total budget per essay'),
        ('4 dimensions', 'Structure, tone, clarity, cultural fit'),
    ]))
    story.append(Spacer(1, 12))

    story.append(add_subsection('7.1 Model Choice and Token Budget')[0])
    story.append(Paragraph(
        'GPT-4o-mini at $0.15 per million input tokens and $0.60 per million output tokens is the right model. GPT-4 ($2.50 / $10.00) is 10-17x more expensive without meaningfully better essay-review quality - the task is bounded by the rubric and few-shot examples, not by reasoning depth. Claude 3.5 Haiku ($0.25 / $1.25) is a viable alternative but adds a second vendor dependency without clear benefit. Token budget per essay: system prompt ~800 tokens (rubric definition + output schema), few-shot examples ~1,800 tokens (3 anchor essays with reference feedback), user prompt ~400 tokens (essay + context), output ~1,000 tokens (structured JSON feedback). Total ~4,000 tokens per essay, cost ~$0.001 at GPT-4o-mini rates.',
        styles['style_body']))

    story.append(add_subsection('7.2 Prompt Architecture')[0])
    story.append(Paragraph(
        'The prompt is structured as three layers: a system prompt that defines the reviewer persona and rubric, a few-shot section with three anchor essays (weak, medium, strong) and their reference feedback, and a user prompt with the essay under review plus context (target university, program, applicant country, language of submission). The model is instructed to return JSON conforming to a schema with four score dimensions and line-specific feedback annotations.',
        styles['style_body']))
    story.append(Spacer(1, 8))

    system_prompt = '''SYSTEM PROMPT (constant across all essays):

You are an expert university admissions reviewer for MENA students
applying to international universities. You evaluate essays on four
dimensions, each scored 1-5 with rubric anchors:

DIMENSION 1 - STRUCTURE (1-5):
  5: Clear thesis in intro, 2-3 body paragraphs with topic sentences,
     conclusion that restates thesis and adds reflection. Transitions
     between paragraphs are explicit.
  3: Has intro/body/conclusion but transitions are weak or topic
     sentences are missing. Thesis is implied but not stated.
  1: No discernible structure. Stream of consciousness.

DIMENSION 2 - TONE (1-5):
  5: Confident, specific, reflective. Avoids cliches ("ever since I
     was a child", "I want to make the world a better place"). Uses
     concrete details instead of abstractions.
  3: Mostly appropriate tone but relies on 1-2 cliches or vague
     abstractions. Some sections feel performative.
  1: Defensive, arrogant, or excessively self-deprecating. Heavy
     cliche use throughout.

DIMENSION 3 - CLARITY (1-5):
  5: Every sentence is necessary. No redundancy. Vocabulary is
     precise (not showy). Sentence length varies for rhythm.
  3: Some redundancy or filler. Vocabulary is acceptable but
     imprecise in places.
  1: Confusing. Long wandering sentences. Vocabulary errors impede
     comprehension.

DIMENSION 4 - CULTURAL FIT (1-5):
  5: Demonstrates specific knowledge of the target university and
     program (named faculty, courses, research labs, values).
     Explains why this program is the right fit for the applicant's
     background and goals.
  3: Mentions the university by name but with generic reasons
     ("good reputation", "diverse student body").
  1: Could be submitted to any university. No personalization.

Return STRICT JSON conforming to this schema:
{
  "scores": {"structure": int, "tone": int, "clarity": int, "cultural_fit": int},
  "overall_score": int,  // weighted average, rounded
  "strengths": [string],  // 2-3 specific strengths
  "weaknesses": [string],  // 2-3 specific weaknesses
  "line_feedback": [  // 3-5 most impactful annotations
    {"quote": string, "issue": string, "suggestion": string}
  ],
  "rewrite_summary": string  // 2-3 sentence summary of how to improve
}'''
    story.append(code_block(system_prompt, language='text'))
    story.append(Spacer(1, 8))

    user_prompt = '''USER PROMPT (per essay):

Target university: {university_name} ({country})
Target program: {program_name} ({degree_level})
Applicant country: {applicant_country}
Submission language: {language}

ESSAY:
"""
{essay_text}
"""

Evaluate this essay strictly per the rubric. Be specific - cite
exact phrases from the essay in your line_feedback. If the essay
is in Arabic, evaluate it in Arabic; otherwise evaluate in English.
Return only valid JSON.'''
    story.append(code_block(user_prompt, language='text'))

    story.append(add_subsection('7.3 Few-Shot Anchor Examples')[0])
    story.append(Paragraph(
        'Three anchor essays calibrate the model to the rubric. Each anchor is a real (anonymized) essay with reference feedback written by a human admissions counselor. The weak anchor (overall score 2) demonstrates common failure modes: cliche opening, no thesis, no university-specific research. The medium anchor (overall score 3) has structure but lacks specificity. The strong anchor (overall score 4) has clear thesis, specific university research, but minor tone issues. The anchors are stored as a separate text file loaded at inference time - they are not part of the system prompt to allow iteration without redeployment. Anchor essays are reviewed quarterly by an admissions counselor to ensure they remain representative of current applicant pools.',
        styles['style_body']))

    story.append(add_subsection('7.4 Abuse Prevention and Rate Limiting')[0])
    story.append(Paragraph(
        'Free-tier users receive 1 essay review per month (sufficient to demonstrate value). Premium tier ($9.99/month) receives 2 reviews per month. Pro tier ($19.99/month) receives unlimited reviews with a fair-use cap of 20 per month. VIP tier ($49.99/month) receives unlimited reviews with no cap and priority queue access. Rate limiting is enforced server-side via a Redis-backed token bucket keyed on user_id. Each submission is also passed through the OpenAI Moderation API to reject essays containing hate speech, self-harm content, or sexual content - this is a safety guardrail, not a content-quality filter. Plagiarism detection runs via embeddings similarity: the essay is embedded using text-embedding-3-small, and cosine similarity is checked against a corpus of prior submissions. Essays with similarity > 0.92 are flagged for manual review (not auto-rejected, to handle legitimate resubmissions).',
        styles['style_body']))

    story.append(add_subsection('7.5 Failure Modes and Mitigations')[0])
    story.append(Paragraph(
        'Three failure modes are anticipated. First, hallucinated feedback: the model invents quotes that do not appear in the essay. Mitigation: the prompt explicitly instructs "cite exact phrases from the essay" and the JSON schema requires a "quote" field - empty or non-matching quotes are detected server-side and the request is retried with a clarification prompt. Second, generic feedback: the model produces "your essay is good but could be more specific" without line-level annotations. Mitigation: the few-shot anchors demonstrate the expected specificity level, and the schema requires at least 3 line_feedback entries - responses with fewer are retried. Third, cultural bias: the model may evaluate Arabic-language essays with Western admissions norms. Mitigation: the prompt explicitly instructs evaluation in the submission language, and the cultural_fit dimension is calibrated to value MENA-specific narrative styles (family context, community orientation, faith-driven motivation) rather than penalize them.',
        styles['style_body']))

    story.append(callout(
        'Why GPT-4o-mini over open-source alternatives',
        'Llama 3.1 8B and Mistral 7B are tempting for cost reasons (no per-token fees), but they require self-hosting on a GPU instance ($300-800/month on RunPod or Modal), produce lower-quality structured output (JSON mode is less reliable), and add operational complexity. At projected Phase 2 volume (500 essays/month), GPT-4o-mini costs $0.50/month total - 600x cheaper than self-hosting. Self-hosting becomes viable only above 50K essays/month, which is a Phase 3+ concern.',
        accent_color=ACCENT,
    ))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 8: MONETIZATION & BILLING
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 8 - Deep-Dive #4: Monetization and Billing'))

    story.append(Paragraph(
        'The monetization system supports two customer segments (students and universities) and four student tiers plus two university tiers. The architecture is built around three principles: Stripe is the source of truth for billing state, the application mirrors Stripe state to Postgres via webhooks, and entitlements (feature flags) are decoupled from tier names so pricing experiments can run without schema migrations. This chapter specifies the tier structure, the entitlement model, the Stripe integration, the subscription state machine, dunning strategy, and the sponsor dashboard.',
        styles['style_body']))

    story.append(add_subsection('8.1 Tier Structure')[0])
    story.append(Paragraph(
        'Student tiers: Free (0/month, 1 essay review, basic comparison tool, 3 saved lists), Premium ($9.99/month, 2 essay reviews/month, unlimited saved lists, email alerts), Pro ($19.99/month, unlimited essay reviews with fair-use cap of 20, advisor call credits, priority support), VIP ($49.99/month, unlimited essay reviews, monthly 1:1 advisor call, early access to features). University tiers: Starter ($2,000/month, featured placement in directory, lead inbox with CSV export, basic analytics), Growth ($5,000/month, sponsor dashboard with funnel analytics, review sentiment monitoring, dedicated account manager, featured placement in comparison tool).',
        styles['style_body']))
    story.append(Spacer(1, 6))

    tier_rows = [
        ['Free', '$0', '1 essay/mo, 3 saved lists', 'Acquire users, demo value'],
        ['Premium', '$9.99/mo', '2 essays/mo, unlimited lists, alerts', 'Convert engaged free users'],
        ['Pro', '$19.99/mo', '20 essays/mo, advisor credits', 'Power users, transfer applicants'],
        ['VIP', '$49.99/mo', 'Unlimited, 1:1 advisor, early access', 'High-intent, high-budget applicants'],
        ['Starter', '$2,000/mo', 'Featured placement, lead inbox', 'Small universities, pilot'],
        ['Growth', '$5,000/mo', 'Sponsor dashboard, sentiment, AM', 'Established universities scaling'],
    ]
    story.append(make_table(
        ['Tier', 'Price', 'Key entitlements', 'Target customer'],
        tier_rows,
        col_ratios=[0.10, 0.12, 0.43, 0.35],
    ))
    story.append(Paragraph('Table 8.1 - Tier structure with pricing and target customer.', styles['style_caption']))

    story.append(add_subsection('8.2 Entitlements Model')[0])
    story.append(Paragraph(
        'Rather than gating features by tier name (e.g., "if user.tier == \'pro\' then allow unlimited essays"), the system gates features by entitlement flags stored on the user record. Each tier maps to a set of entitlements: ai_essay_reviews (int, monthly limit), saved_lists_limit (int), advisor_call_credits (int), sponsor_dashboard (bool), featured_placement (bool), sentiment_analytics (bool), etc. Tier-to-entitlement mapping is configured in code (not in the database), which means pricing experiments (e.g., "give Premium users 3 essays instead of 2 for the next 100 signups") require only a code change, not a schema migration. Entitlements are evaluated at request time by a single can(user, action) function that consults the user\'s entitlements.',
        styles['style_body']))

    story.append(add_subsection('8.3 Stripe Integration')[0])
    story.append(Paragraph(
        'Stripe Checkout handles new subscription creation - users are redirected to a Stripe-hosted payment page, eliminating PCI scope entirely. Stripe Customer Portal handles self-service management (upgrade, downgrade, cancel, update payment method) - again, no PCI scope. Stripe Webhooks are the source of truth for subscription state changes: checkout.session.completed, customer.subscription.updated, customer.subscription.deleted, invoice.payment_succeeded, invoice.payment_failed. Each webhook is handled by an idempotent endpoint (using Stripe\'s event ID for deduplication) that updates the Postgres mirror. A reconciler cron job runs hourly to catch any missed webhooks by diffing Stripe state against Postgres state.',
        styles['style_body']))

    story.append(Spacer(1, 10))
    story.append(embed_image('/home/z/my-project/scripts/assets/billing_lifecycle.png',
                             max_width=AVAILABLE_WIDTH,
                             max_height=AVAILABLE_HEIGHT * 0.60))
    story.append(Paragraph('Figure 8.1 - Stripe subscription lifecycle. State transitions driven by webhooks; Postgres mirrors Stripe.', styles['style_caption']))

    story.append(add_subsection('8.4 Dunning Strategy')[0])
    story.append(Paragraph(
        'When a payment fails (invoice.payment_failed webhook), the subscription transitions to past_due state. Stripe Smart Retries attempts 3 retries over 7 days (the schedule is configurable in the Stripe dashboard and tuned empirically based on retry success rates). Resend sends an email after each failure with a "Update payment method" link to the Customer Portal. If all retries fail, the subscription transitions to canceled - the user retains access until the end of the current billing period (grace period), after which the subscription transitions to expired and entitlements are revoked. Reactivation is possible within 30 days via the Customer Portal with a prorated charge for the remaining period. This dunning strategy is the industry standard for SaaS subscriptions and minimizes involuntary churn (users who want to pay but have expired cards).',
        styles['style_body']))

    story.append(add_subsection('8.5 Sponsor Dashboard')[0])
    story.append(Paragraph(
        'The Growth-tier sponsor dashboard surfaces four data views. Profile analytics: views over time, unique visitors, geographic distribution of viewers (country, city), top referrers (which comparison pages drove traffic). Lead inbox: contact requests from students with filtering by program interest, GPA range, country. Leads can be exported as CSV or pushed to the university\'s CRM via webhook. Review sentiment: aggregate sentiment of all reviews of the university, broken down by dimension (affordability, teaching, visa, safety), with trend lines. Featured placement analytics: impression share in the directory and comparison tool, click-through rate, position over time. The dashboard is read-only - sponsors cannot edit their university profile (that goes through the admin moderation queue).',
        styles['style_body']))

    story.append(callout(
        'Stripe Connect for advisor payouts',
        'Advisor bookings use Stripe Connect Express accounts. Each advisor creates a Connect account during onboarding (Stripe handles KYC). When a student books a call, the platform charges $50 to the student, takes 20% ($10) as platform fee, and routes $40 to the advisor\'s Connect account. Payouts to advisors are daily (Stripe default) or weekly (configurable). This avoids the platform touching the funds (reducing regulatory burden) and gives advisors a Stripe Dashboard to track their own earnings. Connect is added in Phase 2 alongside the advisor network.',
        accent_color=ACCENT_2,
    ))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 9: PAGE & ROUTE STRUCTURE
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 9 - Page and Route Structure'))

    story.append(Paragraph(
        'Phase 1 ships 13 routes plus their Arabic RTL mirrors. The rendering strategy for each route is chosen based on freshness requirements: static pages (home, about) use Static Site Generation (SSG); university directory and detail pages use Incremental Static Regeneration (ISR) with a 24-hour revalidation window and on-demand revalidation when admin edits; comparison and cost-calculator pages use React Server Components (RSC) with client-side state for interactivity; account and admin pages use server-side rendering (SSR) with authentication checks in middleware. The /ar/* mirror routes share all components with /en/* routes - the only difference is the locale and direction attribute on the html element, switched by next-intl middleware.',
        styles['style_body']))
    story.append(Spacer(1, 6))

    route_rows = [
        ['/', 'Home', 'SSG', 'Hero, search bar, featured universities, top countries'],
        ['/universities', 'Directory with filters', 'ISR 24h', 'Country, tuition, field, language, living cost filters'],
        ['/universities/[slug]', 'University detail', 'ISR 24h + on-demand', 'Programs, cost, reviews, scholarships'],
        ['/universities/compare', 'Side-by-side comparison', 'RSC + client state', 'Up to 5 universities, URL state, shareable'],
        ['/cost-calculator', 'Interactive cost tool', 'RSC + client state', 'Total cost in USD/JOD/AED with breakdown'],
        ['/scholarships', 'Scholarship index', 'ISR 24h', 'Browseable by country, field, deadline'],
        ['/reviews', 'Recent reviews feed', 'SSR', 'Latest 50 approved reviews, filterable'],
        ['/saved-lists', 'User bookmarks', 'SSR (auth)', 'CRUD lists, manage alerts, export PDF'],
        ['/login, /signup, /auth/callback', 'Auth flows', 'SSR', 'Email + Google OAuth + phone OTP'],
        ['/account', 'Profile and settings', 'SSR (auth)', 'Verification status, language toggle, billing'],
        ['/admin', 'Admin console', 'SSR (admin)', 'Moderation queue, university CRUD, audit log'],
        ['/ar/*', 'Arabic RTL mirror', 'Same as /en/*', 'Shared components, RTL via logical props'],
        ['/sitemap.xml', 'Sitemap', 'Generated', 'All universities + country pages, refreshed daily'],
    ]
    story.append(make_table(
        ['Route', 'Purpose', 'Rendering', 'Notes'],
        route_rows,
        col_ratios=[0.22, 0.20, 0.16, 0.42],
    ))
    story.append(Paragraph('Table 9.1 - Phase 1 routes with rendering strategy and purpose.', styles['style_caption']))

    story.append(add_subsection('9.1 SEO and Programmatic Pages')[0])
    story.append(Paragraph(
        'Directory sites live or die on long-tail organic search traffic. Three SEO strategies are baked into the route structure from day one. First, programmatic pages at /universities/[country]/[slug] create one indexable URL per university (target: 500-1,000 pages), each with structured data using schema.org/University and schema.org/EducationalOrganization. Second, country-level landing pages at /universities/[country] aggregate universities by country and target queries like "affordable universities in Germany for international students". Third, the sitemap.xml is regenerated daily via a Vercel Cron job and submitted to Google Search Console. All pages include Open Graph images (generated dynamically with the university logo and key stats) for social sharing.',
        styles['style_body']))
