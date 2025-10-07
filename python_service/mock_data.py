from typing import List, Dict
from datetime import datetime

MOCK_PROPERTIES: List[Dict] = [
    {
        'id': 'py-mock-1',
        'title': 'Cozy 1BR (Python)',
        'price': 199000,
        'description': 'A cozy 1-bedroom created by the Python service.',
        'address': '100 Python Ave, PyCity, CA',
        'features': ['1 bed', '1 bath', '500 sqft'],
        'url': 'https://example.com/py/mock-1',
        'fetchedAt': datetime.utcnow().isoformat(),
    },
]
