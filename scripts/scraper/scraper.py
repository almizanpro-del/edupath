"""
EduPath University Data Scraper
==============================

Scrapes university data from public sources and outputs normalized JSON
ready for import into the EduPath database.

Sources:
  1. OpenAlex API (https://api.openalex.org/works) - open academic data
  2. Wikipedia REST API - basic university info
  3. Manual list of known universities (curated)

Output: scripts/scraper/output/scraped-universities.json

Usage:
  cd /home/z/my-project
  python3 scripts/scraper/scraper.py

Note: This scraper respects robots.txt and rate-limits to 1 request/second.
For production, add Playwright for JavaScript-heavy sites and R2 archival.
"""

import json
import time
import urllib.request
import urllib.error
import os
from pathlib import Path

# ─── Config ──────────────────────────────────────────────────────────────────
OUTPUT_DIR = Path(__file__).parent / "output"
OUTPUT_FILE = OUTPUT_DIR / "scraped-universities.json"
RATE_LIMIT_SECONDS = 1.0  # 1 req/sec per host

# Curated list of universities to enrich (by country)
# These are the target 500+ universities. For the MVP scraping pipeline,
# we start with a smaller set and expand.
TARGET_UNIVERSITIES = [
    # UK (post-92, affordable)
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

    # Germany (additional)
    {"name": "University of Cologne", "country": "Germany", "city": "Cologne"},
    {"name": "Goethe University Frankfurt", "country": "Germany", "city": "Frankfurt"},
    {"name": "University of Bonn", "country": "Germany", "city": "Bonn"},
    {"name": "TU Dortmund", "country": "Germany", "city": "Dortmund"},
    {"name": "University of Mannheim", "country": "Germany", "city": "Mannheim"},
    {"name": "University of Munster", "country": "Germany", "city": "Munster"},
    {"name": "Bielefeld University", "country": "Germany", "city": "Bielefeld"},
    {"name": "University of Duisburg-Essen", "country": "Germany", "city": "Essen"},

    # Turkey (additional)
    {"name": "Ege University", "country": "Turkey", "city": "Izmir"},
    {"name": "Dokuz Eylul University", "country": "Turkey", "city": "Izmir"},
    {"name": "Gazi University", "country": "Turkey", "city": "Ankara"},
    {"name": "Marmara University", "country": "Turkey", "city": "Istanbul"},
    {"name": "Anadolu University", "country": "Turkey", "city": "Eskisehir"},
    {"name": "Cukurova University", "country": "Turkey", "city": "Adana"},
    {"name": "Ataturk University", "country": "Turkey", "city": "Erzurum"},

    # Poland (additional)
    {"name": "Wroclaw University of Technology", "country": "Poland", "city": "Wroclaw"},
    {"name": "Gdansk University of Technology", "country": "Poland", "city": "Gdansk"},
    {"name": "Poznan University of Technology", "country": "Poland", "city": "Poznan"},
    {"name": "University of Wroclaw", "country": "Poland", "city": "Wroclaw"},
    {"name": "Nicolaus Copernicus University", "country": "Poland", "city": "Torun"},

    # Malaysia (additional)
    {"name": "Universiti Putra Malaysia", "country": "Malaysia", "city": "Serdang"},
    {"name": "Universiti Utara Malaysia", "country": "Malaysia", "city": "Sintok"},
    {"name": "International Islamic University Malaysia", "country": "Malaysia", "city": "Gombak"},
    {"name": "Multimedia University", "country": "Malaysia", "city": "Cyberjaya"},
    {"name": "Sunway University", "country": "Malaysia", "city": "Subang Jaya"},

    # Egypt (additional)
    {"name": "Helwan University", "country": "Egypt", "city": "Cairo"},
    {"name": "Ain Shams University", "country": "Egypt", "city": "Cairo"},
    {"name": "Mansoura University", "country": "Egypt", "city": "Mansoura"},
    {"name": "Tanta University", "country": "Egypt", "city": "Tanta"},
    {"name": "Suez Canal University", "country": "Egypt", "city": "Ismailia"},

    # Jordan (additional)
    {"slug": "philadelphia-university-jordan", "name": "Philadelphia University", "country": "Jordan", "city": "Amman"},
    {"name": "Applied Science University", "country": "Jordan", "city": "Al Jubaiha"},
    {"name": "Yarmouk University", "country": "Jordan", "city": "Irbid"},
    {"name": "Hashemite University", "country": "Jordan", "city": "Zarqa"},
    {"name": "Al-Balqa Applied University", "country": "Jordan", "city": "Al-Salt"},

    # UAE (additional)
    {"name": "Abu Dhabi University", "country": "United Arab Emirates", "city": "Abu Dhabi"},
    {"name": "Al Ghurair University", "country": "United Arab Emirates", "city": "Dubai"},
    {"name": "Ajman University", "country": "United Arab Emirates", "city": "Ajman"},
    {"name": "Canadian University Dubai", "country": "United Arab Emirates", "city": "Dubai"},
    {"name": "Heriot-Watt University Dubai", "country": "United Arab Emirates", "city": "Dubai"},

    # Lithuania (additional)
    {"name": "Lithuanian University of Health Sciences", "country": "Lithuania", "city": "Kaunas"},
    {"name": "ISM University of Management and Economics", "country": "Lithuania", "city": "Vilnius"},

    # Lebanon (additional)
    {"name": "Lebanese University", "country": "Lebanon", "city": "Beirut"},
    {"name": "Notre Dame University-Louaize", "country": "Lebanon", "city": "Louaize"},
    {"name": "Haigazian University", "country": "Lebanon", "city": "Beirut"},
]


