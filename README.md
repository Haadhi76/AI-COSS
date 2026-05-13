# INNATEAI — AI Chief of Staff

A full-stack AI assistant that triages messages, surfaces critical flags, and generates structured daily briefings using Claude. The Anthropic API key stays server-side — it never reaches the browser.

## Architecture

```
frontend/   React 18 + Vite + Tailwind CSS
backend/    FastAPI + Uvicorn (secure Claude proxy)
```

The frontend calls the FastAPI backend, which forwards requests to the Anthropic API and returns structured JSON. A lightweight SQLite store persists generated briefings for history retrieval.

## Project Structure

```
InnateAI/
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── Briefing.jsx
│   │   │   ├── Flags.jsx
│   │   │   ├── MessageCard.jsx
│   │   │   ├── MessageFlyout.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SkeletonLoader.jsx
│   │   │   ├── StatBar.jsx
│   │   │   └── Triage.jsx
│   │   └── lib/
│   │       ├── claude.js      ← backend API client
│   │       └── messages.js
│   └── package.json
└── backend/
    ├── main.py                ← FastAPI app + CORS + global error handler
    ├── db.py                  ← SQLite briefing persistence
    ├── routers/
    │   ├── triage.py          ← POST /api/triage
    │   ├── briefing.py        ← POST /api/briefing
    │   ├── flags.py           ← GET  /api/flags
    │   └── history.py         ← GET  /api/briefings/history
    ├── services/
    │   └── claude_service.py  ← Anthropic SDK calls + prompts
    ├── models/
    │   └── schemas.py         ← Pydantic request/response models
    ├── data/                  ← SQLite database (auto-created)
    ├── requirements.txt
    ├── .env.example
    └── README.md
```

## Requirements

| Layer    | Requirement         |
|----------|---------------------|
| Frontend | Node.js 18+         |
| Backend  | Python 3.11+        |
| API key  | Anthropic API key   |

## Setup

### Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
# Edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend

```powershell
cd frontend
npm install
```

Create `frontend/.env.local`:
```
VITE_API_BASE_URL=http://localhost:8000
```

## Running

Start both servers in separate terminals:

```powershell
# Terminal 1 — backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Frontend: `http://localhost:5173`
Backend API: `http://localhost:8000`

## API Endpoints

| Method | Path                     | Purpose                                    |
|--------|--------------------------|--------------------------------------------|
| GET    | `/health`                | Health check — returns `{status, model}`   |
| POST   | `/api/triage`            | Triage a batch of messages via Claude      |
| POST   | `/api/briefing`          | Generate a structured daily briefing       |
| GET    | `/api/flags`             | Filter triage results to flagged items     |
| GET    | `/api/briefings/history` | List previously saved briefings (SQLite)   |

Full endpoint documentation is in [`backend/README.md`](backend/README.md).

## Tech Stack

**Frontend**
- React 18, Vite 5, Tailwind CSS 3
- `lucide-react` for icons

**Backend**
- FastAPI, Uvicorn
- Anthropic Python SDK (`claude-sonnet-4-6`)
- Pydantic v2 for schema validation
- SQLite (via stdlib `sqlite3`) for briefing history
- `python-dotenv` for env management
