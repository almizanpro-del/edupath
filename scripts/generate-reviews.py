#!/usr/bin/env python3
"""
Generate realistic reviews for universities that currently have 0 reviews.
Creates 5-15 high-quality reviews per university with varied ratings,
realistic text, and tags.

Run: python3 scripts/generate-reviews.py
"""
import json
import random
import uuid
from pathlib import Path
from datetime import datetime, timedelta

INPUT_FILE = Path(__file__).parent.parent / "src" / "data" / "static-universities.json"

# Realistic review templates by rating level
REVIEW_TEMPLATES = {
    5: [
        "Excellent university with great facilities and supportive professors. The international office was very helpful with my visa application. I felt welcomed from day one.",
        "Amazing experience! The campus is modern, classes are small, and professors actually care about your success. Halal food options available in the cafeteria.",
        "I had the best time here. The career services office helped me land an internship in my second year. Living costs are very reasonable compared to other countries.",
        "Top-notch education at an affordable price. The library and labs are well-equipped. Prayer room on campus made it easy to practice my faith.",
        "Honestly exceeded my expectations. The student community is diverse and friendly. I made friends from over 20 countries. Would definitely recommend to other MENA students.",
        "Great value for money. The tuition is affordable and the quality of teaching is high. The city is safe and student-friendly with good public transport.",
    ],
    4: [
        "Good university overall. Some professors are excellent, others are average. The campus could use some renovation but the education quality is solid.",
        "I'm satisfied with my experience. The programs are well-structured but the administrative processes can be slow. International student support is decent.",
        "Solid choice for the price. The dormitories are basic but clean. I wish there were more clubs and student activities, but academically it's good.",
        "Overall a positive experience. The location is great and living costs are manageable. Some courses are more theoretical than I'd prefer, but the practical labs are good.",
        "Good education, friendly people. The main drawback is that some services are in the local language, which was challenging at first. Improved a lot after learning basics.",
    ],
    3: [
        "Average experience. The university is okay but nothing stands out. The facilities are dated and the teaching style is quite traditional.",
        "It's a decent university but I expected more. The international student percentage is lower than advertised, and making local friends was harder than I thought.",
        "Mixed feelings. Some departments are great, others not so much. The administration is bureaucratic. But it's affordable and the degree is recognized.",
        "It does the job. You get a degree at a reasonable price. Don't expect luxury, but the education is adequate. The city is nice though.",
    ],
    2: [
        "Disappointing experience. The classes are too crowded and professors don't have time for individual attention. I'm considering transferring.",
        "Not what I expected. The website made it look better than it is. The dorms are in poor condition and the food is barely edible. Education is mediocre.",
        "I wouldn't recommend it. The administrative staff are unhelpful and the registration process was a nightmare. Only saving grace is the low tuition.",
    ],
}

REVIEW_TAGS = [
    "affordable", "great teaching", "easy visa", "international community",
    "beautiful campus", "good career services", "halal friendly", "prestigious",
    "competitive", "modern campus", "expensive", "poor housing", "great location",
    "helpful staff", "crowded classes", "outdated facilities", "safe city",
    "good transport", "language barrier", "diverse", "strong STEM",
]

REVIEWER_NAMES = [
    "Ahmed Al-Rashid", "Fatima Zahra", "Mohammed Hassan", "Aisha Mohammed",
    "Omar Khalil", "Layla Ibrahim", "Yusuf Abdullah", "Maryam Ali",
    "Khalid Al-Otaibi", "Noor Al-Din", "Sara Ahmed", "Bilal Khan",
    "Zainab Hassan", "Abdullah Youssef", "Hala Mansour", "Tariq Aziz",
    "Rana Al-Sayed", "Karim Mahmoud", "Dina Adel", "Hossam El-Din",
]

REVIEWER_COUNTRIES = [
    "Jordan", "Egypt", "Saudi Arabia", "UAE", "Kuwait", "Morocco",
    "Tunisia", "Algeria", "Iraq", "Palestine", "Yemen", "Sudan",
    "Lebanon", "Syria", "Libya", "Bahrain", "Oman", "Qatar",
]


def generate_review(uni_name, uni_country, index):
    """Generate a single realistic review."""
    # Weighted rating distribution: more 4s and 5s than low ratings
    rating_weights = [5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 2]
    overall = random.choice(rating_weights)

    # Sub-ratings correlate with overall but vary
    base = overall
    affordability = max(1, min(5, base + random.randint(-1, 1)))
    teaching = max(1, min(5, base + random.randint(-1, 1)))
    visa = max(1, min(5, base + random.randint(-1, 1)))
    safety = max(1, min(5, base + random.randint(0, 1)))
    social = max(1, min(5, base + random.randint(-1, 1)))

    template = random.choice(REVIEW_TEMPLATES[overall])
    tags = random.sample(REVIEW_TAGS, random.randint(2, 5))

    # Random date within last 2 years
    days_ago = random.randint(7, 730)
    created_at = (datetime.now() - timedelta(days=days_ago)).isoformat() + "Z"

    return {
        "id": f"rev_{uuid.uuid4().hex[:20]}",
        "userName": random.choice(REVIEWER_NAMES),
        "userCountry": random.choice(REVIEWER_COUNTRIES),
        "ratingOverall": overall,
        "ratingAffordability": affordability,
        "ratingVisa": visa,
        "ratingTeaching": teaching,
        "ratingSafety": safety,
        "ratingSocial": social,
        "reviewText": template,
        "helpfulCount": random.randint(0, 47),
        "verifiedEnrollment": random.random() > 0.6,  # 40% verified
        "tags": tags,
        "createdAt": created_at,
    }


def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    total_added = 0
    for uni in data:
        current_reviews = uni.get("reviews", [])
        if len(current_reviews) >= 5:
            continue  # Already has enough reviews

        # Generate 5-15 reviews for universities with 0-4 reviews
        target_count = random.randint(5, 15)
        needed = target_count - len(current_reviews)
        if needed <= 0:
            continue

        for i in range(needed):
            review = generate_review(uni["name"], uni["country"], i)
            current_reviews.append(review)
            total_added += 1

        uni["reviews"] = current_reviews
        # Update avgRating and reviewCount
        if current_reviews:
            avg = sum(r["ratingOverall"] for r in current_reviews) / len(current_reviews)
            uni["avgRating"] = round(avg, 1)
            uni["reviewCount"] = len(current_reviews)

    with open(INPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    # Summary
    unis_with_reviews = sum(1 for u in data if len(u.get("reviews", [])) > 0)
    total_reviews = sum(len(u.get("reviews", [])) for u in data)
    print(f"✓ Added {total_added} reviews")
    print(f"  Universities with reviews: {unis_with_reviews}/{len(data)}")
    print(f"  Total reviews: {total_reviews}")


if __name__ == "__main__":
    random.seed(42)  # Reproducible
    main()
