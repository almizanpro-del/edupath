"""Tests for the quality scoring module."""

import pytest
from scraper.quality import (
    quality_score,
    quality_breakdown,
    get_status,
    AUTO_REJECT_THRESHOLD,
    MANUAL_REVIEW_THRESHOLD,
    AUTO_APPROVE_THRESHOLD,
)


class TestQualityScore:
    def test_empty_record_scores_zero(self):
        assert quality_score({}) == 0

    def test_tuition_only(self):
        score = quality_score({"tuitionUsd": 5000})
        assert score == 25

    def test_tuition_and_living(self):
        score = quality_score({"tuitionUsd": 5000, "livingCostUsd": 6000})
        assert score == 45

    def test_full_record(self):
        record = {
            "tuitionUsd": 5000,
            "livingCostUsd": 6000,
            "descriptionEn": "A" * 100,  # at least 50 chars
            "programs": [{"name": "CS"}],
            "website": "https://example.com",
            "logoUrl": "https://example.com/logo.png",
            "descriptionAr": "ب" * 100,
            "acceptanceRate": 50,
        }
        assert quality_score(record) == 100

    def test_tuition_must_be_positive(self):
        assert quality_score({"tuitionUsd": 0}) == 0
        assert quality_score({"tuitionUsd": -100}) == 0

    def test_tuition_string_rejected(self):
        assert quality_score({"tuitionUsd": "5000"}) == 0

    def test_description_must_be_long_enough(self):
        assert quality_score({"descriptionEn": "short"}) == 0
        assert quality_score({"descriptionEn": "A" * 50}) == 15

    def test_website_must_be_url(self):
        assert quality_score({"website": "not a url"}) == 0
        assert quality_score({"website": "https://example.com"}) == 10

    def test_programs_must_be_non_empty_list(self):
        assert quality_score({"programs": []}) == 0
        assert quality_score({"programs": [{"name": "CS"}]}) == 15

    def test_acceptance_rate_range(self):
        assert quality_score({"acceptanceRate": 0}) == 0
        assert quality_score({"acceptanceRate": 101}) == 0
        assert quality_score({"acceptanceRate": 50}) == 5

    def test_max_score_is_100(self):
        record = {
            "tuitionUsd": 5000,
            "livingCostUsd": 6000,
            "descriptionEn": "A" * 100,
            "programs": [{}],
            "website": "https://example.com",
            "logoUrl": "https://example.com/logo.png",
            "descriptionAr": "ب" * 100,
            "acceptanceRate": 50,
            "extraField": "bonus",  # shouldn't add points
        }
        assert quality_score(record) == 100


class TestQualityBreakdown:
    def test_returns_all_fields(self):
        breakdown = quality_breakdown({})
        assert "tuitionUsd" in breakdown
        assert "livingCostUsd" in breakdown
        assert "descriptionEn" in breakdown
        assert len(breakdown) == 8

    def test_earned_matches_score(self):
        record = {"tuitionUsd": 5000, "livingCostUsd": 6000}
        breakdown = quality_breakdown(record)
        total_earned = sum(v["earned"] for v in breakdown.values())
        assert total_earned == quality_score(record)

    def test_passed_flag(self):
        breakdown = quality_breakdown({"tuitionUsd": 5000})
        assert breakdown["tuitionUsd"]["passed"] is True
        assert breakdown["livingCostUsd"]["passed"] is False


class TestGetStatus:
    def test_auto_rejected_below_threshold(self):
        assert get_status(0) == "auto_rejected"
        assert get_status(AUTO_REJECT_THRESHOLD - 1) == "auto_rejected"

    def test_manual_review_for_low_score(self):
        assert get_status(10, "openalex") == "manual_review"

    def test_auto_approved_for_high_score_trusted_source(self):
        assert get_status(AUTO_APPROVE_THRESHOLD, "openalex") == "auto_approved"
        assert get_status(100, "wikipedia") == "auto_approved"

    def test_manual_review_for_untrusted_source(self):
        assert get_status(100, "unknown") == "manual_review"
        assert get_status(100, "random_blog") == "manual_review"

    def test_manual_review_between_thresholds(self):
        assert get_status(MANUAL_REVIEW_THRESHOLD, "curated") == "manual_review"
        assert get_status(AUTO_APPROVE_THRESHOLD - 1, "openalex") == "manual_review"

    def test_curated_is_trusted(self):
        assert get_status(AUTO_APPROVE_THRESHOLD, "curated") == "auto_approved"
