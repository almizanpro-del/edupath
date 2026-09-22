"""
CLI orchestrator for the EduPath scraper pipeline.

Usage:
  # Dry run — fetch from OpenAlex but don't write output
  python -m scraper.pipeline --source openalex --countries Jordan,Egypt --dry-run

  # Live run — fetch from Wikipedia and write output
  python -m scraper.pipeline --source wikipedia --limit 50

  # Fetch from all sources
  python -m scraper.pipeline --source all --countries all

  # Run tests
  python -m pytest scraper/tests/ -v
"""

import argparse
import sys
from pathlib import Path

from .adapters.openalex import OpenAlexAdapter
from .adapters.wikipedia import WikipediaAdapter
from .normalize import deduplicate
from .writer import write_output, print_summary


# Default output path (matches existing scraper location)
OUTPUT_PATH = Path(__file__).parent.parent / "scripts" / "scraper" / "output" / "scraped-universities.json"

# Curated list of target universities (from existing scraper.py)
# These are universities we want to ensure are in the database,
# even if they're not in OpenAlex.
CURATED_UNIVERSITIES = [
    {"name": "University of Greenwich", "country": "United Kingdom", "city": "London"},
    {"name": "London South Bank University", "country": "United Kingdom", "city": "London"},
    {"name": "University of East London", "country": "United Kingdom", "city": "London"},
    {"name": "Sheffield Hallam University", "country": "United Kingdom", "city": "Sheffield"},
    {"name": "Leeds Beckett University", "country": "United Kingdom", "city": "Leeds"},
    {"name": "Manchester Metropolitan University", "country": "United Kingdom", "city": "Manchester"},
    {"name": "Liverpool John Moores University", "country": "United Kingdom", "city": "Liverpool"},
    {"name": "University of Central Lancashire", "country": "United Kingdom", "city": "Preston"},
    {"name": "University of the West of England", "country": "United Kingdom", "city": "Bristol"},
    {"name": "Oxford Brookes University", "country": "United Kingdom", "city": "Oxford"},
    {"name": "University of Cologne", "country": "Germany", "city": "Cologne"},
    {"name": "Goethe University Frankfurt", "country": "Germany", "city": "Frankfurt"},
    {"name": "University of Bonn", "country": "Germany", "city": "Bonn"},
    {"name": "TU Dortmund", "country": "Germany", "city": "Dortmund"},
    {"name": "University of Mannheim", "country": "Germany", "city": "Mannheim"},
    {"name": "Ege University", "country": "Turkey", "city": "Izmir"},
    {"name": "Dokuz Eylul University", "country": "Turkey", "city": "Izmir"},
    {"name": "Gazi University", "country": "Turkey", "city": "Ankara"},
    {"name": "Marmara University", "country": "Turkey", "city": "Istanbul"},
    {"name": "Anadolu University", "country": "Turkey", "city": "Eskisehir"},
    {"name": "Wroclaw University of Technology", "country": "Poland", "city": "Wroclaw"},
    {"name": "Gdansk University of Technology", "country": "Poland", "city": "Gdansk"},
    {"name": "Poznan University of Technology", "country": "Poland", "city": "Poznan"},
    {"name": "Universiti Putra Malaysia", "country": "Malaysia", "city": "Serdang"},
    {"name": "Universiti Utara Malaysia", "country": "Malaysia", "city": "Sintok"},
    {"name": "Sunway University", "country": "Malaysia", "city": "Subang Jaya"},
    {"name": "Helwan University", "country": "Egypt", "city": "Cairo"},
    {"name": "Ain Shams University", "country": "Egypt", "city": "Cairo"},
    {"name": "Mansoura University", "country": "Egypt", "city": "Mansoura"},
    {"name": "Philadelphia University", "country": "Jordan", "city": "Amman"},
    {"name": "Applied Science University", "country": "Jordan", "city": "Al Jubaiha"},
    {"name": "Yarmouk University", "country": "Jordan", "city": "Irbid"},
    {"name": "Hashemite University", "country": "Jordan", "city": "Zarqa"},
    {"name": "Abu Dhabi University", "country": "United Arab Emirates", "city": "Abu Dhabi"},
    {"name": "Ajman University", "country": "United Arab Emirates", "city": "Ajman"},
    {"name": "Lebanese University", "country": "Lebanon", "city": "Beirut"},
    {"name": "Lithuanian University of Health Sciences", "country": "Lithuania", "city": "Kaunas"},
    {"name": "ISM University of Management and Economics", "country": "Lithuania", "city": "Vilnius"},
]


