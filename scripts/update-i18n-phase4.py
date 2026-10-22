"""Adds Nav.myApplications i18n key."""
import json
from pathlib import Path

for filename, value in [('en.json', 'My Applications'), ('ar.json', 'طلباتي')]:
    path = Path('messages') / filename
    data = json.loads(path.read_text(encoding='utf-8'))
    data.setdefault('Nav', {})['myApplications'] = value
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {path}')
