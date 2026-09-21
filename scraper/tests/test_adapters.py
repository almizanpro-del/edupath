"""Tests for the adapter modules."""

import pytest
from scraper.adapters.openalex import OpenAlexAdapter
from scraper.adapters.wikipedia import WikipediaAdapter
from scraper.adapters.base import BaseAdapter


class TestOpenAlexAdapter:
    def test_initialization(self):
        adapter = OpenAlexAdapter()
        assert adapter.name == "openalex"
        assert adapter.rate_limit_seconds == 1.0

    def test_country_to_code(self):
        adapter = OpenAlexAdapter()
        assert adapter._country_to_code("Jordan") == "JO"
        assert adapter._country_to_code("Egypt") == "EG"
        assert adapter._country_to_code("Turkey") == "TR"
        assert adapter._country_to_code("Unknown") is None

    def test_country_to_code_case_insensitive(self):
        adapter = OpenAlexAdapter()
        assert adapter._country_to_code("JORDAN") == "JO"
        assert adapter._country_to_code("jordan") == "JO"

    def test_code_to_country(self):
        adapter = OpenAlexAdapter()
        assert adapter._code_to_country("JO") == "Jordan"
        assert adapter._code_to_country("EG") == "Egypt"
        assert adapter._code_to_country("XX") == "XX"  # unknown code returns as-is

    def test_normalize_institution(self):
        adapter = OpenAlexAdapter()
        inst = {
            "display_name": "University of Oxford",
            "country_code": "GB",
            "geo": {"city": "Oxford"},
            "homepage_url": "https://ox.ac.uk",
            "image_url": "https://example.com/logo.png",
            "description": "A university in Oxford.",
            "id": "https://openalex.org/I123",
            "works_count": 1000,
            "cited_by_count": 5000,
        }
        result = adapter._normalize_institution(inst)
        assert result["name"] == "University of Oxford"
        assert result["country"] == "United Kingdom"
        assert result["city"] == "Oxford"
        assert result["website"] == "https://ox.ac.uk"
        assert result["source"] == "openalex"
        assert result["openalexId"] == "https://openalex.org/I123"
        assert result["worksCount"] == 1000

    def test_normalize_institution_missing_fields(self):
        adapter = OpenAlexAdapter()
        result = adapter._normalize_institution({})
        assert result["name"] == ""
        assert result["country"] == ""
        assert result["tuitionUsd"] == 0

    def test_inherits_from_base(self):
        assert issubclass(OpenAlexAdapter, BaseAdapter)


class TestWikipediaAdapter:
    def test_initialization(self):
        adapter = WikipediaAdapter()
        assert adapter.name == "wikipedia"

    def test_fetch_returns_empty_list(self):
        # Wikipedia adapter doesn't support bulk fetch
        adapter = WikipediaAdapter()
        assert adapter.fetch_universities() == []

    def test_enrich_batch_preserves_existing_data(self):
        adapter = WikipediaAdapter()
        # Mock enrich_university to avoid network calls
        adapter.enrich_university = lambda name: {
            "extract": "Wiki description",
            "thumbnail": "https://example.com/thumb.png",
            "website": "https://en.wikipedia.org/wiki/Test",
        }
        universities = [
            {"name": "Test University", "descriptionEn": "Existing description"},
        ]
        result = adapter.enrich_batch(universities)
        # Should NOT overwrite existing description
        assert result[0]["descriptionEn"] == "Existing description"

    def test_enrich_batch_fills_missing_data(self):
        adapter = WikipediaAdapter()
        adapter.enrich_university = lambda name: {
            "extract": "Wiki description",
            "thumbnail": "https://example.com/thumb.png",
            "website": "https://en.wikipedia.org/wiki/Test",
        }
        universities = [{"name": "Test University"}]
        result = adapter.enrich_batch(universities)
        assert result[0]["descriptionEn"] == "Wiki description"
        assert result[0]["logoUrl"] == "https://example.com/thumb.png"

    def test_enrich_batch_skips_empty_names(self):
        adapter = WikipediaAdapter()
        universities = [{"name": ""}, {"city": "Oxford"}]
        result = adapter.enrich_batch(universities)
        assert len(result) == 2  # Should not crash

    def test_inherits_from_base(self):
        assert issubclass(WikipediaAdapter, BaseAdapter)


class TestBaseAdapter:
    def test_normalize_country(self):
        adapter = OpenAlexAdapter()
        assert adapter.normalize_country("UK") == "United Kingdom"
        assert adapter.normalize_country("UAE") == "United Arab Emirates"
        assert adapter.normalize_country("Jordan") == "Jordan"
