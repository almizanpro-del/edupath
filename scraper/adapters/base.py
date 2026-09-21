"""
Abstract base class for data source adapters.

Each adapter fetches university data from a specific source (OpenAlex,
Wikipedia, etc.) and returns normalized records.
"""

from abc import ABC, abstractmethod
from typing import Optional


class BaseAdapter(ABC):
    """Base class for all data source adapters."""

    def __init__(self, rate_limit_seconds: float = 1.0):
        """
        Args:
          rate_limit_seconds: Minimum seconds between API requests
        """
        self.rate_limit_seconds = rate_limit_seconds
        self.name: str = "base"

    @abstractmethod
    def fetch_universities(
        self,
        countries: Optional[list[str]] = None,
        limit: Optional[int] = None,
    ) -> list[dict]:
        """
        Fetch university records from this source.

        Args:
          countries: Optional list of country names to filter by.
                     If None, fetch from all countries.
          limit: Optional max number of records to return.

        Returns:
          List of university dicts with at minimum: name, country, city.
          May also include: website, descriptionEn, logoUrl, etc.
        """
        ...

    def normalize_country(self, country: str) -> str:
        """Normalize country name variations."""
        country_map = {
            "UK": "United Kingdom",
            "UAE": "United Arab Emirates",
            "USA": "United States",
            "US": "United States",
        }
        return country_map.get(country, country)
