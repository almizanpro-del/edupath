"""
Quality scoring for scraped university records.

Scores each record 0-100 based on data completeness:
  - tuitionUsd:      25 pts (most important — users filter on this)
  - livingCostUsd:   20 pts
  - descriptionEn:   15 pts
  - programs:        15 pts (at least 1 program)
  - website:         10 pts
  - logoUrl:          5 pts
  - descriptionAr:    5 pts
  - acceptanceRate:   5 pts

Total: 100 pts

Records scoring < 5/100 are auto-rejected.
Records scoring 5-30 are flagged for manual review.
Records scoring > 30 are auto-approved (if source is trusted).
"""

from typing import Optional

# Weights for each field
FIELD_WEIGHTS = {
    "tuitionUsd": 25,
    "livingCostUsd": 20,
    "descriptionEn": 15,
    "programs": 15,
    "website": 10,
    "logoUrl": 5,
    "descriptionAr": 5,
    "acceptanceRate": 5,
}

# Thresholds
AUTO_REJECT_THRESHOLD = 5
MANUAL_REVIEW_THRESHOLD = 30
AUTO_APPROVE_THRESHOLD = 60

# Minimum description length to count
MIN_DESCRIPTION_LENGTH = 50


def quality_score(record: dict) -> int:
    """
    Calculate a 0-100 quality score for a university record.

    Args:
      record: University dict with fields like tuitionUsd, livingCostUsd,
              descriptionEn, programs, website, etc.

    Returns:
      Integer score 0-100

    Example:
      >>> quality_score({"name": "Test", "tuitionUsd": 5000, "livingCostUsd": 6000})
      45
      >>> quality_score({"name": "Empty"})
      0
    """
    score = 0

    # tuitionUsd (25 pts) — must be > 0
    tuition = record.get("tuitionUsd", 0)
    if tuition and isinstance(tuition, (int, float)) and tuition > 0:
        score += FIELD_WEIGHTS["tuitionUsd"]

    # livingCostUsd (20 pts) — must be > 0
    living = record.get("livingCostUsd", 0)
    if living and isinstance(living, (int, float)) and living > 0:
        score += FIELD_WEIGHTS["livingCostUsd"]

    # descriptionEn (15 pts) — must be at least 50 chars
    desc_en = record.get("descriptionEn", "")
    if desc_en and isinstance(desc_en, str) and len(desc_en.strip()) >= MIN_DESCRIPTION_LENGTH:
        score += FIELD_WEIGHTS["descriptionEn"]

    # programs (15 pts) — must have at least 1 program
    programs = record.get("programs", [])
    if programs and isinstance(programs, list) and len(programs) >= 1:
        score += FIELD_WEIGHTS["programs"]

    # website (10 pts) — must be a non-empty string
    website = record.get("website", "")
    if website and isinstance(website, str) and website.startswith("http"):
        score += FIELD_WEIGHTS["website"]

    # logoUrl (5 pts)
    logo = record.get("logoUrl", "")
    if logo and isinstance(logo, str) and logo.startswith("http"):
        score += FIELD_WEIGHTS["logoUrl"]

    # descriptionAr (5 pts)
    desc_ar = record.get("descriptionAr", "")
    if desc_ar and isinstance(desc_ar, str) and len(desc_ar.strip()) >= MIN_DESCRIPTION_LENGTH:
        score += FIELD_WEIGHTS["descriptionAr"]

    # acceptanceRate (5 pts) — must be 0-100
    acceptance = record.get("acceptanceRate")
    if acceptance is not None and isinstance(acceptance, (int, float)) and 0 < acceptance <= 100:
        score += FIELD_WEIGHTS["acceptanceRate"]

    return min(score, 100)


def quality_breakdown(record: dict) -> dict:
    """
    Get a detailed breakdown of the quality score.

    Returns a dict with each field, its weight, whether it passed,
    and the points earned.

    Example:
      >>> quality_breakdown({"tuitionUsd": 5000})
      {'tuitionUsd': {'weight': 25, 'earned': 25, 'passed': True}, ...}
    """
    breakdown = {}
    for field, weight in FIELD_WEIGHTS.items():
        value = record.get(field)
        passed = _check_field(field, value)
        breakdown[field] = {
            "weight": weight,
            "earned": weight if passed else 0,
            "passed": passed,
        }
    return breakdown


def _check_field(field: str, value) -> bool:
    """Check if a single field passes quality criteria."""
    if field in ("tuitionUsd", "livingCostUsd"):
        return bool(value and isinstance(value, (int, float)) and value > 0)
    if field in ("descriptionEn", "descriptionAr"):
        return bool(value and isinstance(value, str) and len(value.strip()) >= MIN_DESCRIPTION_LENGTH)
    if field == "programs":
        return bool(value and isinstance(value, list) and len(value) >= 1)
    if field in ("website", "logoUrl"):
        return bool(value and isinstance(value, str) and value.startswith("http"))
    if field == "acceptanceRate":
        return value is not None and isinstance(value, (int, float)) and 0 < value <= 100
    return False


def get_status(score: int, source: str = "unknown") -> str:
    """
    Determine the review status based on quality score and source.

    Returns one of:
      - 'auto_rejected': score < 5
      - 'manual_review': score 5-30, or any score from untrusted source
      - 'auto_approved': score > 60 from a trusted source

    Trusted sources: 'openalex', 'wikipedia', 'curated'
    Untrusted sources: everything else
    """
    if score < AUTO_REJECT_THRESHOLD:
        return "auto_rejected"

    trusted_sources = {"openalex", "wikipedia", "curated"}
    if source not in trusted_sources:
        return "manual_review"

    if score >= AUTO_APPROVE_THRESHOLD:
        return "auto_approved"

    return "manual_review"
