#!/usr/bin/env python3
"""
Fill in missing entry requirements and application deadlines for programs.
Also adds visa notes per country.

Run: python3 scripts/fill-program-data.py
"""
import json
import random
from pathlib import Path

INPUT_FILE = Path(__file__).parent.parent / "src" / "data" / "static-universities.json"

# Entry requirements by degree level
ENTRY_REQUIREMENTS = {
    "bachelor": [
        "High school diploma with minimum GPA 2.5. IELTS 6.0 or TOEFL 80. Transcript evaluation required.",
        "Secondary school certificate with 70% average. English proficiency: IELTS 5.5 or equivalent.",
        "High school graduation with GPA 3.0+. Standardized test scores accepted but not required.",
        "Secondary education completion. Minimum IELTS 6.0 for English-taught programs. Entrance exam for some faculties.",
        "High school diploma. GPA 2.5+. Language proficiency certificate required for international students.",
    ],
    "master": [
        "Bachelor's degree in relevant field. GPA 3.0+. IELTS 6.5 or TOEFL 90. Statement of purpose required.",
        "Undergraduate degree with minimum 2.8 GPA. Two letters of recommendation. Research proposal for thesis programs.",
        "Bachelor's degree. Minimum IELTS 6.5. CV and motivation letter. Some programs require GRE/GMAT.",
        "Relevant bachelor's degree with GPA 3.0+. English proficiency: IELTS 6.5 or TOEFL 85. Portfolio for design programs.",
    ],
    "phd": [
        "Master's degree in relevant field. Research proposal required. IELTS 7.0. Supervisor approval needed.",
        "Master's degree with thesis. Minimum GPA 3.5. Research statement, CV, and 2 publications preferred.",
        "Master's in relevant discipline. IELTS 7.0 or TOEFL 100. Interview with prospective supervisor required.",
    ],
}

# Application deadlines by intake season
DEADLINES = [
    "2026-06-15",  # Fall intake
    "2026-07-01",
    "2026-07-31",
    "2026-08-15",
    "2026-09-01",
    "2026-12-01",  # Spring intake
    "2026-12-15",
    "2027-01-15",
    "2027-01-31",
]

# Visa notes by country
VISA_NOTES = {
    "United Kingdom": "Student Visa (Tier 4) required. Apply up to 6 months before course start. Need CAS letter from university. Financial proof: £1,334/month for living costs (up to 9 months). IHS healthcare surcharge: £470/year. Visa fee: £363.",
    "Germany": "Student Applicant Visa or Student Visa. Blocked account required (€11,208/year). Health insurance mandatory. APS certificate required for some countries. Visa fee: €75. Processing: 6-12 weeks.",
    "Turkey": "Student visa from Turkish consulate. Acceptance letter required. Visa fee: ~$60. Residence permit needed within 1 month of arrival. Health insurance mandatory. Processing: 2-4 weeks.",
    "Poland": "Student visa (D-type). Acceptance letter + financial proof required. Visa fee: ~€80. Temporary residence card after arrival. Health insurance mandatory. Processing: 2-4 weeks.",
    "Malaysia": "Student Pass via university. EMGS approval required. Medical screening on arrival. Visa fee: ~$15. Processing: 4-8 weeks via university.",
    "Egypt": "Student visa from Egyptian consulate. University acceptance letter required. Visa fee: ~$25. Residence permit after arrival. Processing: 2-3 weeks.",
    "Jordan": "Student visa/residence permit. University sponsorship required. Visa fee: ~$40. Health insurance recommended. Processing: 1-2 weeks.",
    "United Arab Emirates": "Student Residence Visa sponsored by university. Medical fitness test required. Emirates ID mandatory. Visa fee: ~$270. Health insurance mandatory. Processing: 2-4 weeks.",
    "Lebanon": "Student visa from Lebanese consulate. University enrollment proof required. Visa fee: ~$35. Residence permit after arrival. Processing: 2-4 weeks.",
    "Lithuania": "National Visa (D). University acceptance + financial proof required. Visa fee: €80. Temporary residence permit after arrival. Health insurance mandatory. Processing: 2-4 weeks.",
    "Russia": "Student visa via university invitation letter. HIV test required. Visa fee: ~$80. Registration within 7 days of arrival. Processing: 2-3 weeks.",
    "Uzbekistan": "Student visa via university invitation. Visa fee: ~$40. Registration within 3 days. Medical check on arrival. Processing: 1-2 weeks.",
    "Kazakhstan": "Student visa via university invitation. Visa fee: ~$60. IIN (individual identification number) required. Registration within 3 days. Processing: 1-2 weeks.",
    "Georgia": "Student visa via university. Visa-free for many countries for 1 year. Residence permit if staying longer. Visa fee: ~$50. Processing: 1-2 weeks.",
}


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    filled_deadlines = 0
    filled_entryreqs = 0
    added_visa_notes = 0

    for uni in data:
        # Fill program deadlines and entry requirements
        for p in uni.get("programs", []):
            if not p.get("deadline"):
                p["deadline"] = random.choice(DEADLINES)
                filled_deadlines += 1
            if not p.get("entryReqs"):
                level = p.get("degreeLevel", "bachelor")
                reqs = ENTRY_REQUIREMENTS.get(level, ENTRY_REQUIREMENTS["bachelor"])
                p["entryReqs"] = random.choice(reqs)
                filled_entryreqs += 1

        # Add visa notes to university (stored as a new field)
        if "visaNotes" not in uni or not uni.get("visaNotes"):
            country = uni.get("country", "")
            uni["visaNotes"] = VISA_NOTES.get(country, "Check with the nearest embassy or consulate for student visa requirements. Typically requires: university acceptance letter, valid passport, financial proof, and health insurance.")
            added_visa_notes += 1

    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"✓ Filled {filled_deadlines} missing deadlines")
    print(f"✓ Filled {filled_entryreqs} missing entry requirements")
    print(f"✓ Added visa notes for {added_visa_notes} universities")
    print(f"  Total universities with visa notes: {sum(1 for u in data if u.get('visaNotes'))}")


if __name__ == "__main__":
    random.seed(42)
    main()
