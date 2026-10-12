#!/usr/bin/env python3
"""
Generate 50+ realistic transfer pathways with MENA-relevant routes.
Replaces existing pathways with a richer, labeled dataset.

Run: python3 scripts/generate-pathways-v2.py
"""
import json
import uuid
from pathlib import Path

UNIS_FILE = Path(__file__).parent.parent / "src" / "data" / "static-universities.json"
OUTPUT_FILE = Path(__file__).parent.parent / "src" / "data" / "static-pathways.json"

def main():
    with open(UNIS_FILE, "r", encoding="utf-8") as f:
        unis = json.load(f)

    uni_by_country = {}
    for u in unis:
        uni_by_country.setdefault(u["country"], []).append(u)

    def make_pathway(src, dst, credits_accepted, total_credits, agreement, notes, requirements, savings, field=None):
        return {
            "id": f"tp_{uuid.uuid4().hex[:20]}",
            "fromUniversityId": src["id"],
            "toUniversityId": dst["id"],
            "creditsAccepted": credits_accepted,
            "totalCredits": total_credits,
            "agreementType": agreement,
            "fieldOfStudy": field,
            "notes": notes,
            "requirements": requirements,
            "estimatedSavingsUsd": savings,
            "isSample": True,
            "source": "seed",
            "fromUniversity": {
                "id": src["id"], "name": src["name"], "slug": src["slug"],
                "country": src["country"], "city": src["city"],
                "tuitionUsd": src["tuitionUsd"], "livingCostUsd": src["livingCostUsd"],
            },
            "toUniversity": {
                "id": dst["id"], "name": dst["name"], "slug": dst["slug"],
                "country": dst["country"], "city": dst["city"],
                "tuitionUsd": dst["tuitionUsd"], "livingCostUsd": dst["livingCostUsd"],
            },
        }

    pathways = []

    # Helper to get first uni from a country
    def u(country, index=0):
        unis_list = uni_by_country.get(country, [])
        return unis_list[index] if len(unis_list) > index else None

    # ===== TURKEY → GERMANY (Engineering transfer) =====
    pairs = [
        (u("Turkey", 0), u("Germany", 0)),
        (u("Turkey", 1), u("Germany", 1)),
        (u("Turkey", 2), u("Germany", 2)),
        (u("Turkey", 3), u("Germany", 3)),
        (u("Turkey", 4), u("Germany", 4)),
    ]
    for i, (src, dst) in enumerate(pairs):
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 120, 240, "official",
                f"2+2 articulation: 2 years at {src['name']} → 2 years at {dst['name']}. German engineering degree awarded. Language bridge program available.",
                "GPA 2.5+, IELTS 6.0, German A2 certificate (B1 for some programs). Course syllabus review required.",
                savings, "Engineering"))

    # ===== EGYPT → TURKEY (Affordable start) =====
    for i in range(5):
        src = u("Egypt", i)
        dst = u("Turkey", i % 5)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 90, 180, "case-by-case",
                f"Credit transfer from {src['name']} to {dst['name']}. Up to 50% of credits accepted with syllabus matching.",
                "GPA 2.8+, IELTS 6.0 or Turkish language certificate. Transcript evaluation by destination faculty.",
                savings, None))

    # ===== JORDAN → MALAYSIA (Affordable transfer) =====
    for i in range(4):
        src = u("Jordan", i)
        dst = u("Malaysia", i % 4)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 60, 120, "official",
                f"Articulation agreement: {src['name']} → {dst['name']}. Malaysian degree awarded. English-medium programs.",
                "GPA 2.5+, IELTS 6.0. Minimum 1 year completed at source university. Credit transfer evaluation fee applies.",
                savings, "Business"))

    # ===== JORDAN → TURKEY =====
    for i in range(3):
        src = u("Jordan", i)
        dst = u("Turkey", (i+5) % 7)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 90, 180, "case-by-case",
                f"Transfer pathway {src['name']} → {dst['name']}. Up to 50% credits accepted with faculty approval.",
                "GPA 2.5+, Turkish or English proficiency. Department-specific requirements may apply.",
                savings, None))

    # ===== RUSSIA → GERMANY =====
    for i in range(3):
        src = u("Russia", i)
        dst = u("Germany", (i+5) % 8)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 120, 240, "official",
                f"International transfer: {src['name']} → {dst['name']}. Strong STEM pathway. German language year included.",
                "GPA 3.0+, IELTS 6.5, German A2. APS certificate required. 2 years minimum at source.",
                savings, "Computer Science"))

    # ===== GEORGIA → UNITED KINGDOM =====
    for i in range(4):
        src = u("Georgia", i)
        dst = u("United Kingdom", i % 9)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 120, 360, "official",
                f"2+2 pathway: {src['name']} → {dst['name']}. UK bachelor's degree awarded. Year 3 entry at UK campus.",
                "GPA 2.8+, IELTS 6.5. Personal statement required. CAS letter issued after acceptance.",
                savings, None))

    # ===== POLAND → UNITED KINGDOM =====
    for i in range(3):
        src = u("Poland", i)
        dst = u("United Kingdom", (i+3) % 9)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 180, 360, "official",
                f"Erasmus+ transfer: {src['name']} → {dst['name']}. Full credit recognition under Bologna process.",
                "GPA 2.5+, IELTS 6.0. Erasmus coordinator approval. Learning agreement must be signed before transfer.",
                savings, "Engineering"))

    # ===== LITHUANIA → GERMANY =====
    for i in range(2):
        src = u("Lithuania", i)
        dst = u("Germany", (i+7) % 8)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 150, 240, "official",
                f"EU transfer: {src['name']} → {dst['name']}. ECTS credits fully recognized.",
                "GPA 2.5+, IELTS 6.0. No visa required (EU). Health insurance transfer needed.",
                savings, "Business"))

    # ===== KAZAKHSTAN → RUSSIA =====
    for i in range(3):
        src = u("Kazakhstan", i)
        dst = u("Russia", i % 3)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 120, 240, "official",
                f"CIS transfer: {src['name']} → {dst['name']}. Credit transfer under bilateral agreement.",
                "GPA 2.5+, Russian language proficiency. Passport and migration card required.",
                savings, None))

    # ===== UZBEKISTAN → TURKEY =====
    for i in range(2):
        src = u("Uzbekistan", i)
        dst = u("Turkey", (i+7) % 7)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 90, 180, "case-by-case",
                f"Transfer: {src['name']} → {dst['name']}. Up to 50% credits accepted.",
                "GPA 2.5+, IELTS 6.0 or Turkish proficiency. Course matching by faculty.",
                savings, None))

    # ===== UAE → UNITED KINGDOM (Premium transfer) =====
    for i in range(3):
        src = u("United Arab Emirates", i)
        dst = u("United Kingdom", (i+6) % 9)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 120, 360, "official",
                f"Premium pathway: {src['name']} → {dst['name']}. Direct entry to year 2 or 3 at UK university.",
                "GPA 3.0+, IELTS 6.5. CAS letter required. TB test for some countries.",
                savings, "Business"))

    # ===== LEBANON → FRANCE (via existing unis) =====
    for i in range(2):
        src = u("Lebanon", i)
        dst = u("Germany", (i+10) % 8)  # Use Germany as proxy for European transfer
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 90, 180, "case-by-case",
                f"Francophone transfer: {src['name']} → {dst['name']}. Credit evaluation per course.",
                "GPA 2.8+, IELTS 6.0 or French B2. Syllabus submission required for all transfer courses.",
                savings, "Social Sciences"))

    # ===== MALAYSIA → UNITED KINGDOM (Twinning) =====
    for i in range(3):
        src = u("Malaysia", i)
        dst = u("United Kingdom", (i+8) % 9)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 120, 360, "official",
                f"Twinning program: {src['name']} → {dst['name']}. 2+1 or 3+0 option. UK degree awarded.",
                "GPA 2.5+, IELTS 6.0. Direct entry based on Malaysian qualification framework.",
                savings, "Computer Science"))

    # ===== EGYPT → GERMANY =====
    for i in range(2):
        src = u("Egypt", (i+5) % 5)
        dst = u("Germany", (i+11) % 8)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 60, 240, "case-by-case",
                f"Transfer: {src['name']} → {dst['name']}. APS required for Egyptian credentials.",
                "GPA 3.0+, IELTS 6.5, APS certificate. German A1 recommended.",
                savings, "Engineering"))

    # ===== INTRA-COUNTRY (Turkey → Turkey) =====
    turkey_unis = uni_by_country.get("Turkey", [])
    for i in range(min(3, len(turkey_unis) - 1)):
        src = turkey_unis[i]
        dst = turkey_unis[i + 1]
        savings = abs(src["tuitionUsd"] - dst["tuitionUsd"]) * 2
        pathways.append(make_pathway(src, dst, 120, 240, "official",
            f"Intra-country transfer: {src['name']} → {dst['name']}. Full credit recognition within Turkish higher education system.",
            "GPA 2.0+, Turkish language proficiency. Transfer application via ÖSYM or university directly.",
            savings, None))

    # ===== INTRA-COUNTRY (Poland → Poland) =====
    poland_unis = uni_by_country.get("Poland", [])
    for i in range(min(2, len(poland_unis) - 1)):
        src = poland_unis[i]
        dst = poland_unis[i + 1]
        savings = abs(src["tuitionUsd"] - dst["tuitionUsd"]) * 2
        pathways.append(make_pathway(src, dst, 180, 240, "official",
            f"Intra-country: {src['name']} → {dst['name']}. ECTS credits fully transferable.",
            "GPA 2.5+, no language requirement (Polish). Transfer application via university admissions office.",
            savings, None))

    # ===== GEORGIA → TURKEY (Budget to mid-range) =====
    for i in range(2):
        src = u("Georgia", (i+2) % 4)
        dst = u("Turkey", (i+9) % 7)
        if src and dst:
            savings = max(0, (dst["tuitionUsd"] + dst["livingCostUsd"] - src["tuitionUsd"] - src["livingCostUsd"]) * 2)
            pathways.append(make_pathway(src, dst, 90, 180, "case-by-case",
                f"Regional transfer: {src['name']} → {dst['name']}. Credit evaluation by receiving faculty.",
                "GPA 2.5+, IELTS 6.0 or Turkish proficiency. Apostille on transcripts required.",
                savings, None))

    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(pathways, f, indent=2, ensure_ascii=False)

    # Summary
    from_countries = set(p["fromUniversity"]["country"] for p in pathways)
    to_countries = set(p["toUniversity"]["country"] for p in pathways)
    print(f"✓ Total pathways seeded: {len(pathways)}")
    print(f"  All marked isSample=true, source='seed'")
    print(f"  From countries ({len(from_countries)}): {sorted(from_countries)}")
    print(f"  To countries ({len(to_countries)}): {sorted(to_countries)}")
    print(f"  Fields per pathway: {list(pathways[0].keys())}")

    # Show 5 examples
    print(f"\n=== 5 EXAMPLE PATHWAYS ===")
    for p in pathways[:5]:
        pct = round(p["creditsAccepted"] / p["totalCredits"] * 100) if p["totalCredits"] > 0 else 0
        print(f"  {p['fromUniversity']['name'][:25]} → {p['toUniversity']['name'][:25]}")
        print(f"    Credits: {p['creditsAccepted']}/{p['totalCredits']} ({pct}%) | Savings: ${p['estimatedSavingsUsd']:,} | Type: {p['agreementType']}")
        print(f"    Field: {p.get('fieldOfStudy', 'Any')} | Conditions: {p['requirements'][:60]}...")

if __name__ == "__main__":
    main()
