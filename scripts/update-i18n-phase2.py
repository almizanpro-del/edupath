"""
Adds i18n keys for Phase 2 features:
  - Nav.myMatches, Nav.myEssays
  - Detail.programs.applyNow, Detail.programs.visitWebsite,
    Detail.programs.applicationFee
  - Detail.scholarships.applyNow
"""
import json
from pathlib import Path

NEW_KEYS_EN = {
    "Nav": {
        "myMatches": "My Matches",
        "myEssays": "My Essays",
    },
    "Detail": {
        "programs": {
            "applyNow": "Apply Now",
            "visitWebsite": "Visit Website",
            "applicationFee": "App. fee",
        },
        "scholarships": {
            "applyNow": "Apply for Scholarship",
        },
    },
}

NEW_KEYS_AR = {
    "Nav": {
        "myMatches": "تطابقاتي",
        "myEssays": "مراجعات مقالاتي",
    },
    "Detail": {
        "programs": {
            "applyNow": "قدم الآن",
            "visitWebsite": "زيارة الموقع",
            "applicationFee": "رسوم التقديم",
        },
        "scholarships": {
            "applyNow": "التقدم للمنحة",
        },
    },
}

def deep_merge(base, update):
    for k, v in update.items():
        if k in base and isinstance(base[k], dict) and isinstance(v, dict):
            deep_merge(base[k], v)
        else:
            base[k] = v
    return base

for filename, new_keys in [('en.json', NEW_KEYS_EN), ('ar.json', NEW_KEYS_AR)]:
    path = Path('messages') / filename
    data = json.loads(path.read_text(encoding='utf-8'))
    deep_merge(data, new_keys)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {path}')