def fetch_curated(countries: list[str] | None = None) -> list[dict]:
    """Fetch from the curated list, optionally filtered by country."""
    if not countries or "all" in [c.lower() for c in countries]:
        return [{"source": "curated", **u} for u in CURATED_UNIVERSITIES]
    return [
        {"source": "curated", **u}
        for u in CURATED_UNIVERSITIES
        if any(c.lower() in u["country"].lower() for c in countries)
    ]


def run_pipeline(
    source: str = "all",
    countries: list[str] | None = None,
    limit: int | None = None,
    dry_run: bool = False,
    output_path: Path = OUTPUT_PATH,
) -> dict:
    """
    Run the full scraper pipeline.

    Args:
      source: 'openalex', 'wikipedia', 'curated', or 'all'
      countries: List of country names (or None for all)
      limit: Max records per source
      dry_run: If True, don't write output file
      output_path: Where to write the JSON output

    Returns:
      Summary dict with counts
    """
    all_records: list[dict] = []
    source_lower = source.lower()

    # Normalize 'countries' — None means all
    if countries and "all" in [c.lower() for c in countries]:
        countries = None

    # 1. Curated list (always include — these are our target universities)
    if source_lower in ("curated", "all"):
        print(f"[1/3] Fetching curated list...")
        curated = fetch_curated(countries)
        print(f"  Found {len(curated)} curated universities")
        all_records.extend(curated)

    # 2. OpenAlex (for bulk data)
    if source_lower in ("openalex", "all"):
        print(f"[2/3] Fetching from OpenAlex...")
        try:
            adapter = OpenAlexAdapter()
            openalex_records = adapter.fetch_universities(countries, limit)
            print(f"  Found {len(openalex_records)} universities from OpenAlex")
            all_records.extend(openalex_records)
        except Exception as e:
            print(f"  [OpenAlex] Error: {e}")

    # 3. Wikipedia enrichment (fills in descriptions/logos for curated)
    if source_lower in ("wikipedia", "all"):
        print(f"[3/3] Enriching with Wikipedia data...")
        wiki_adapter = WikipediaAdapter()
        # Only enrich records that are missing descriptions
        to_enrich = [r for r in all_records if not r.get("descriptionEn")]
        if to_enrich:
            print(f"  Enriching {len(to_enrich)} records...")
            enriched = wiki_adapter.enrich_batch(to_enrich)
            # Merge back
            for i, r in enumerate(all_records):
                if not r.get("descriptionEn"):
                    # Find matching enriched record
                    for e in enriched:
                        if e.get("name") == r.get("name"):
                            r.update(e)
                            break
        else:
            print(f"  All records already have descriptions")

    # Deduplicate
    print(f"\nDeduplicating {len(all_records)} records...")
    unique, duplicates = deduplicate(all_records)
    if duplicates:
        print(f"  Removed {len(duplicates)} duplicates")

    # Score + write
    if dry_run:
        print(f"\n[DRY RUN] Would write {len(unique)} records to {output_path}")
        from .quality import quality_score
        scores = [quality_score(u) for u in unique]
        avg_score = sum(scores) / len(scores) if scores else 0
        print(f"  Average quality score: {avg_score:.1f}/100")
        return {
            "total": len(unique),
            "duplicates_removed": len(duplicates),
            "avg_quality": avg_score,
        }

    counts = write_output(unique, output_path, source=source_lower)
    counts["duplicates_removed"] = len(duplicates)
    print_summary(counts, output_path)
    return counts


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="EduPath University Data Scraper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scraper.pipeline --source openalex --countries Jordan,Egypt --dry-run
  python -m scraper.pipeline --source wikipedia --limit 50
  python -m scraper.pipeline --source all --countries all
        """,
    )
    parser.add_argument(
        "--source",
        choices=["openalex", "wikipedia", "curated", "all"],
        default="all",
        help="Data source to fetch from (default: all)",
    )
    parser.add_argument(
        "--countries",
        type=str,
        default="all",
        help="Comma-separated country names (default: all)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Max records per source",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Don't write output file, just print summary",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=str(OUTPUT_PATH),
        help=f"Output JSON path (default: {OUTPUT_PATH})",
    )

    args = parser.parse_args()
    countries = [c.strip() for c in args.countries.split(",")] if args.countries != "all" else None

    counts = run_pipeline(
        source=args.source,
        countries=countries,
        limit=args.limit,
        dry_run=args.dry_run,
        output_path=Path(args.output),
    )

    # Exit code: 0 if at least 1 record, 1 otherwise
    sys.exit(0 if counts.get("total", 0) > 0 else 1)


if __name__ == "__main__":
    main()
