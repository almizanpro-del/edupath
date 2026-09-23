#!/usr/bin/env python3
"""
Add universities from Russia, Uzbekistan, Kazakhstan, and Georgia to
the static-universities.json file.

Run: python3 scripts/add-eurasian-universities.py
"""
import json
import uuid
from pathlib import Path

INPUT_FILE = Path(__file__).parent.parent / "src" / "data" / "static-universities.json"

def gen_id():
    return f"cus{uuid.uuid4().hex[:20]}"

def slugify(name):
    import re
    s = name.lower().strip()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")

def make_uni(name, country, city, website, tuition, living, intl_pct, acceptance, currency, desc_en, desc_ar, programs, scholarships=None):
    slug = slugify(name)
    return {
        "id": gen_id(),
        "slug": slug,
        "name": name,
        "country": country,
        "city": city,
        "website": website,
        "tuitionUsd": tuition,
        "livingCostUsd": living,
        "intlStudentPct": intl_pct,
        "acceptanceRate": acceptance,
        "currency": currency,
        "logoUrl": f"https://www.google.com/s2/favicons?domain={website.split('//')[1].split('/')[0]}&sz=128",
        "descriptionEn": desc_en,
        "descriptionAr": desc_ar,
        "programs": [
            {
                "id": gen_id(),
                "name": p["name"],
                "degreeLevel": p["level"],
                "field": p["field"],
                "durationMonths": p["duration"],
                "language": p["lang"],
                "tuitionUsd": p.get("tuition", tuition),
                "deadline": None,
                "entryReqs": None,
            }
            for p in programs
        ],
        "scholarships": scholarships or [],
        "reviews": [],
        "avgRating": None,
        "reviewCount": 0,
        "cheapestProgramTuition": min((p.get("tuition", tuition) for p in programs), default=tuition),
    }

