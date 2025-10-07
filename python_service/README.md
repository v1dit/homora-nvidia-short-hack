# Homora Python Service

This is a minimal FastAPI service to mirror the property `parse` and `mock` endpoints in Python.

Quick start (recommended inside a virtual environment):

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Endpoints:
- POST /property/parse  — Accepts JSON { "raw": { ... } }
- GET  /property/mock   — Returns a small mock dataset

Environment:
- `SMARTY_KEY` or `SMARTY_AUTH_ID` + `SMARTY_AUTH_TOKEN` for Smarty Property API

