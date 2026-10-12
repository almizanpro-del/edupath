#!/usr/bin/env python3
"""
Generate realistic transfer pathways between universities.
Creates articulation agreements, credit transfer info, and savings estimates.

Run: python3 scripts/generate-pathways.py
"""
import json
import random
import uuid
from pathlib import Path

INPUT_FILE = Path(__file__).parent.parent / "src" / "data" / "static-pathways.json"
UNIS_FILE = Path(__file__).parent.parent / "src" / "data" / "static-universities.json"

def main():
    with open(UNIS_FILE, "r", encoding="utf-8") as f:
        unis = json.load(f)
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        existing = json.load(f)

    # Build university lookup
    uni_by_id = {u["id"]: u for u in unis}

    # Create pathways: pair affordable source countries with destination countries
    # Pattern: start at affordable university → transfer to higher-ranked one
    source_countries = ["Egypt", "Jordan", "Turkey", "Poland", "Malaysia", "Russia", "Uzbekistan", "Kazakhstan", "Georgia", "Lithuania"]
    dest_countries = ["United Kingdom", "Germany", "United Arab Emirates", "Turkey", "Malaysia"]

    pathways = list(existing)  # Keep existing pathways

    # Generate ~30 new pathways
    for _ in range(30):
        src_country = random.choice(source_countries)
        dst_country = random.choice(dest_countries)

        # Find universities in these countries
        src_unis = [u for u in unis if u["country"] == src_country]
        dst_unis = [u for u in unis if u["country"] == dst_country and u["id"] not in [s["id"] for s in src_unis]]

        if not src_unis or not dst_unis:
            continue

        src = random.choice(src_unis)
        dst = random.choice(dst_unis)

        # Skip if pathway already exists
        if any(p["fromUniversity"]["id"] == src["id"] and p["toUniversity"]["id"] == dst["id"] for p in pathways):
            continue

        # Calculate estimated savings
        src_annual = src["tuitionUsd"] + src["livingCostUsd"]
        dst_annual = dst["tuitionUsd"] + dst["livingCostUsd"]
        savings = max(0, (dst_annual - src_annual) * 2)  # 2 years at cheaper university

        credits_accepted = random.choice([60, 90, 120, 150])
        total_credits = random.choice([180, 240, 360])
        agreement_type = random.choice(["official", "case-by-case", "official", "official"])

        requirements_options = [
            "GPA 2.5+, IELTS 6.0, passing internal English exam",
            "GPA 3.0+, language proficiency certificate, course syllabus review",
            "GPA 2.0+, completed 2 years of study, department approval",
            "GPA 2.8+, IELTS 6.5, portfolio review for design programs",
            "GPA 3.0+, TOEFL 80, transcript evaluation by destination university",
        ]

        notes_options = [
            f"2+2 articulation agreement: complete 2 years at {src['name']}, transfer to {dst['name']} for final 2 years. {dst['country']} degree awarded.",
            f"Credit transfer agreement allows up to {credits_accepted} credits. Students save approximately ${savings:,} by starting at {src['name']}.",
            f"Pathway program: study 1-2 years at {src['name']} then transfer. Application requires syllabus submission for course matching.",
            f"Direct transfer agreement between institutions. {dst['name']} accepts {credits_accepted} of {total_credits} credits from {src['name']}.",
        ]

        pathway = {
            "id": f"tp_{uuid.uuid4().hex[:20]}",
            "fromUniversityId": src["id"],
            "toUniversityId": dst["id"],
            "creditsAccepted": credits_accepted,
            "totalCredits": total_credits,
            "agreementType": agreement_type,
            "notes": random.choice(notes_options),
            "requirements": random.choice(requirements_options),
            "estimatedSavingsUsd": savings,
            "fromUniversity": {
                "id": src["id"],
                "name": src["name"],
                "slug": src["slug"],
                "country": src["country"],
                "city": src["city"],
                "tuitionUsd": src["tuitionUsd"],
                "livingCostUsd": src["livingCostUsd"],
            },
            "toUniversity": {
                "id": dst["id"],
                "name": dst["name"],
                "slug": dst["slug"],
                "country": dst["country"],
                "city": dst["city"],
                "tuitionUsd": dst["tuitionUsd"],
                "livingCostUsd": dst["livingCostUsd"],
            },
        }
        pathways.append(pathway)

    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(pathways, f, indent=2, ensure_ascii=False)

    print(f"✓ Total pathways: {len(pathways)} (was {len(existing)}, added {len(pathways) - len(existing)})")


if __name__ == "__main__":
    random.seed(42)
    main()
