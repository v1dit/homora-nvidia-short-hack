from typing import Any, Dict


def normalize_property(raw: Any) -> Dict:
    # Minimal normalization logic mirroring the TS helper
    return {
        'id': str(raw.get('id') or raw.get('url') or raw.get('uid') or ''),
        'title': raw.get('title') or raw.get('name') or 'Untitled property',
        'price': (raw.get('price') if isinstance(raw.get('price'), (int, float)) else None),
        'description': raw.get('description') or raw.get('desc') or '',
        'address': raw.get('address') or '',
        'features': raw.get('features') if isinstance(raw.get('features'), list) else ([raw.get('features')] if raw.get('features') else []),
        'url': raw.get('url') or '',
        'fetchedAt': raw.get('fetchedAt') or None,
    }
