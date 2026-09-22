"""
OpenAlex API adapter.

OpenAlex (https://docs.openalex.org/) is an open catalog of scholarly works,
institutions, authors, and more. It provides a free API for fetching
institution (university) metadata.

This adapter fetches institutions filtered by country and type='education'.
"""

import time
import json
import urllib.request
import urllib.error
from typing import Optional
from .base import BaseAdapter


class OpenAlexAdapter(BaseAdapter):
    """Fetches university data from the OpenAlex API."""

    def __init__(self, rate_limit_seconds: float = 1.0):
        super().__init__(rate_limit_seconds)
        self.name = "openalex"
        self.base_url = "https://api.openalex.org/institutions"
        self.user_agent = "EduPathBot/1.0 (mailto:hello@edupath.com)"

    def fetch_universities(
        self,
        countries: Optional[list[str]] = None,
        limit: Optional[int] = None,
    ) -> list[dict]:
        """
        Fetch institutions from OpenAlex.

        Args:
          countries: List of country names (e.g. ["Jordan", "Egypt"]).
                     OpenAlex uses ISO 2-letter codes internally.
          limit: Max records to return (default: 200)

        Returns:
          List of normalized university dicts.
        """
        max_results = limit or 200
        per_page = min(max_results, 200)
        results: list[dict] = []

        # Build the filter query
        # OpenAlex filter: type:education AND country_code:XX
        filters = ["type:education"]
        if countries:
            codes = [self._country_to_code(c) for c in countries]
            codes = [c for c in codes if c]  # Filter out None
            if codes:
                filters.append(f"country_code:{'|'.join(codes)}")

        filter_param = ",".join(filters)
        page = 1

        while len(results) < max_results:
            params = f"?filter={filter_param}&per-page={per_page}&page={page}"
            url = f"{self.base_url}{params}"

            try:
                data = self._fetch_json(url)
            except Exception as e:
                print(f"  [OpenAlex] Error fetching page {page}: {e}")
                break

            institutions = data.get("results", [])
            if not institutions:
                break

            for inst in institutions:
                results.append(self._normalize_institution(inst))
                if len(results) >= max_results:
                    break

            # Check if there are more pages
            meta = data.get("meta", {})
            total_count = meta.get("count", 0)
            if len(results) >= total_count or len(results) >= max_results:
                break

            page += 1
            time.sleep(self.rate_limit_seconds)

        return results[:max_results]

    def _fetch_json(self, url: str) -> dict:
        """Fetch JSON from a URL with rate limiting and error handling."""
        req = urllib.request.Request(url, headers={
            "User-Agent": self.user_agent,
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            return json.loads(resp.read())

    def _normalize_institution(self, inst: dict) -> dict:
        """Normalize an OpenAlex institution record to our schema."""
        return {
            "name": inst.get("display_name", ""),
            "country": self._code_to_country(inst.get("country_code", "")),
            "city": inst.get("geo", {}).get("city", "") or "",
            "website": inst.get("homepage_url", "") or "",
            "logoUrl": inst.get("image_url", "") or "",
            "descriptionEn": inst.get("description", "") or "",
            "descriptionAr": "",
            "tuitionUsd": 0,  # OpenAlex doesn't have tuition data
            "livingCostUsd": 0,
            "intlStudentPct": 0,
            "acceptanceRate": None,
            "currency": "USD",
            "source": "openalex",
            "openalexId": inst.get("id", ""),
            "worksCount": inst.get("works_count", 0),
            "citedByCount": inst.get("cited_by_count", 0),
        }

    def _country_to_code(self, country: str) -> Optional[str]:
        """Convert country name to ISO 2-letter code for OpenAlex API."""
        country_codes = {
            "jordan": "JO",
            "egypt": "EG",
            "turkey": "TR",
            "germany": "DE",
            "poland": "PL",
            "malaysia": "MY",
            "lebanon": "LB",
            "united arab emirates": "AE",
            "uae": "AE",
            "united kingdom": "GB",
            "uk": "GB",
            "lithuania": "LT",
            "saudi arabia": "SA",
            "qatar": "QA",
            "kuwait": "KW",
            "morocco": "MA",
            "tunisia": "TN",
            "algeria": "DZ",
            "iraq": "IQ",
            "palestine": "PS",
            "yemen": "YE",
            "syria": "SY",
            "libya": "LY",
            "sudan": "SD",
            "united states": "US",
            "usa": "US",
            "canada": "CA",
            "australia": "AU",
            "france": "FR",
            "italy": "IT",
            "spain": "ES",
            "netherlands": "NL",
            "sweden": "SE",
            "ireland": "IE",
            "china": "CN",
            "japan": "JP",
            "south korea": "KR",
            "korea": "KR",
            "india": "IN",
            "pakistan": "PK",
            "bangladesh": "BD",
            "indonesia": "ID",
            "philippines": "PH",
        }
        return country_codes.get(country.lower().strip())

    def _code_to_country(self, code: str) -> str:
        """Convert ISO 2-letter code back to country name."""
        code_map = {
            "JO": "Jordan", "EG": "Egypt", "TR": "Turkey", "DE": "Germany",
            "PL": "Poland", "MY": "Malaysia", "LB": "Lebanon",
            "AE": "United Arab Emirates", "GB": "United Kingdom",
            "LT": "Lithuania", "SA": "Saudi Arabia", "QA": "Qatar",
            "KW": "Kuwait", "MA": "Morocco", "TN": "Tunisia",
            "DZ": "Algeria", "IQ": "Iraq", "PS": "Palestine",
            "YE": "Yemen", "SY": "Syria", "LY": "Libya", "SD": "Sudan",
            "US": "United States", "CA": "Canada", "AU": "Australia",
            "FR": "France", "IT": "Italy", "ES": "Spain",
            "NL": "Netherlands", "SE": "Sweden", "IE": "Ireland",
            "CN": "China", "JP": "Japan", "KR": "South Korea",
            "IN": "India", "PK": "Pakistan", "BD": "Bangladesh",
            "ID": "Indonesia", "PH": "Philippines",
        }
        return code_map.get(code.upper(), code)
