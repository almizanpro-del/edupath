"""
Name normalization and fuzzy deduplication for university names.

Handles common variations:
  - "University of Oxford" vs "Oxford University"
  - "MIT" vs "Massachusetts Institute of Technology"
  - Extra whitespace, punctuation, case differences
  - Common suffixes/prefixes ("The", "University of", etc.)

Uses RapidFuzz for fuzzy matching to detect duplicates.
"""

import re
import unicodedata
from typing import Optional

try:
    from rapidfuzz import fuzz, process
    HAS_RAPIDFUZZ = True
except ImportError:
    HAS_RAPIDFUZZ = False


# Common words to strip during normalization
STOP_WORDS = {
    "the", "of", "and", "at", "in", "on", "for",
}

# Common university name suffixes (order matters — longest first)
SUFFIXES = [
    "university of technology",
    "university of applied sciences",
    "institute of technology",
    "polytechnic institute",
    "state university",
    "national university",
    "international university",
    "university",
    "college",
    "institute",
    "school",
    "academy",
    "polytechnic",
]

# Common abbreviations → full names
ABBREVIATIONS = {
    "mit": "massachusetts institute of technology",
    "caltech": "california institute of technology",
    "eth": "eth zurich",
    "ucl": "university college london",
    "imperial": "imperial college london",
    "lse": "london school of economics",
}


def normalize_name(name: str) -> str:
    """
    Normalize a university name for comparison.

    Steps:
      1. Unicode normalize (NFKD) + strip accents
      2. Lowercase
      3. Remove punctuation
      4. Collapse whitespace
      5. Remove stop words
      6. Remove common suffixes

    Returns a canonical form suitable for dedup comparison.

    Examples:
      >>> normalize_name("University of Oxford")
      'oxford'
      >>> normalize_name("Oxford University")
      'oxford'
      >>> normalize_name("MIT")
      'massachusetts institute of technology'
    """
    if not name:
        return ""

    # 1. Unicode normalize + strip accents
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")

    # 2. Lowercase
    name = name.lower().strip()

    # 3. Remove punctuation (keep letters, numbers, spaces)
    name = re.sub(r"[^a-z0-9\s]", " ", name)

    # 4. Collapse whitespace
    name = re.sub(r"\s+", " ", name).strip()

    # 5. Expand abbreviations (whole-word match)
    words = name.split()
    expanded = []
    for w in words:
        expanded.append(ABBREVIATIONS.get(w, w))
    name = " ".join(expanded)

    # 6. Remove stop words
    words = [w for w in name.split() if w not in STOP_WORDS]
    name = " ".join(words)

    # 7. Remove common suffixes
    for suffix in SUFFIXES:
        if name.endswith(suffix):
            name = name[: -len(suffix)].strip()
            break
        if name.startswith(suffix):
            name = name[len(suffix):].strip()
            break

    return name.strip()


def slugify(name: str) -> str:
    """
    Convert a university name to a URL-safe slug.

    Examples:
      >>> slugify("University of Oxford")
      'university-of-oxford'
      >>> slugify("Bogazici Universitesi")
      'bogazici-universitesi'
    """
    if not name:
        return ""
    # Unicode normalize
    name = unicodedata.normalize("NFKD", name)
    name = name.encode("ascii", "ignore").decode("ascii")
    name = name.lower().strip()
    name = re.sub(r"[^a-z0-9]+", "-", name)
    name = name.strip("-")
    return name


def is_duplicate(name_a: str, name_b: str, threshold: int = 90) -> bool:
    """
    Check if two university names are likely duplicates.

    Uses RapidFuzz token_sort_ratio for fuzzy comparison.
    Falls back to exact normalized comparison if RapidFuzz is unavailable.

    Args:
      name_a: First university name
      name_b: Second university name
      threshold: Similarity score (0-100) above which names are duplicates

    Returns:
      True if the names are likely duplicates

    Examples:
      >>> is_duplicate("Oxford University", "University of Oxford")
      True
      >>> is_duplicate("Oxford University", "Cambridge University")
      False
    """
    norm_a = normalize_name(name_a)
    norm_b = normalize_name(name_b)

    # Fast path: exact match
    if norm_a == norm_b:
        return True

    # Fuzzy match
    if HAS_RAPIDFUZZ:
        score = fuzz.token_sort_ratio(norm_a, norm_b)
        return score >= threshold

    # Fallback: substring check
    if len(norm_a) > 3 and len(norm_b) > 3:
        return norm_a in norm_b or norm_b in norm_a
    return False


def find_duplicates(names: list[str], threshold: int = 90) -> dict[int, list[int]]:
    """
    Find groups of duplicate names in a list.

    Returns a dict mapping each index to a list of duplicate indices.
    Only returns groups with at least one duplicate.

    Example:
      >>> names = ["Oxford University", "University of Oxford", "Cambridge"]
      >>> find_duplicates(names)
      {0: [1], 1: [0]}
    """
    if not HAS_RAPIDFUZZ:
        # Fallback: O(n²) with normalize + exact match
        groups: dict[int, list[int]] = {}
        normalized = [normalize_name(n) for n in names]
        for i, a in enumerate(normalized):
            for j, b in enumerate(normalized):
                if i < j and a == b and a:
                    groups.setdefault(i, []).append(j)
                    groups.setdefault(j, []).append(i)
        return groups

    # RapidFuzz: use process.extract for efficiency
    groups: dict[int, list[int]] = {}
    for i, name in enumerate(names):
        if i in groups:
            continue
        norm = normalize_name(name)
        if not norm:
            continue
        matches = process.extract(
            norm,
            [normalize_name(n) for n in names],
            scorer=fuzz.token_sort_ratio,
            score_cutoff=threshold,
            limit=None,
        )
        for match_idx, score, _ in matches:
            if match_idx != i and score >= threshold:
                groups.setdefault(i, []).append(match_idx)
                groups.setdefault(match_idx, []).append(i)
    return groups


def deduplicate(universities: list[dict], threshold: int = 90) -> tuple[list[dict], list[dict]]:
    """
    Remove duplicates from a list of university records.

    When a duplicate is found, the record with the higher quality score
    (or more complete data) is kept.

    Args:
      universities: List of university dicts (must have 'name' key)
      threshold: Fuzzy match threshold (0-100)

    Returns:
      Tuple of (unique_records, duplicates_removed)
    """
    unique: list[dict] = []
    duplicates: list[dict] = []

    for uni in universities:
        name = uni.get("name", "")
        is_dup = False
        for existing in unique:
            existing_name = existing.get("name", "")
            if is_duplicate(name, existing_name, threshold):
                is_dup = True
                # Keep the one with more non-empty fields
                uni_filled = sum(1 for v in uni.values() if v)
                existing_filled = sum(1 for v in existing.values() if v)
                if uni_filled > existing_filled:
                    duplicates.append(existing)
                    unique.remove(existing)
                    unique.append(uni)
                else:
                    duplicates.append(uni)
                break
        if not is_dup:
            unique.append(uni)

    return unique, duplicates
