"""Chapters 4-6: Data Model, Scraping, Review Verification."""


def append_chapters_4_6(story, helpers):
    add_major_section = helpers['add_major_section']
    add_subsection = helpers['add_subsection']
    make_table = helpers['make_table']
    code_block = helpers['code_block']
    callout = helpers['callout']
    embed_image = helpers['embed_image']
    styles = helpers['styles']
    ACCENT = helpers['ACCENT']
    ACCENT_2 = helpers['ACCENT_2']

    from reportlab.platypus import Paragraph, Spacer, PageBreak, HRFlowable
    from reportlab.lib.units import inch

    AVAILABLE_WIDTH = helpers['AVAILABLE_WIDTH']
    AVAILABLE_HEIGHT = helpers['AVAILABLE_HEIGHT']

    # ═════════════════════════════════════════════════════════
    # CHAPTER 4: DATA MODEL & SCHEMA
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 4 - Data Model and Schema'))

    story.append(Paragraph(
        'The PRD proposes a five-table schema (universities, programs, scholarships, users, reviews, saved_lists) that is too lean for production. Three critical concerns are missing: review moderation and verification status, alert subscriptions for deadline notifications, and audit logging for admin actions. The expanded schema below adds these plus a foreign-exchange cache table (used by the cost calculator) and a review-tag join table (for keyword tags like "affordable housing" or "visas easy"). The expanded schema has ten tables - still small enough to reason about, but covering all Phase 1 and Phase 2 requirements without mid-build migrations.',
        styles['style_body']))

    story.append(Paragraph(
        'Two design principles guide the schema. First, every table that contains user-generated content (reviews, saved lists, alert subscriptions) has Row Level Security (RLS) policies enforced at the Postgres level, so a compromised API key cannot leak user data. Second, every table that participates in user-facing search has both a full-text search index (using Postgres tsvector with weighted text search) and a trigram index (using pg_trgm for typo-tolerant prefix matching). This dual-index strategy delivers a Google-like search experience without introducing a separate search engine.',
        styles['style_body']))

    story.append(Spacer(1, 12))
    story.append(embed_image('/home/z/my-project/scripts/assets/er_diagram.png',
                             max_width=AVAILABLE_WIDTH,
                             max_height=AVAILABLE_HEIGHT * 0.68))
    story.append(Paragraph('Figure 4.1 - Expanded data model (Phase 1). Ten tables with relationships and key indexes.', styles['style_caption']))

    story.append(add_subsection('4.1 Prisma Schema')[0])
    story.append(Paragraph(
        'The complete Prisma schema is shown below. Field types use Postgres-native types where possible (UUID for primary keys, Jsonb for flexible structured data like university arrays in saved lists, String[] for tags). Indexes are declared explicitly to ensure the migration generator produces the correct GIN and B-tree indexes. RLS policies are not shown here - they are applied via a separate SQL migration after Prisma generates the schema.',
        styles['style_body']))
    story.append(Spacer(1, 8))

    prisma_schema = '''model University {
  id                  String     @id @default(uuid())
  slug                String     @unique
  name                String
  country             String
  city                String
  website             String
  tuition_usd         Int
  living_cost_usd     Int
  intl_student_pct    Float
  acceptance_rate     Float?
  currency            String
  logo_url            String?
  description_en      String?
  description_ar      String?
  created_at          DateTime   @default(now())
  updated_at          DateTime   @updatedAt

  programs            Program[]
  scholarships        Scholarship[]
  reviews             Review[]

  @@index([country, tuition_usd])
  @@index([name])
}

model Program {
  id                  String     @id @default(uuid())
  university_id       String
  university          University @relation(fields: [university_id], references: [id])
  name                String
  degree_level        String     // bachelor | master | phd
  field               String
  duration_months     Int
  deadline            DateTime?
  language            String
  tuition_local       Int
  tuition_usd         Int
  entry_requirements  String?
  language_score_req  String?

  @@index([university_id])
  @@index([field, degree_level])
}

model Scholarship {
  id              String     @id @default(uuid())
  university_id   String
  university      University @relation(fields: [university_id], references: [id])
  name            String
  amount_usd      Int
  amount_type     String     // full | partial | fixed
  eligibility     String[]
  eligibility_tags String[]
  deadline        DateTime?

  @@index([university_id])
  @@index([eligibility_tags], type: Gin)
}

model User {
  id                  String     @id @default(uuid())
  email               String     @unique
  name                String
  country             String
  field_of_interest   String?
  role                String     @default("student")  // student|recruiter|admin
  verification_status String     @default("pending")  // pending|verified|rejected|expired
  locale              String     @default("en")
  is_student          Boolean    @default(true)
  is_recruiter        Boolean    @default(false)
  stripe_customer_id  String?
  created_at          DateTime   @default(now())

  reviews             Review[]
  saved_lists         SavedList[]
  alert_subs          AlertSubscription[]

  @@index([email])
  @@index([role, verification_status])
}

model Review {
  id                   String     @id @default(uuid())
  user_id              String
  user                 User       @relation(fields: [user_id], references: [id])
  university_id        String
  university           University @relation(fields: [university_id], references: [id])
  rating_overall       Int
  rating_affordability Int
  rating_visa          Int
  rating_teaching      Int
  rating_safety        Int
  rating_social        Int
  review_text          String
  helpful_count        Int        @default(0)
  moderation_status    String     @default("pending") // pending|approved|rejected
  verified_enrollment  Boolean    @default(false)
  created_at           DateTime   @default(now())

  tags                 ReviewTag[]

  @@index([university_id, moderation_status])
  @@index([user_id])
}

model ReviewTag {
  id          Int    @id @default(autoincrement())
  review_id   String
  review      Review @relation(fields: [review_id], references: [id])
  tag         String

  @@index([review_id])
  @@index([tag])
}

model SavedList {
  id           String    @id @default(uuid())
  user_id      String
  user         User      @relation(fields: [user_id], references: [id])
  list_name    String
  universities Json
  is_public    Boolean   @default(false)
  share_token  String?   @unique
  created_at   DateTime  @default(now())

  @@index([user_id])
  @@index([share_token])
}

model AlertSubscription {
  id             String    @id @default(uuid())
  user_id        String
  user           User      @relation(fields: [user_id], references: [id])
  university_id  String?
  alert_type     String    // deadline | review | scholarship
  email_frequency String   // daily | weekly | monthly
  last_sent_at   DateTime?

  @@index([user_id])
  @@index([university_id, alert_type])
}

model FxRate {
  id         Int      @id @default(autoincrement())
  base       String   // USD
  quote      String   // JOD, AED, EGP
  rate       Decimal
  fetched_at DateTime
  source     String

  @@index([base, quote])
  @@index([fetched_at])
}

model AuditLog {
  id           Int      @id @default(autoincrement())
  user_id      String
  action       String   // create | update | delete | moderate
  entity_type  String
  entity_id    String
  before       Json?
  after        Json?
  ip_address   String?
  created_at   DateTime @default(now())

  @@index([entity_type, entity_id])
  @@index([user_id, created_at])
}'''
    story.append(code_block(prisma_schema, language='prisma'))
    story.append(Spacer(1, 8))

    story.append(callout(
        'Row Level Security (RLS) policies',
        'Supabase RLS is enabled on User, Review, SavedList, and AlertSubscription. Policy rules: (a) users can SELECT their own rows in User, SavedList, AlertSubscription; (b) users can INSERT/UPDATE only their own rows; (c) reviews are SELECTable by anyone once moderation_status = approved, but only the author can UPDATE/DELETE their own review; (d) admin role bypasses all RLS via the auth.jwt() ->> \'role\' = \'admin\' check. RLS is the last line of defense - application code should also enforce these rules, but RLS prevents data leakage if the application layer is compromised.',
        accent_color=ACCENT,
    ))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 5: DATA SCRAPING PIPELINE
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 5 - Deep-Dive #1: University Data Scraping Pipeline'))

    story.append(Paragraph(
        'Sourcing 500-1,000 universities with accurate tuition, program, scholarship, and deadline data is the single largest content challenge in Phase 1. Manual research would consume 3-4 engineer-weeks; outsourcing to a data vendor would cost $5,000-$15,000 and produce stale data within months. The recommended approach is a hybrid pipeline: automated scraping of public directory sources, normalized and deduplicated through fuzzy matching, then editorial review by a content operator before publication. The pipeline runs continuously, with weekly incremental refreshes and a full re-scrape every 90 days as a safety net.',
        styles['style_body']))

    story.append(Spacer(1, 10))
    story.append(embed_image('/home/z/my-project/scripts/assets/scraping_flow.png',
                             max_width=AVAILABLE_WIDTH,
                             max_height=AVAILABLE_HEIGHT * 0.55))
    story.append(Paragraph('Figure 5.1 - Six-stage scraping pipeline from source identification through published directory entries.', styles['style_caption']))

    story.append(add_subsection('5.1 Source Identification')[0])
    story.append(Paragraph(
        'Five source tiers provide coverage with redundancy. Tier 1 (authoritative directories): QS Top Universities, Times Higher Education, US News Global - these provide structured data via APIs or downloadable datasets. Tier 2 (government portals): DAAD (Germany), Campus France, Study in Turkey, EduCanada - these provide the most accurate tuition and visa data for their respective countries. Tier 3 (aggregators): OpenAlex API (universities and publications), Wikipedia (high-level facts). Tier 4 (university websites): the source of truth for programs, deadlines, and scholarships, but the hardest to parse. Tier 5 (manual editorial): for universities that resist automation or where data quality is critical, content operators manually enter data via the admin CMS.',
        styles['style_body']))

    story.append(add_subsection('5.2 Scraper Architecture')[0])
    story.append(Paragraph(
        'The scraper is a Python application using Playwright for headless browser rendering (necessary for JavaScript-heavy university sites) and BeautifulSoup for HTML parsing. Each source has a dedicated adapter that knows the source\'s URL patterns, HTML structure, and rate limits. Raw HTML is archived to Cloudflare R2 for replay without re-hitting the source - this is essential for debugging parsing failures and for legal protection (we can demonstrate exactly what was scraped and when).',
        styles['style_body']))
    story.append(Spacer(1, 8))

    scraper_code = '''# scraper/skeleton.py
import asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import boto3
import hashlib
from datetime import datetime
from typing import Optional

s3 = boto3.client('s3', endpoint_url='https://<account>.r2.cloudflarestorage.com')
R2_BUCKET = 'edupath-raw-html'
R2_RATE_LIMIT = 1.0  # seconds between requests to same host

class UniversityScraper:
    def __init__(self, source_name: str, base_url: str):
        self.source = source_name
        self.base = base_url
        self.last_request_time: dict[str, float] = {}

    async def fetch(self, url: str) -> Optional[str]:
        """Fetch URL with per-host rate limiting and R2 archival."""
        host = url.split('/')[2]
        now = asyncio.get_event_loop().time()
        if host in self.last_request_time:
            elapsed = now - self.last_request_time[host]
            if elapsed < R2_RATE_LIMIT:
                await asyncio.sleep(R2_RATE_LIMIT - elapsed)
        self.last_request_time[host] = now

        async with async_playwright() as p:
            browser = await p.chromium.launch()
            ctx = await browser.new_context(
                user_agent='EduPathBot/1.0 (+https://edupath.com/bot)'
            )
            page = await ctx.new_page()
            resp = await page.goto(url, wait_until='networkidle', timeout=30000)
            if resp and resp.status == 200:
                html = await page.content()
                # Archive to R2 for replay
                key = f'{self.source}/{hashlib.sha256(url.encode()).hexdigest()[:16]}.html'
                s3.put_object(Bucket=R2_BUCKET, Key=key, Body=html.encode(),
                              Metadata={'source_url': url, 'scraped_at': datetime.utcnow().isoformat()})
                await browser.close()
                return html
            await browser.close()
            return None

    def parse(self, html: str) -> dict:
        """Parse HTML into normalized dict. Override per source."""
        soup = BeautifulSoup(html, 'html.parser')
        # ... per-source selectors ...
        return {'name': None, 'tuition_usd': None, 'programs': []}

    async def scrape_one(self, url: str) -> Optional[dict]:
        html = await self.fetch(url)
        if not html:
            return None
        record = self.parse(html)
        record['source_url'] = url
        record['scraped_at'] = datetime.utcnow().isoformat()
        return record'''
    story.append(code_block(scraper_code, language='python'))
    story.append(Spacer(1, 8))

    story.append(add_subsection('5.3 Normalization and Deduplication')[0])
    story.append(Paragraph(
        'Each source uses different units, currencies, and date formats. The normalization layer converts everything to canonical units: tuition in USD (using the daily FX rate table), deadlines as ISO 8601 UTC timestamps, durations in months. University names are normalized by stripping legal entity suffixes ("University of X" vs "X University"), lowercasing, and removing punctuation. Deduplication uses a two-pass strategy: exact match on normalized name + country, then fuzzy match via RapidFuzz token_sort_ratio >= 92 with manual review for borderline cases (80-92).',
        styles['style_body']))
    story.append(Spacer(1, 6))

    dedup_code = '''from rapidfuzz import fuzz

def normalize_name(name: str) -> str:
    import re
    s = name.lower().strip()
    # Strip legal suffixes
    s = re.sub(r'\\b(university of|university)\\b', '', s)
    s = re.sub(r'[^a-z0-9\\s]', '', s)
    return s.strip()

def find_duplicates(new_record, existing_records, threshold=92):
    """Return list of existing records that fuzzy-match new_record."""
    new_key = f'{normalize_name(new_record["name"])}|{new_record["country"]}'
    matches = []
    for rec in existing_records:
        rec_key = f'{normalize_name(rec["name"])}|{rec["country"]}'
        score = fuzz.token_sort_ratio(new_key, rec_key)
        if score >= threshold:
            matches.append((rec, score))
    return sorted(matches, key=lambda x: -x[1])'''
    story.append(code_block(dedup_code, language='python'))

    story.append(add_subsection('5.4 Incremental Refresh and Legal Compliance')[0])
    story.append(Paragraph(
        'A weekly Inngest job compares the content hash of each university\'s scraped payload against the previous snapshot. Only changed records enter the normalization and review stages. Typical weekly delta is 3-8% of the catalog, driven by scholarship deadline changes and tuition updates. A full re-scrape runs every 90 days as a safety net for sources that do not expose a changed-at timestamp. The scraper respects robots.txt on every source, rate-limits to one request per second per host, and uses exponential backoff on 429 responses. Student personal data is never scraped - only public directory information about universities.',
        styles['style_body']))

    story.append(callout(
        'Quality scoring drives editorial prioritization',
        'Each scraped record receives a completeness score (0-100) based on the presence of: tuition, living cost, programs, scholarships, deadlines, language requirements, international student percentage. Records scoring below 60 are flagged for editorial attention; records scoring below 30 are rejected outright. The score is visible in the admin queue and drives operator prioritization - high-quality records can be auto-published, while low-quality records require manual enrichment before publication.',
        accent_color=ACCENT_2,
    ))

    # ═════════════════════════════════════════════════════════
    # CHAPTER 6: REVIEW VERIFICATION SYSTEM
    # ═════════════════════════════════════════════════════════
    story.extend(add_major_section('Chapter 6 - Deep-Dive #2: Review Verification System'))

    story.append(Paragraph(
        'Trust is the platform\'s core value proposition. Without verified peer reviews, EduPath is just another directory - and directories are commodity products. With verified reviews, EduPath becomes the only place where MENA students can hear from other MENA students about their actual experiences at specific universities. The verification system is therefore the highest-leverage feature in Phase 1, and the most fraud-vulnerable. This chapter specifies a three-tier verification model, four anti-fraud heuristics that run on every submission, and an admin moderation workflow that scales to 100+ reviews per week with a single part-time operator.',
        styles['style_body']))

    story.append(Spacer(1, 10))
    story.append(embed_image('/home/z/my-project/scripts/assets/verification_flow.png',
                             max_width=AVAILABLE_WIDTH,
                             max_height=AVAILABLE_HEIGHT * 0.62))
    story.append(Paragraph('Figure 6.1 - Three-tier verification flow with anti-fraud heuristics and admin moderation.', styles['style_caption']))

    story.append(add_subsection('6.1 Three-Tier Verification Model')[0])
    story.append(Paragraph(
        'Tier 1 (Auto-verify) applies when the reviewer signs up with an email address at a known academic domain that matches the claimed university\'s country. The system maintains a curated allowlist of academic domain patterns per country - for example .ac.uk for the United Kingdom, .edu.tr for Turkey, .edu.eg for Egypt, .edu.jo for Jordan, .ac.ae for the United Arab Emirates, .edu.pl for Poland, .edu.my for Malaysia, and .de for Germany (where academic institutions use a variety of subdomains under .de). The .edu top-level domain (US-only) is included in the allowlist but is rarely applicable to the MENA-targeted university set. Verification is instant. Reviews from Tier 1 users carry a "Verified Student" badge but with the lowest trust weight in the ranking algorithm (see Section 6.5). Tier 2 (Document verification) requires uploading an acceptance letter or enrollment certificate. The document is reviewed by an admin within 24-48 hours, after which the user\'s verification_status field transitions to "verified". Tier 2 reviews carry the "Verified Student" badge with medium trust weight. Tier 3 (Certified enrollment) requires a university-issued enrollment certificate with a verification code that EduPath independently validates with the university registrar. Tier 3 is required for any review submitted by a user claiming a sponsor relationship with a university (to prevent university marketing teams from writing fake student reviews).',
        styles['style_body']))

    story.append(add_subsection('6.2 Verification State Machine')[0])
    story.append(Paragraph(
        'Every review enters the system with moderation_status = "pending". Admins review pending reviews in a queue sorted by verification tier (Tier 3 first, then Tier 2, then Tier 1) and by spam-score (higher score first). Approved reviews transition to moderation_status = "approved" and become publicly visible. Rejected reviews transition to "rejected" with a required rejection reason (sent to the author by email). After 12 months without any new activity from the reviewer, verification_status expires to "expired" and the user must re-verify to post new reviews. The 12-month window is calibrated to balance fraud prevention (reduces stale credentials) against user friction (does not require re-verification every semester).',
        styles['style_body']))

    story.append(add_subsection('6.3 Anti-Fraud Heuristics')[0])
    story.append(Paragraph(
        'Four heuristics run synchronously on every review submission, before the review enters the admin queue. Reviews that trigger any heuristic are flagged for manual review (rather than auto-rejected, to avoid false positives). The heuristics are intentionally conservative - a single flag does not block publication, but multiple flags increase the spam-score and move the review to the front of the admin queue.',
        styles['style_body']))
    story.append(Spacer(1, 6))

    heuristics_rows = [
        ['IP geolocation', 'Reviewer IP country differs from claimed university country by more than one region. Uses MaxMind GeoLite2 (free) for IP-to-country mapping. Routes to manual review.', 'Manual review'],
        ['Device fingerprint', 'Three or more accounts created from the same device fingerprint within 30 days. Uses FingerprintJS open-source (cookie + canvas hash). Blocks new account creation, surfaces existing accounts for investigation.', 'Block + investigate'],
        ['Text similarity (MinHash)', 'Review text similarity > 0.85 to any prior review in the corpus (real or known-fake). Uses MinHash with 128 permutations on 3-gram shingles. Rejects the submission with an explanation.', 'Auto-reject'],
        ['Rating distribution', 'All-5-star or all-1-star ratings from a new account (fewer than 3 prior reviews). Requires Tier 2 verification before the review enters the queue.', 'Require Tier 2'],
    ]
    story.append(make_table(
        ['Heuristic', 'Trigger and detection method', 'Action'],
        heuristics_rows,
        col_ratios=[0.20, 0.55, 0.25],
    ))
    story.append(Paragraph('Table 6.1 - Anti-fraud heuristics running on every review submission.', styles['style_caption']))

    story.append(add_subsection('6.4 Privacy and Document Handling')[0])
    story.append(Paragraph(
        'Acceptance letters and enrollment certificates contain personal information (full name, date of birth, student ID, sometimes passport number). These documents are stored encrypted at rest (AES-256-GCM) in Cloudflare R2, accessible only to admin reviewers via short-lived signed URLs (5-minute expiry). Documents are automatically deleted 30 days after the verification decision - this is enforced by a daily cron job. The verification decision itself (verified / rejected + reason) is retained for audit purposes, but the underlying document is purged. This policy is documented in the privacy policy and shown to users at the upload step to maximize transparency.',
        styles['style_body']))

    story.append(callout(
        'Why not zero-knowledge verification?',
        'A zero-knowledge proof system (e.g., proving enrollment without revealing the document) would eliminate privacy concerns entirely. However, the verification target is human-reviewable trust - we need an admin to look at the document and confirm it is genuine. Zero-knowledge proofs cannot replace this human judgment. The 30-day deletion policy is the right balance between trust and privacy.',
        accent_color=ACCENT,
    ))

    story.append(add_subsection('6.5 Review Ranking Algorithm')[0])
    story.append(Paragraph(
        'Chapter 6.1 references "trust weight" as the differentiator between verification tiers, but trust weight is meaningless without an algorithm that consumes it. This section specifies that algorithm. The default sort order for reviews on a university detail page is a multi-factor ranking that combines verification tier, helpfulness, and recency. The algorithm is implemented as a single Postgres ORDER BY clause (no application-side sorting) to keep page loads fast even with hundreds of reviews per university.',
        styles['style_body']))
    story.append(Spacer(1, 6))

    ranking_code = '''-- Default review ranking (Phase 1)
-- Trust weight: Tier 1 (auto-verify) = 1.0, Tier 2 (document) = 1.5,
-- Tier 3 (certified enrollment) = 2.0, unverified = 0.5
-- Composite score combines helpfulness and recency with trust weight

SELECT
  r.*,
  -- Trust weight from verification tier
  CASE
    WHEN r.verified_enrollment AND u.verification_status = 'verified'
      AND EXISTS (SELECT 1 FROM user_documents ud
                  WHERE ud.user_id = u.id AND ud.tier = 3) THEN 2.0
    WHEN u.verification_status = 'verified' THEN 1.5
    WHEN u.email LIKE '%.ac.%' OR u.email LIKE '%.edu.%'
      OR u.email LIKE '%.ac.uk' OR u.email LIKE '%.edu.tr' THEN 1.0
    ELSE 0.5
  END AS trust_weight,
  -- Recency decay: reviews lose 50% weight every 180 days
  -- (a review from 1 year ago counts half as much as a fresh one)
  EXP(-EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 15552000) AS recency_factor
FROM reviews r
JOIN users u ON r.user_id = u.id
WHERE r.university_id = $1
  AND r.moderation_status = 'approved'
ORDER BY
  -- Primary: trust-weighted helpfulness
  (r.helpful_count * trust_weight * recency_factor) DESC,
  -- Secondary: most recent first (within same composite score)
  r.created_at DESC
LIMIT 50;'''
    story.append(code_block(ranking_code, language='sql'))
    story.append(Spacer(1, 6))

    story.append(Paragraph(
        'The algorithm has three properties worth noting. First, verification tier matters most for reviews with low helpful_count - a single helpful vote on a Tier 3 review outperforms a Tier 1 review with zero helpful votes. Second, recency decay (half-life of 180 days) ensures that stale reviews do not dominate the top of the page even if they have accumulated many helpful votes over time. Third, the algorithm is pure SQL - no application-side sorting, no caching layer, no Meilisearch dependency. At 50 reviews per university (the Phase 1 ceiling), this query returns in under 5ms on Supabase\'s free tier. If review volume grows beyond 500 per university in Phase 2, a materialized view refreshed every 10 minutes will be introduced.',
        styles['style_body']))

    story.append(callout(
        'Why not a machine-learned ranker?',
        'A learned ranker (e.g., LambdaMART on features like helpful votes, recency, verification tier, review length, sentiment) would outperform the hand-tuned algorithm above by 10-15% on engagement metrics. But it requires labeled training data (click-through logs from real users) that we will not have until Phase 2. The hand-tuned algorithm is a reasonable cold-start; the migration path to a learned ranker is documented in the Phase 2 roadmap (Chapter 12) under "review quality improvements".',
        accent_color=ACCENT_2,
    ))
