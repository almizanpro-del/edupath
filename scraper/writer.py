"""
Output writer for scraped university data.

Writes scraped records to a JSON file that can be imported into the
EduPath database via scripts/scraper/import-scraped.ts.

In production, this could be replaced with a direct Prisma/Supabase
upsert, but the JSON intermediate format allows for manual review
before importing.
"""

import json
import time
from pathlib import Path
from typing import Optional

from .normalize import slugify
from .quality import quality_score, quality_breakdown, get_status


def write_output(
    universities: list[dict],
    output_path: Path,
    source: str = "unknown",
) -> dict:
    """
    Write scraped universities to a JSON file with quality scores.

    Each record gets:
      - slug (generated from name)
      - qualityScore (0-100)
      - qualityBreakdown (per-field breakdown)
      - status (auto_approved / manual_review / auto_rejected)
      - scrapedAt (ISO timestamp)

    Args:
      universities: List of university dicts
      output_path: Path to write the JSON file
      source: Data source name (affects status calculation)

    Returns:
      Summary dict with counts: total, auto_approved, manual_review, auto_rejected
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    scored: list[dict] = []
    counts = {"auto_approved": 0, "manual_review": 0, "auto_rejected": 0, "total": 0}

    for uni in universities:
        # Ensure slug exists
        if not uni.get("slug"):
            uni["slug"] = slugify(uni.get("name", ""))

        # Calculate quality
        score = quality_score(uni)
        breakdown = quality_breakdown(uni)
        status = get_status(score, source)

        uni["qualityScore"] = score
        uni["qualityBreakdown"] = breakdown
        uni["status"] = status
        uni["scrapedAt"] = timestamp
        uni["source"] = uni.get("source", source)

        counts[status] = counts.get(status, 0) + 1
        counts["total"] += 1

        scored.append(uni)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(scored, f, indent=2, ensure_ascii=False)

    return counts


def filter_by_status(universities: list[dict], status: str) -> list[dict]:
    """Filter universities by quality status."""
    return [u for u in universities if u.get("status") == status]


def print_summary(counts: dict, output_path: Path) -> None:
    """Print a human-readable summary of the scraping results."""
    print(f"\n{'=' * 60}")
    print(f"Scraping Complete")
    print(f"{'=' * 60}")
    print(f"  Total records:      {counts.get('total', 0)}")
    print(f"  Auto-approved:      {counts.get('auto_approved', 0)}")
    print(f"  Manual review:      {counts.get('manual_review', 0)}")
    print(f"  Auto-rejected:      {counts.get('auto_rejected', 0)}")
    print(f"  Output:             {output_path}")
    print(f"{'=' * 60}\n")
