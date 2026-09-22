"""
EduPath University Data Scraper
==============================

A modular Python scraper for enriching the EduPath university database.

Architecture:
  scraper/
  ├── __init__.py
  ├── normalize.py       # Name normalization + fuzzy dedup
  ├── quality.py         # Completeness scoring (0-100)
  ├── writer.py          # Output writer (JSON + Prisma upsert)
  ├── pipeline.py        # CLI orchestrator
  ├── adapters/
  │   ├── __init__.py
  │   ├── base.py        # Abstract adapter interface
  │   ├── openalex.py    # OpenAlex API adapter
  │   └── wikipedia.py   # Wikipedia REST API adapter
  └── tests/
      ├── __init__.py
      ├── test_normalize.py
      ├── test_quality.py
      └── test_adapters.py

Sources:
  1. OpenAlex (https://docs.openalex.org/) — open academic metadata
  2. Wikipedia REST API — basic info + descriptions
  3. Curated list — known universities not in OpenAlex

Output:
  scripts/scraper/output/scraped-universities.json

Usage:
  python -m scraper.pipeline --source openalex --countries Jordan,Egypt --dry-run
  python -m scraper.pipeline --source wikipedia --limit 50
  python -m scraper.pipeline --source all --countries all
  python -m pytest scraper/tests/ -v
"""

__version__ = "1.0.0"
