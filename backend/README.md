# INNATEAI Backend

Secure proxy between the React frontend and the Anthropic API. Keeps the API
key off the client. Stateless — no database.

## Stack

- Python 3.11
- FastAPI + Uvicorn
- Anthropic Python SDK
- python-dotenv

## Setup

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env and set ANTHROPIC_API_KEY
```

## Run

```powershell
uvicorn main:app --reload --port 8000
```

The API will be at `http://localhost:8000`. CORS is open to the Vite dev
server on ports 5173 and 5174.

## Endpoints

| Method | Path           | Purpose                                              |
| ------ | -------------- | ---------------------------------------------------- |
| GET    | `/health`      | Health check — returns `{status, model}`             |
| POST   | `/api/triage`  | Triage a batch of messages                           |
| POST   | `/api/briefing`| Generate the structured daily briefing               |
| GET    | `/api/flags`   | Filter a triage list down to flagged items (body)    |

### POST /api/triage

Request:
```json
{ "messages": [ { "id": 1, "channel": "email", "from": "...", "timestamp": "...", "body": "...", "subject": "..." } ] }
```

Response:
```json
{ "triage": [ { "id": 1, "category": "Decide", "reasoning": "...", "draft": "...", "urgency": 5, "flagged": true, "flag_severity": "Critical" } ] }
```

### POST /api/briefing

Request:
```json
{ "messages": [...], "triage": [...] }
```

Response:
```json
{
  "sections": [
    { "title": "Top Decisions Needed", "items": [{ "message_id": 1, "summary": "...", "action": "..." }] },
    { "title": "Delegated Actions",   "items": [...] },
    { "title": "Watch Items",         "items": [...] },
    { "title": "Quick Wins",          "items": [...] }
  ],
  "generated_at": "2026-05-13T12:00:00Z"
}
```

### GET /api/flags

Stateless filter — the client passes the triage payload in the request body:
```json
{ "triage": [ ...TriageItem... ] }
```

Response:
```json
{ "flags": [ { "id": 1, "flag_severity": "Critical", "reasoning": "..." } ] }
```

## Error handling

- **422** — invalid request body (FastAPI default validation).
- **502** — Claude returned malformed JSON. Body: `{ "error": "...", "raw": "..." }`.
- **500** — unhandled exception. The traceback is logged server-side; the
  response body never includes the API key.

## Claude rules

- Model: `claude-sonnet-4-6`
- `max_tokens`: 2000 for triage, 1500 for briefing
- System prompts end with the JSON-only instruction
- Any accidental fences are stripped before `json.loads`
