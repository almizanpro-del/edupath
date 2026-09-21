"""
Wikipedia REST API adapter.

Fetches basic university info (description, thumbnail, website URL) from
the Wikipedia REST API. This is a secondary source used to enrich records
from the curated list — it doesn't have tuition/program data.
"""

import time
import json
import urllib.request
import urllib.error
from typing import Optional
from .base import BaseAdapter


class WikipediaAdapter(BaseAdapter):
    """Fetches university data from the Wikipedia REST API."""

    def __init__(self, rate_limit_seconds: float = 1.0):
        super().__init__(rate_limit_seconds)
        self.name = "wikipedia"
        self.base_url = "https://en.wikipedia.org/api/rest_v1/page/summary"
        self.user_agent = "EduPathBot/1.0 (mailto:hello@edupath.com)"

    def fetch_universities(
        self,
        countries: Optional[list[str]] = None,
        limit: Optional[int] = None,
    ) -> list[dict]:
        """
        Wikipedia doesn't support listing universities by country.
        This adapter is used to enrich individual records, not for bulk fetch.

        Use enrich_university() instead for individual lookups.
        """
        return []

    def enrich_university(self, name: str) -> dict:
        """
        Fetch Wikipedia data for a single university.

        Args:
          name: University name (e.g. "University of Oxford")

        Returns:
          Dict with keys: extract, thumbnail, website
          (empty strings if not found)
        """
        title = name.replace(" ", "_")
        url = f"{self.base_url}/{title}"

        try:
            req = urllib.request.Request(url, headers={
                "User-Agent": self.user_agent,
                "Accept": "application/json",
            })
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read())

            return {
                "extract": data.get("extract", ""),
                "thumbnail": data.get("thumbnail", {}).get("source", ""),
                "website": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            }
        except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, KeyError):
            return {"extract": "", "thumbnail": "", "website": ""}

    def enrich_batch(self, universities: list[dict]) -> list[dict]:
        """
        Enrich a list of university records with Wikipedia data.

        Adds/updates: descriptionEn, logoUrl, website

        Args:
          universities: List of university dicts (must have 'name' key)

        Returns:
          The same list with enriched records.
        """
        enriched: list[dict] = []
        for i, uni in enumerate(universities):
            name = uni.get("name", "")
            if not name:
                enriched.append(uni)
                continue

            wiki = self.enrich_university(name)

            # Only fill in missing fields
            if not uni.get("descriptionEn") and wiki.get("extract"):
                uni["descriptionEn"] = wiki["extract"]
            if not uni.get("logoUrl") and wiki.get("thumbnail"):
                uni["logoUrl"] = wiki["thumbnail"]
            if not uni.get("website") and wiki.get("website"):
                uni["website"] = wiki["website"]

            uni["source"] = uni.get("source", "wikipedia")
            enriched.append(uni)

            if (i + 1) % 10 == 0:
                print(f"  [Wikipedia] Enriched {i + 1}/{len(universities)}")

            time.sleep(self.rate_limit_seconds)

        return enriched
