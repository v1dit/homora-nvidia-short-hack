import os
import requests
from typing import Optional, Dict
from dotenv import load_dotenv

load_dotenv()  # load .env.local if present

BASE_URL = 'https://property.api.smarty.com/v1/properties'


def fetch_smarty_properties(address: str) -> Optional[Dict]:
    headers = {}
    params = {'street': address}

    key = os.getenv('SMARTY_KEY')
    auth_id = os.getenv('SMARTY_AUTH_ID')
    auth_token = os.getenv('SMARTY_AUTH_TOKEN')

    if key:
        headers['Authorization'] = f'Bearer {key}'
    elif auth_id and auth_token:
        params['auth-id'] = auth_id
        params['auth-token'] = auth_token
    else:
        raise RuntimeError('Missing Smarty credentials in environment')

    resp = requests.get(BASE_URL, headers=headers, params=params, timeout=6)
    if resp.status_code != 200:
        return None

    try:
        data = resp.json()
    except Exception:
        return None

    p = (data[0]['property'] if isinstance(data, list) and len(data) > 0 and 'property' in data[0] else {})

    return {
        'zoning': p.get('zoning', 'N/A'),
        'tax_rate': (p.get('assessments') or [{}])[0].get('tax_rate', None),
        'year_built': p.get('year_built'),
        'lot_size': (p.get('area') or {}).get('lot'),
        'risk': p.get('risk'),
    }
