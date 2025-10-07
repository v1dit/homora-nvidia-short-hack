from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Optional
import os

from smarty_client import fetch_smarty_properties
from normalize import normalize_property
from mock_data import MOCK_PROPERTIES

app = FastAPI(title="Homora Python Service")

class RawPayload(BaseModel):
    raw: Optional[Any] = None


@app.post('/property/parse')
async def parse_property(payload: RawPayload):
    raw = payload.raw if payload.raw is not None else {}
    try:
        normalized = normalize_property(raw)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    # If address is present, attempt to enrich from Smarty (best-effort)
    address = normalized.get('address')
    if address:
        try:
            smarty = fetch_smarty_properties(address)
            if smarty:
                normalized['smarty'] = smarty
        except Exception:
            # intentionally swallow Smarty errors to keep parse stable
            pass

    return normalized


@app.get('/property/mock')
async def get_mock():
    return MOCK_PROPERTIES
