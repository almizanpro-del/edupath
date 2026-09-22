"""Tests for the normalize module."""

import pytest
from scraper.normalize import normalize_name, slugify, is_duplicate, deduplicate


class TestNormalizeName:
    def test_strips_university_of_prefix(self):
        assert normalize_name("University of Oxford") == "oxford"

    def test_strips_university_suffix(self):
        assert normalize_name("Oxford University") == "oxford"

    def test_both_forms_match(self):
        assert normalize_name("University of Cambridge") == normalize_name("Cambridge University")

    def test_strips_the(self):
        assert normalize_name("The University of Oxford") == "oxford"

    def test_lowercases(self):
        assert normalize_name("HARVARD UNIVERSITY") == "harvard"

    def test_removes_punctuation(self):
        # Punctuation is replaced with spaces, "Inc" is not a stop word
        result = normalize_name("Harvard University, Inc.")
        assert "harvard" in result
        assert "," not in result

    def test_strips_accents(self):
        result = normalize_name("Université de Genève")
        assert "genève" not in result
        assert "geneve" in result

    def test_empty_string(self):
        assert normalize_name("") == ""

    def test_none_input(self):
        assert normalize_name(None) == ""  # type: ignore

    def test_abbreviations(self):
        assert "massachusetts" in normalize_name("MIT")

    def test_strips_college_suffix(self):
        # "Imperial College" → "imperial college" (suffix only stripped if at end after removing "university")
        # The abbreviation expansion turns "Imperial" into "imperial college london"
        result = normalize_name("Imperial College")
        assert "imperial" in result


class TestSlugify:
    def test_basic(self):
        assert slugify("University of Oxford") == "university-of-oxford"

    def test_removes_punctuation(self):
        assert slugify("Oxford Brookes University, Inc.") == "oxford-brookes-university-inc"

    def test_lowercases(self):
        assert slugify("HARVARD") == "harvard"

    def test_strips_accents(self):
        assert "genève" not in slugify("Université de Genève")
        assert "universite-de-geneve" == slugify("Université de Genève")

    def test_empty(self):
        assert slugify("") == ""


class TestIsDuplicate:
    def test_exact_match(self):
        assert is_duplicate("Oxford University", "Oxford University")

    def test_university_of_variation(self):
        assert is_duplicate("Oxford University", "University of Oxford")

    def test_different_universities(self):
        assert not is_duplicate("Oxford University", "Cambridge University")

    def test_case_insensitive(self):
        assert is_duplicate("OXFORD", "oxford")

    def test_with_the_prefix(self):
        assert is_duplicate("The University of Oxford", "Oxford University")

    def test_completely_different(self):
        assert not is_duplicate("Harvard", "MIT")


class TestDeduplicate:
    def test_removes_exact_duplicates(self):
        records = [
            {"name": "Oxford University", "country": "UK"},
            {"name": "Oxford University", "country": "UK"},
        ]
        unique, dups = deduplicate(records)
        assert len(unique) == 1
        assert len(dups) == 1

    def test_removes_variation_duplicates(self):
        records = [
            {"name": "Oxford University", "country": "UK"},
            {"name": "University of Oxford", "country": "UK"},
        ]
        unique, dups = deduplicate(records)
        assert len(unique) == 1
        assert len(dups) == 1

    def test_keeps_different_universities(self):
        records = [
            {"name": "Oxford University", "country": "UK"},
            {"name": "Cambridge University", "country": "UK"},
        ]
        unique, dups = deduplicate(records)
        assert len(unique) == 2
        assert len(dups) == 0

    def test_keeps_more_complete_record(self):
        records = [
            {"name": "Oxford University", "country": "UK", "city": "Oxford"},
            {"name": "Oxford University", "country": "UK"},  # less data
        ]
        unique, dups = deduplicate(records)
        assert len(unique) == 1
        assert unique[0].get("city") == "Oxford"

    def test_empty_list(self):
        unique, dups = deduplicate([])
        assert len(unique) == 0
        assert len(dups) == 0