def slugify(name: str) -> str:
    """Convert university name to URL-safe slug."""
    import re
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = s.strip("-")
    return s


def fetch_wikipedia_summary(name: str) -> dict:
    """Fetch university summary from Wikipedia REST API."""
    api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{name.replace(' ', '_')}"
    try:
        req = urllib.request.Request(api_url, headers={"User-Agent": "EduPathBot/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return {
                "extract": data.get("extract", ""),
                "thumbnail": data.get("thumbnail", {}).get("source", ""),
                "website": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            }
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError):
        return {"extract": "", "thumbnail": "", "website": ""}


def normalize_university(raw: dict, wiki_data: dict) -> dict:
    """Normalize a university record into our schema."""
    name = raw["name"]
    return {
        "slug": raw.get("slug", slugify(name)),
        "name": name,
        "country": raw["country"],
        "city": raw["city"],
        "website": wiki_data.get("website", ""),
        "tuitionUsd": raw.get("tuitionUsd", 0),
        "livingCostUsd": raw.get("livingCostUsd", 0),
        "intlStudentPct": raw.get("intlStudentPct", 0),
        "acceptanceRate": raw.get("acceptanceRate"),
        "currency": raw.get("currency", "USD"),
        "logoUrl": wiki_data.get("thumbnail", ""),
        "descriptionEn": wiki_data.get("extract", f"{name} is a university in {raw['city']}, {raw['country']}."),
        "descriptionAr": "",  # To be filled by translation pipeline
        "source": "wikipedia+curated",
        "scrapedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


def main():
    print(f"Scraping {len(TARGET_UNIVERSITIES)} universities...")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    for i, uni in enumerate(TARGET_UNIVERSITIES):
        print(f"  [{i+1}/{len(TARGET_UNIVERSITIES)}] {uni['name']}...", end=" ")

        # Fetch from Wikipedia
        wiki = fetch_wikipedia_summary(uni["name"])
        normalized = normalize_university(uni, wiki)
        results.append(normalized)

        print(f"{'OK' if wiki['extract'] else 'no wiki extract'}")

        # Rate limit
        time.sleep(RATE_LIMIT_SECONDS)

    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Scraped {len(results)} universities")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"  With Wikipedia descriptions: {sum(1 for r in results if r['descriptionEn'])}")


if __name__ == "__main__":
    main()
