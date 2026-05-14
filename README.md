# INNATEAI — AI Chief of Staff

[![License: Source Available](https://img.shields.io/badge/license-Source%20Available%20NC-blue)](LICENSE)

A full-stack AI assistant that triages messages, surfaces critical flags, and generates structured daily briefings using Claude. The Anthropic API key stays server-side — it never reaches the browser.

> Source code is publicly visible for educational and personal use only. Commercial use is prohibited — see [LICENSE](LICENSE) and [TERMS](TERMS.md) for details.

## Core Capabilities

A working system with a web UI that produces:

**Triage**
Every message classified as:
• Ignore — no CEO involvement needed
• Delegate — assign to the right person with a drafted handoff
• Decide — the CEO must act personally
For each: which category and why, and a drafted response.

**Flags**
Anything the CEO should know about.

**Daily Briefing & Tracking**
One page the CEO reads in under 2 minutes. Includes interactive task completion (mark as done) and a "Day Wrapped" summary when finished.

**Interactive Triage Adjustments**
From the side window (Message Flyout), users can manually adjust and override the AI's suggested category (Decide / Delegate / Ignore) and the UI seamlessly updates across the Briefing and Triage grids.

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
│   │       ├── api.js         ← backend API client
│   │       ├── messages.js    ← mock dataset
│   │       └── theme.js       ← shared UI styles and tag metadata
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

| Method | Path                               | Purpose                                    |
|--------|------------------------------------|--------------------------------------------|
| GET    | `/health`                          | Health check — returns `{status, model}`   |
| POST   | `/api/triage`                      | Triage a batch of messages via Claude      |
| POST   | `/api/briefing`                    | Generate a structured daily briefing       |
| POST   | `/api/briefing/today`              | Run triage + briefing for today (persists) |
| PATCH  | `/api/briefing/today/completion`   | Toggle message completion status           |
| PATCH  | `/api/briefing/today/override`     | Override Claude's category for a message   |
| GET    | `/api/flags`                       | Filter triage results to flagged items     |
| GET    | `/api/briefings/history`           | List previously saved briefings (SQLite)   |

Full endpoint documentation is in [`backend/README.md`](backend/README.md).

## MVP Status & Limitations

This project is currently an MVP (Minimum Viable Product). Some functionality may not work fully in a production context because of missing components:

- **Send Integration**: "Approve & Send" is currently visual-only. There is no live integration with external email, Slack, or WhatsApp APIs.
- **Authentication**: There is no authentication system; any local client can read or mutate the briefing data.
- **Database Backend**: Uses SQLite as the persistence layer, which is not suitable for concurrent multi-user production load.
- **CORS Config**: Setup is currently hardcoded for local development environments (`localhost`).
- **Triage Reruns**: Triage cannot be re-run on demand without a full refresh if messages change mid-day.

## Tech Stack

**Frontend**
- React 18, Vite 5, Tailwind CSS 3
- `lucide-react` for icons
- Vitest, React Testing Library for TDD unit testing

**Backend**
- FastAPI, Uvicorn
- Anthropic Python SDK (`claude-sonnet-4-6`)
- Pydantic v2 for schema validation
- SQLite (via stdlib `sqlite3`) for briefing history
- `python-dotenv` for env management