NEW_UNIVERSITIES = [
    # === RUSSIA ===
    make_uni(
        "Lomonosov Moscow State University", "Russia", "Moscow",
        "https://www.msu.ru", 4500, 6000, 15, 25, "RUB",
        "Russia's oldest and most prestigious university, founded in 1755. Offers programs in natural sciences, humanities, and engineering with some English-taught options.",
        "أقدم وأعرق جامعة في روسيا، تأسست عام 1755. تقدم برامج في العلوم الطبيعية والإنسانيات والهندسة مع بعض الخيارات باللغة الإنجليزية.",
        [
            {"name": "BSc Mathematics (English)", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 6000},
            {"name": "MSc Computer Science", "level": "master", "field": "Computer Science", "duration": 24, "lang": "English", "tuition": 7000},
            {"name": "MBBS General Medicine", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "Russian", "tuition": 5000},
        ],
        [{"id": gen_id(), "name": "MSU International Grant", "amountUsd": 4000, "amountType": "partial", "eligibility": "International students with high academic achievement", "deadline": None}],
    ),
    make_uni(
        "Saint Petersburg State University", "Russia", "Saint Petersburg",
        "https://spbu.ru", 4200, 5500, 18, 30, "RUB",
        "Founded in 1724, one of Russia's leading research universities. Strong in physics, mathematics, and liberal arts.",
        "تأسست عام 1724، إحدى أبرز جامعات البحث في روسيا. قوية في الفيزياء والرياضيات والفنون الحرة.",
        [
            {"name": "MSc Physics", "level": "master", "field": "Engineering", "duration": 24, "lang": "English", "tuition": 5000},
            {"name": "BSc Economics", "level": "bachelor", "field": "Business", "duration": 48, "lang": "Russian", "tuition": 4200},
        ],
    ),
    make_uni(
        "Bauman Moscow State Technical University", "Russia", "Moscow",
        "https://bmstu.ru", 5000, 6000, 12, 35, "RUB",
        "Russia's premier technical university, specializing in engineering, robotics, and aerospace. Strong industry connections.",
        "أبرز جامعة تقنية في روسيا، متخصصة في الهندسة والروبوتات والفضاء. روابط قوية مع الصناعة.",
        [
            {"name": "BSc Aerospace Engineering", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "Russian", "tuition": 5000},
            {"name": "MSc Robotics", "level": "master", "field": "Engineering", "duration": 24, "lang": "English", "tuition": 6000},
        ],
    ),
    make_uni(
        "ITMO University", "Russia", "Saint Petersburg",
        "https://en.itmo.ru", 5500, 5500, 25, 40, "RUB",
        "Leading IT and computer science university in Russia. Known for competitive programming and innovative tech programs in English.",
        "جامعة رائدة في تكنولوجيا المعلومات وعلوم الحاسوب في روسيا. معروفة بالبرمجة التنافسية والبرامج التقنية المبتكرة باللغة الإنجليزية.",
        [
            {"name": "BSc Computer Science (English)", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 5500},
            {"name": "MSc Information Technology", "level": "master", "field": "Computer Science", "duration": 24, "lang": "English", "tuition": 6500},
        ],
        [{"id": gen_id(), "name": "ITMO International Scholarship", "amountUsd": 3000, "amountType": "partial", "eligibility": "International students", "deadline": None}],
    ),
    make_uni(
        "Kazan Federal University", "Russia", "Kazan",
        "https://kpfu.ru", 3500, 4500, 20, 45, "RUB",
        "One of Russia's oldest universities (founded 1804). Strong in physics, chemistry, and linguistics. Affordable tuition.",
        "إحدى أقدم جامعات روسيا (تأسست 1804). قوية في الفيزياء والكيمياء واللسانيات. رسوم دراسية ميسورة.",
        [
            {"name": "BSc Petroleum Engineering", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "Russian", "tuition": 3500},
            {"name": "MBBS Medicine", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "Russian", "tuition": 4000},
        ],
    ),
    make_uni(
        "Peoples' Friendship University of Russia", "Russia", "Moscow",
        "https://rudn.ru", 4500, 6000, 35, 50, "RUB",
        "Known for its international focus, with students from 160+ countries. Offers medicine, engineering, and humanities in English and Russian.",
        "معروفة بانفتاحها الدولي، مع طلاب من أكثر من 160 دولة. تقدم الطب والهندسة والإنسانيات باللغتين الإنجليزية والروسية.",
        [
            {"name": "MBBS Medicine (English)", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "English", "tuition": 6000},
            {"name": "BSc Pharmacy (English)", "level": "bachelor", "field": "Medicine", "duration": 60, "lang": "English", "tuition": 5000},
        ],
        [{"id": gen_id(), "name": "RUDN International Grant", "amountUsd": 2500, "amountType": "partial", "eligibility": "Students from developing countries", "deadline": None}],
    ),

    # === UZBEKISTAN ===
    make_uni(
        "National University of Uzbekistan", "Uzbekistan", "Tashkent",
        "https://nuu.uz", 2500, 3000, 10, 60, "UZS",
        "Uzbekistan's largest and oldest university, founded in 1918. Offers programs in natural sciences, humanities, and social sciences.",
        "أكبر وأقدم جامعة في أوزبكستان، تأسست عام 1918. تقدم برامج في العلوم الطبيعية والإنسانيات والعلوم الاجتماعية.",
        [
            {"name": "BSc Mathematics", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "Russian", "tuition": 2500},
            {"name": "BSc Chemistry", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "Russian", "tuition": 2500},
        ],
    ),
    make_uni(
        "Tashkent University of Information Technologies", "Uzbekistan", "Tashkent",
        "https://tuit.uz", 3000, 3000, 15, 55, "UZS",
        "Leading IT university in Central Asia. Offers software engineering, cybersecurity, and telecommunications programs.",
        "جامعة تكنولوجيا المعلومات الرائدة في آسيا الوسطى. تقدم برامج هندسة البرمجيات والأمن السيبراني والاتصالات.",
        [
            {"name": "BSc Software Engineering", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 3000},
            {"name": "BSc Telecommunications", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "Russian", "tuition": 2800},
        ],
    ),
    make_uni(
        "Westminster International University in Tashkent", "Uzbekistan", "Tashkent",
        "https://wiut.uz", 5000, 3500, 40, 65, "UZS",
        "British-style university offering UK degrees in business, economics, and IT. All programs taught in English.",
        "جامعة على الطراز البريطاني تقدم شهادات بريطانية في الأعمال والاقتصاد وتكنولوجيا المعلومات. جميع البرامج باللغة الإنجليزية.",
        [
            {"name": "BSc Business Computing", "level": "bachelor", "field": "Computer Science", "duration": 36, "lang": "English", "tuition": 5000},
            {"name": "BA Business Management", "level": "bachelor", "field": "Business", "duration": 36, "lang": "English", "tuition": 4500},
        ],
        [{"id": gen_id(), "name": "WIUT Scholarship", "amountUsd": 2000, "amountType": "partial", "eligibility": "High-achieving international students", "deadline": None}],
    ),
    make_uni(
        "Tashkent Medical Academy", "Uzbekistan", "Tashkent",
        "https://tma.uz", 3500, 3000, 20, 55, "UZS",
        "One of Central Asia's leading medical institutions. Offers MBBS programs in English for international students.",
        "إحدى أبرز المؤسسات الطبية في آسيا الوسطى. تقدم برامج الطب باللغة الإنجليزية للطلاب الدوليين.",
        [
            {"name": "MBBS General Medicine (English)", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "English", "tuition": 3500},
            {"name": "BDS Dentistry", "level": "bachelor", "field": "Medicine", "duration": 60, "lang": "Russian", "tuition": 3200},
        ],
    ),
    make_uni(
        "Samarkand State University", "Uzbekistan", "Samarkand",
        "https://samdu.uz", 2200, 2500, 8, 65, "UZS",
        "Historic university in the ancient Silk Road city of Samarkand. Strong in history, archaeology, and natural sciences.",
        "جامعة تاريخية في مدينة سمرقند العريقة على طريق الحرير. قوية في التاريخ والآثار والعلوم الطبيعية.",
        [
            {"name": "BA History", "level": "bachelor", "field": "Social Sciences", "duration": 48, "lang": "Russian", "tuition": 2200},
            {"name": "BSc Biology", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "Russian", "tuition": 2200},
        ],
    ),

    # === KAZAKHSTAN ===
    make_uni(
        "Kazakh National University", "Kazakhstan", "Almaty",
        "https://kaznu.kz", 3500, 4000, 12, 50, "KZT",
        "Kazakhstan's oldest and most comprehensive university. Offers programs in sciences, humanities, and engineering.",
        "أقدم وأشمل جامعة في كازاخستان. تقدم برامج في العلوم والإنسانيات والهندسة.",
        [
            {"name": "BSc Computer Science", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 3500},
            {"name": "BSc Mechanical Engineering", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "Russian", "tuition": 3000},
        ],
    ),
    make_uni(
        "Nazarbayev University", "Kazakhstan", "Astana",
        "https://nu.edu.kz", 8000, 5000, 30, 35, "KZT",
        "Kazakhstan's premier English-medium university, partnered with Duke, UCL, and other top schools. Western-style education.",
        "جامعة كازاخستان الأولى باللغة الإنجليزية، بشراكة مع Duke و UCL وغيرها. تعليم على الطراز الغربي.",
        [
            {"name": "BSc Computer Science", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 8000},
            {"name": "BSc Engineering", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "English", "tuition": 8000},
            {"name": "MBA Business Administration", "level": "master", "field": "Business", "duration": 24, "lang": "English", "tuition": 12000},
        ],
        [{"id": gen_id(), "name": "NU Merit Scholarship", "amountUsd": 5000, "amountType": "partial", "eligibility": "Top international applicants", "deadline": None}],
    ),
    make_uni(
        "Kazakh-British Technical University", "Kazakhstan", "Almaty",
        "https://kbtu.kz", 5000, 4000, 25, 45, "KZT",
        "British-style technical university offering dual-degree programs with UK universities. Strong in IT and engineering.",
        "جامعة تقنية على الطراز البريطاني تقدم برامج شهادات مزدوجة مع جامعات المملكة المتحدة. قوية في تكنولوجيا المعلومات والهندسة.",
        [
            {"name": "BSc Computer Science", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 5000},
            {"name": "BSc Oil and Gas Engineering", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "English", "tuition": 5500},
        ],
    ),
    make_uni(
        "KIMEP University", "Kazakhstan", "Almaty",
        "https://kimep.kz", 6000, 4000, 35, 55, "KZT",
        "American-style business and economics university in Central Asia. All programs in English with US-style curriculum.",
        "جامعة أعمال واقتصاد على الطراز الأمريكي في آسيا الوسطى. جميع البرامج باللغة الإنجليزية مع منهج على الطراز الأمريكي.",
        [
            {"name": "BBA Business Administration", "level": "bachelor", "field": "Business", "duration": 48, "lang": "English", "tuition": 6000},
            {"name": "BSc Economics", "level": "bachelor", "field": "Business", "duration": 48, "lang": "English", "tuition": 5500},
        ],
        [{"id": gen_id(), "name": "KIMEP Scholarship", "amountUsd": 3000, "amountType": "partial", "eligibility": "International students with high GPA", "deadline": None}],
    ),
    make_uni(
        "Astana Medical University", "Kazakhstan", "Astana",
        "https://amu.kz", 4500, 4000, 22, 50, "KZT",
        "Leading medical university in Kazakhstan. Offers MBBS in English for international students, recognized by WHO.",
        "جامعة طبية رائدة في كازاخستان. تقدم الطب باللغة الإنجليزية للطلاب الدوليين، معترف بها من منظمة الصحة العالمية.",
        [
            {"name": "MBBS General Medicine (English)", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "English", "tuition": 4500},
            {"name": "BDS Dentistry (English)", "level": "bachelor", "field": "Medicine", "duration": 60, "lang": "English", "tuition": 4000},
        ],
    ),

    # === GEORGIA ===
    make_uni(
        "Tbilisi State University", "Georgia", "Tbilisi",
        "https://tsu.ge", 3000, 3500, 15, 55, "GEL",
        "Georgia's oldest university, founded in 1918. Comprehensive research university with strong natural sciences and humanities.",
        "أقدم جامعة في جورجيا، تأسست عام 1918. جامعة بحثية شاملة مع علوم طبيعية وإنسانيات قوية.",
        [
            {"name": "BSc Computer Science", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 3000},
            {"name": "MBBS Medicine", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "English", "tuition": 4000},
        ],
    ),
    make_uni(
        "Tbilisi State Medical University", "Georgia", "Tbilisi",
        "https://tsmu.edu", 5000, 3500, 40, 50, "GEL",
        "Georgia's premier medical university. Popular destination for international students seeking MBBS in English.",
        "أبرز جامعة طبية في جورجيا. وجهة شهيرة للطلاب الدوليين الذين يبحثون عن دراسة الطب باللغة الإنجليزية.",
        [
            {"name": "MBBS General Medicine (English)", "level": "bachelor", "field": "Medicine", "duration": 72, "lang": "English", "tuition": 5000},
            {"name": "BDS Dentistry (English)", "level": "bachelor", "field": "Medicine", "duration": 60, "lang": "English", "tuition": 4500},
            {"name": "Pharmacy (English)", "level": "bachelor", "field": "Medicine", "duration": 48, "lang": "English", "tuition": 4000},
        ],
        [{"id": gen_id(), "name": "TSMU International Scholarship", "amountUsd": 2000, "amountType": "partial", "eligibility": "International students with strong academic record", "deadline": None}],
    ),
    make_uni(
        "Georgian Technical University", "Georgia", "Tbilisi",
        "https://gtu.ge", 3500, 3500, 18, 60, "GEL",
        "Georgia's leading engineering and technology university. Offers programs in civil, mechanical, and electrical engineering.",
        "جامعة الهندسة والتكنولوجيا الرائدة في جورجيا. تقدم برامج في الهندسة المدنية والميكانيكية والكهربائية.",
        [
            {"name": "BSc Civil Engineering", "level": "bachelor", "field": "Engineering", "duration": 48, "lang": "English", "tuition": 3500},
            {"name": "BSc Computer Engineering", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 3800},
        ],
    ),
    make_uni(
        "Free University of Tbilisi", "Georgia", "Tbilisi",
        "https://freeuni.edu.ge", 4500, 3500, 30, 45, "GEL",
        "Private university with strong international partnerships. Known for business, law, and computer science programs in English.",
        "جامعة خاصة بشراكات دولية قوية. معروفة ببرامج الأعمال والقانون وعلوم الحاسوب باللغة الإنجليزية.",
        [
            {"name": "BSc Computer Science", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 4500},
            {"name": "BA Business Administration", "level": "bachelor", "field": "Business", "duration": 48, "lang": "English", "tuition": 4500},
        ],
    ),
    make_uni(
        "Caucasus University", "Georgia", "Tbilisi",
        "https://cu.edu.ge", 4000, 3500, 28, 55, "GEL",
        "Private university focused on business, law, and IT. Offers English-language programs with international exchange opportunities.",
        "جامعة خاصة تركز على الأعمال والقانون وتكنولوجيا المعلومات. تقدم برامج باللغة الإنجليزية مع فرص تبادل دولية.",
        [
            {"name": "BBA Business Administration", "level": "bachelor", "field": "Business", "duration": 48, "lang": "English", "tuition": 4000},
            {"name": "BSc Information Technology", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 4200},
        ],
    ),
    make_uni(
        "Ilia State University", "Georgia", "Tbilisi",
        "https://iliauni.edu.ge", 3500, 3500, 20, 50, "GEL",
        "Research-focused university with strong programs in natural sciences, computer science, and international relations.",
        "جامعة تركز على البحث مع برامج قوية في العلوم الطبيعية وعلوم الحاسوب والعلاقات الدولية.",
        [
            {"name": "BSc Computer Science", "level": "bachelor", "field": "Computer Science", "duration": 48, "lang": "English", "tuition": 3500},
            {"name": "BA International Relations", "level": "bachelor", "field": "Social Sciences", "duration": 48, "lang": "English", "tuition": 3300},
        ],
    ),
]


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    existing_slugs = {u["slug"] for u in data}
    existing_countries = {u["country"] for u in data}

    added = 0
    skipped = 0
    for uni in NEW_UNIVERSITIES:
        if uni["slug"] in existing_slugs:
            print(f"  SKIP (already exists): {uni['name']}")
            skipped += 1
            continue
        data.append(uni)
        existing_slugs.add(uni["slug"])
        added += 1
        print(f"  ADD: {uni['name']} ({uni['country']})")

    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"\n✓ Added {added} universities, skipped {skipped}")
    print(f"  Total in file: {len(data)}")

    all_countries = sorted({u["country"] for u in data})
    print(f"  Countries ({len(all_countries)}): {', '.join(all_countries)}")


if __name__ == "__main__":
    main()
