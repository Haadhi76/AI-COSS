# Recommendations 1–3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Discipline: red → green → refactor → commit. Never skip the "run and watch it fail" step.

**Goal:** Implement Recommendations.md items 1–3 — daily briefing todos with end-of-day summary, color-coded department capsules sourced from a new `Memory.md`, and a recategorize control in the message flyout.

**Architecture:** A new `POST /api/briefing/today` endpoint becomes the single fetch-or-create entry point for the live UI. State (completed message ids, user category overrides, day summary) lives on the day's row in the existing SQLite `briefings` table. A repo-root `Memory.md` is injected verbatim into Claude's triage system prompt; Claude returns a new `department` field per message that drives a hash-coded capsule on every card. Recategorize is a segmented control in the message flyout that PATCHes the same day row.

**Tech Stack:** Python 3.14 / FastAPI / Anthropic SDK / SQLite (backend); React 18 / Vite / Tailwind / Vitest + @testing-library/react (frontend); pytest (backend tests).

**Spec:** `docs/superpowers/specs/2026-05-14-recommendations-1-3-design.md` is the source of truth. If anything below contradicts the spec, fix the plan, not the spec.

---

## File Structure

**Backend — files to create:**
- `Memory.md` (repo root) — committed company directory injected into triage prompt.
- `backend/services/memory_service.py` — mtime-cached loader.
- `backend/routers/today.py` — new endpoints for today's briefing + completion + override.
- `tests/test_memory_service.py`
- `tests/test_triage_department.py`
- `tests/test_briefing_today.py`
- `tests/test_completion.py`
- `tests/test_overrides.py`
- `tests/test_day_summary.py`

**Backend — files to modify:**
- `backend/models/schemas.py` — add `department` to `TriageItem`; add new request/response models.
- `backend/services/claude_service.py` — inject Memory.md into triage prompt; ask Claude for `department`; add `run_day_summary`.
- `backend/db.py` — add `briefing_date` column + unique index; add `get_today`, `upsert_today`, `update_today_payload` helpers.
- `backend/main.py` — register new router.
- `tests/fixtures.py` — extend triage fixture with `department` field; add today/completion fixtures.
- `tests/test_triage.py`, `tests/test_briefing.py`, `tests/test_e2e.py` — assert new `department` field.

**Frontend — files to create:**
- `frontend/vitest.config.js`
- `frontend/src/test/setup.js`
- `frontend/src/__tests__/api.test.js`
- `frontend/src/__tests__/MessageCard.test.jsx`
- `frontend/src/__tests__/MessageFlyout.test.jsx`
- `frontend/src/__tests__/Briefing.test.jsx`
- `frontend/src/components/DayWrapped.jsx` — hero card for completed day.

**Frontend — files to modify:**
- `frontend/src/lib/claude.js` → renamed to `frontend/src/lib/api.js` — add today/completion/override calls.
- `frontend/src/App.jsx` — switch to `getTodayBriefing`; manage today state, optimistic mutations.
- `frontend/src/components/Briefing.jsx` — checkbox rows, Done divider, sink-to-bottom, DayWrapped card.
- `frontend/src/components/MessageCard.jsx` — department capsule + "edited" dot on overrides.
- `frontend/src/components/MessageFlyout.jsx` — category segmented control.
- `frontend/package.json` — add Vitest + RTL devDependencies + `test` scripts.

**Phases:**
1. Memory.md + department field (backend prompt + schema + tests + frontend capsule).
2. Persistent today's briefing (DB schema + today endpoint + App.jsx refactor).
3. Todo completion + day summary (PATCH endpoint + Briefing.jsx + DayWrapped).
4. Recategorize overrides (PATCH endpoint + MessageFlyout segmented control + App overrides).

Each phase ends with green backend + frontend tests and a commit.

---

# Phase 1 — Memory.md + Department Field

## Task 1: Add `department` to TriageItem schema

**Files:**
- Modify: `backend/models/schemas.py`
- Modify: `tests/fixtures.py`

- [ ] **Step 1: Update the fixture so triage responses carry a department.**

Edit `tests/fixtures.py`, replace `SAMPLE_TRIAGE_RESPONSE` with:

```python
SAMPLE_TRIAGE_RESPONSE = [
    {
        "id": 1,
        "category": "Decide",
        "reasoning": "Series B due diligence is on the critical path.",
        "draft": "Sarah - 10am Thursday works.",
        "urgency": 4,
        "flagged": False,
        "flag_severity": None,
        "department": "Investors",
    },
    {
        "id": 2,
        "category": "Ignore",
        "reasoning": "FYI update from engineering.",
        "draft": "No response needed.",
        "urgency": 1,
        "flagged": False,
        "flag_severity": None,
        "department": "Engineering",
    },
]
```

- [ ] **Step 2: Add an assertion to an existing triage test that will fail until the schema accepts the new field.**

In `tests/test_triage.py`, inside `test_triage_happy_path`, append two new assertions after the existing `assert body["triage"][0]["flag_severity"] is None` line:

```python
    assert body["triage"][0]["department"] == "Investors"
    assert body["triage"][1]["department"] == "Engineering"
```

- [ ] **Step 3: Run tests; verify they fail.**

```
pytest tests/test_triage.py::test_triage_happy_path -v
```

Expected: FAIL — Pydantic strips the unknown `department` key OR the assertion fails because the key is missing.

- [ ] **Step 4: Add `department` to `TriageItem`.**

Edit `backend/models/schemas.py`. Replace the `TriageItem` class with:

```python
class TriageItem(BaseModel):
    id: int
    category: Category
    reasoning: str
    draft: str
    urgency: int = Field(ge=1, le=5)
    flagged: bool
    flag_severity: Optional[FlagSeverity] = None
    department: str = "Unknown"
```

- [ ] **Step 5: Run tests; verify pass.**

```
pytest tests/test_triage.py -v
```

Expected: all triage tests PASS.

- [ ] **Step 6: Commit.**

```
git add backend/models/schemas.py tests/fixtures.py tests/test_triage.py
git commit -m "feat(triage): add department field to TriageItem"
```

---

## Task 2: Memory service with mtime cache

**Files:**
- Create: `backend/services/memory_service.py`
- Create: `tests/test_memory_service.py`

- [ ] **Step 1: Write the failing tests.**

Create `tests/test_memory_service.py`:

```python
import os
import time

import pytest


def test_returns_file_text_verbatim(tmp_path, monkeypatch):
    from services import memory_service

    f = tmp_path / "Memory.md"
    f.write_text("## Employees\n- Name: Sarah\n", encoding="utf-8")
    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(f))
    memory_service._cache = None  # reset

    assert memory_service.load_memory() == "## Employees\n- Name: Sarah\n"


def test_returns_empty_string_when_missing(tmp_path, monkeypatch):
    from services import memory_service

    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(tmp_path / "does-not-exist.md"))
    memory_service._cache = None

    assert memory_service.load_memory() == ""


def test_mtime_change_invalidates_cache(tmp_path, monkeypatch):
    from services import memory_service

    f = tmp_path / "Memory.md"
    f.write_text("v1", encoding="utf-8")
    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(f))
    memory_service._cache = None

    assert memory_service.load_memory() == "v1"

    time.sleep(0.05)
    f.write_text("v2", encoding="utf-8")
    os.utime(f, None)  # bump mtime

    assert memory_service.load_memory() == "v2"
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_memory_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'services.memory_service'`.

- [ ] **Step 3: Implement the service.**

Create `backend/services/memory_service.py`:

```python
"""Loads the repo-root Memory.md into the triage system prompt.

Backend does not parse the file — Claude reads it. mtime cache avoids
re-reading on every request while still picking up edits."""

import os
from pathlib import Path

DEFAULT_PATH = Path(__file__).resolve().parents[2] / "Memory.md"

_cache: tuple[float, str] | None = None


def _resolve_path() -> Path:
    raw = os.getenv("INNATEAI_MEMORY_PATH")
    return Path(raw) if raw else DEFAULT_PATH


def load_memory() -> str:
    global _cache
    path = _resolve_path()
    if not path.exists():
        _cache = None
        return ""

    mtime = path.stat().st_mtime
    if _cache and _cache[0] == mtime:
        return _cache[1]

    text = path.read_text(encoding="utf-8")
    _cache = (mtime, text)
    return text
```

- [ ] **Step 4: Run; verify pass.**

```
pytest tests/test_memory_service.py -v
```

Expected: 3 passed.

- [ ] **Step 5: Commit.**

```
git add backend/services/memory_service.py tests/test_memory_service.py
git commit -m "feat(memory): mtime-cached Memory.md loader"
```

---

## Task 3: Inject Memory.md and request `department` in triage prompt

**Files:**
- Modify: `backend/services/claude_service.py`
- Create: `tests/test_triage_department.py`

- [ ] **Step 1: Write the failing test.**

Create `tests/test_triage_department.py`:

```python
from tests.fixtures import SAMPLE_MESSAGES, triage_response_json


def test_triage_prompt_includes_memory(client, mock_claude, tmp_path, monkeypatch):
    from services import memory_service

    mem = tmp_path / "Memory.md"
    mem.write_text("## Employees\n- Name: Tom Bradley\n  Department: Engineering\n", encoding="utf-8")
    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(mem))
    memory_service._cache = None

    mock_claude.respond_with(triage_response_json())

    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})
    assert res.status_code == 200

    system_prompt = mock_claude.calls[0]["system"]
    assert "<company_directory>" in system_prompt
    assert "Tom Bradley" in system_prompt
    assert "</company_directory>" in system_prompt


def test_triage_prompt_asks_for_department(client, mock_claude):
    mock_claude.respond_with(triage_response_json())
    client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})

    system_prompt = mock_claude.calls[0]["system"]
    assert "department" in system_prompt.lower()


def test_triage_defaults_department_when_claude_omits_it(client, mock_claude):
    import json

    payload = [
        {
            "id": 1,
            "category": "Ignore",
            "reasoning": "x",
            "draft": "No response needed.",
            "urgency": 1,
            "flagged": False,
            "flag_severity": None,
            # department omitted
        }
    ]
    mock_claude.respond_with(json.dumps(payload))
    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES[:1]})

    assert res.status_code == 200
    assert res.json()["triage"][0]["department"] == "Unknown"
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_triage_department.py -v
```

Expected: FAIL — system prompt has no `<company_directory>` block and does not mention department.

- [ ] **Step 3: Update the triage prompt to inject Memory.md and request department.**

Edit `backend/services/claude_service.py`:

a. Add import at top (after existing imports):

```python
from services.memory_service import load_memory
```

b. Replace `TRIAGE_SYSTEM` with:

```python
TRIAGE_SYSTEM_TEMPLATE = """You are an AI Chief of Staff triaging incoming messages for a CEO.

{company_directory_block}For each message, decide:
- category: "Decide" (CEO must personally choose), "Delegate" (a direct report can handle), or "Ignore" (noise, FYI, superseded, or personal).
- urgency: integer 1-5 (5 = critical, requires action within the hour).
- flagged: true if this is a security risk, a production incident, or a deal-breaking decision; false otherwise.
- flag_severity: "Critical" or "High" when flagged is true; null when flagged is false.
- reasoning: 1-3 sentences explaining the categorization. Be specific. Reference other messages by id if relevant.
- draft: a short proposed response the CEO can edit and send. For "Ignore" use "No response needed." For personal messages use "Personal — handle directly."
- department: a short label for the sender's organisation/team based on the company directory above (e.g. "Engineering", "Investors", "Executive", "Personal", "External"). If you cannot tell, use "Unknown".

Return a JSON array. Each item must match this schema exactly:
{{ "id": number, "category": "Ignore"|"Delegate"|"Decide", "reasoning": string, "draft": string, "urgency": 1-5, "flagged": boolean, "flag_severity": "Critical"|"High"|null, "department": string }}

Return ONLY valid JSON. No markdown, no prose, no backticks."""


def _triage_system() -> str:
    memory = load_memory().strip()
    if memory:
        block = f"<company_directory>\n{memory}\n</company_directory>\n\nUse the directory above to assign 'department' for each message.\n\n"
    else:
        block = ""
    return TRIAGE_SYSTEM_TEMPLATE.format(company_directory_block=block)
```

c. In `run_triage`, replace the `_call_claude(TRIAGE_SYSTEM, ...)` line with:

```python
    raw = _call_claude(_triage_system(), user, TRIAGE_MAX_TOKENS)
```

d. Delete the now-unused `TRIAGE_SYSTEM` constant if present.

- [ ] **Step 4: Run; verify pass.**

```
pytest tests/test_triage_department.py tests/test_triage.py -v
```

Expected: all PASS. If `test_triage_defaults_department_when_claude_omits_it` fails because Pydantic 2 strict-rejects missing keys, confirm the schema's `department: str = "Unknown"` default handles it (it should).

- [ ] **Step 5: Commit.**

```
git add backend/services/claude_service.py tests/test_triage_department.py
git commit -m "feat(triage): inject Memory.md into system prompt, request department"
```

---

## Task 4: Seed Memory.md

**Files:**
- Create: `Memory.md` (repo root)

- [ ] **Step 1: Add a smoke test that exercises the real file.**

Append to `tests/test_memory_service.py`:

```python
def test_default_memory_md_exists_and_is_non_empty():
    """The seeded Memory.md committed at the repo root should load."""
    from services import memory_service

    # Clear env override and cache so we hit the real default.
    import os
    os.environ.pop("INNATEAI_MEMORY_PATH", None)
    memory_service._cache = None

    text = memory_service.load_memory()
    assert "## Employees" in text
    assert "## Departments" in text
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_memory_service.py::test_default_memory_md_exists_and_is_non_empty -v
```

Expected: FAIL — file does not exist.

- [ ] **Step 3: Create the seed.**

Create `Memory.md` at the repo root with this content:

```markdown
# Company Directory

This file is read verbatim by the triage prompt. Edit freely — no parser to break.

## Employees
- Name: Sarah Chen
  Role: Partner
  Department: Investors
  Identifiers: sarah.chen@meridianventures.com
- Name: Tom Bradley
  Role: Engineering Lead
  Department: Engineering
  Identifiers: tom.bradley, tom.bradley@company.com
- Name: James
  Role: COO
  Department: Executive
  Identifiers: James (COO)
- Name: Lisa Park
  Role: Product Lead
  Department: Product
  Identifiers: lisa.park
- Name: David Morrison
  Role: Engineering Manager
  Department: Engineering
  Identifiers: david.m@company.com
- Name: Mum
  Role: Family
  Department: Personal
  Identifiers: Mum

## Departments
- Engineering: Develops and maintains the company's software products.
- Product: Owns roadmap, design, and client demos.
- Executive: C-suite and direct reports.
- Investors: External investment partners and VC contacts.
- Personal: Family and personal contacts (not work-related).
- External: Vendors, unverified senders, and anything not matched above.
```

- [ ] **Step 4: Run; verify pass.**

```
pytest tests/test_memory_service.py -v
```

Expected: 4 passed.

- [ ] **Step 5: Commit.**

```
git add Memory.md tests/test_memory_service.py
git commit -m "feat: seed Memory.md company directory"
```

---

## Task 5: Update existing triage/briefing/e2e tests for department field

**Files:**
- Modify: `tests/test_briefing.py`
- Modify: `tests/test_e2e.py`
- Modify: `tests/test_flags.py`

- [ ] **Step 1: Run the existing suite and note which tests break.**

```
pytest -v
```

Expected: any test that builds a `TriageItem` payload manually still passes (defaults supply `department="Unknown"`); tests that assert exact triage output may need to add `department` to assertions.

- [ ] **Step 2: Fix any failing assertions inline.** For each failure, add the `department` field to inline triage payloads. If no tests fail, skip to Step 4. The fixture already provides `department`, so most should be green.

- [ ] **Step 3: Run again; verify pass.**

```
pytest -v
```

Expected: full suite green.

- [ ] **Step 4: Commit (only if files changed).**

```
git add tests/
git commit -m "test: backfill department field in triage fixtures and assertions"
```

If nothing changed, skip the commit.

---

## Task 6: Set up Vitest in the frontend

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.js`
- Create: `frontend/src/test/setup.js`

- [ ] **Step 1: Add devDependencies and scripts.**

Replace `frontend/package.json` with:

```json
{
  "name": "innateai-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "lucide-react": "^0.453.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@vitejs/plugin-react": "^4.3.3",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.14",
    "vite": "^5.4.10",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 2: Install.**

```
cd frontend
npm install
```

Expected: install completes; no peer warnings that block test running.

- [ ] **Step 3: Create the Vitest config.**

Create `frontend/vitest.config.js`:

```js
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
  },
});
```

- [ ] **Step 4: Create the setup file.**

Create `frontend/src/test/setup.js`:

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add a smoke test to confirm wiring.**

Create `frontend/src/__tests__/smoke.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('vitest setup', () => {
  it('renders text and asserts with jest-dom matchers', () => {
    render(<p>hello</p>);
    expect(screen.getByText('hello')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run; verify pass.**

```
cd frontend
npm run test:run
```

Expected: 1 passed.

- [ ] **Step 7: Commit.**

```
git add frontend/package.json frontend/package-lock.json frontend/vitest.config.js frontend/src/test/setup.js frontend/src/__tests__/smoke.test.jsx
git commit -m "test: wire up vitest + react testing library"
```

---

## Task 7: Department capsule on MessageCard

**Files:**
- Create: `frontend/src/__tests__/MessageCard.test.jsx`
- Modify: `frontend/src/components/MessageCard.jsx`

- [ ] **Step 1: Write the failing test.**

Create `frontend/src/__tests__/MessageCard.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MessageCard from '../components/MessageCard.jsx';

const base = {
  id: 1,
  channel: 'email',
  from: 'Sarah Chen <sarah.chen@meridianventures.com>',
  timestamp: '2026-03-18T08:12:00Z',
  body: 'b',
  reasoning: 'r',
  category: 'Decide',
  urgency: 4,
  flagged: false,
  department: 'Investors',
};

describe('MessageCard department capsule', () => {
  it('renders the department label', () => {
    render(<MessageCard message={base} onClick={() => {}} />);
    expect(screen.getByText('Investors')).toBeInTheDocument();
  });

  it('uses the same color for the same department across renders', () => {
    const { rerender } = render(<MessageCard message={base} onClick={() => {}} />);
    const first = screen.getByText('Investors').getAttribute('style');

    rerender(<MessageCard message={{ ...base, id: 2 }} onClick={() => {}} />);
    const second = screen.getByText('Investors').getAttribute('style');

    expect(first).toBe(second);
  });
});
```

- [ ] **Step 2: Run; verify fail.**

```
cd frontend
npm run test:run -- MessageCard
```

Expected: FAIL — "Investors" not found.

- [ ] **Step 3: Add the capsule to MessageCard.**

Edit `frontend/src/components/MessageCard.jsx`. Add this helper just above `export default function MessageCard`:

```jsx
function departmentColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return { background: `hsl(${hue}, 70%, 95%)`, color: `hsl(${hue}, 50%, 30%)` };
}
```

Inside the JSX, just after the existing `<span>` that renders `{message.category}` (the category pill), add:

```jsx
{message.department && (
  <span
    className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wide"
    style={departmentColor(message.department)}
  >
    {message.department}
  </span>
)}
```

- [ ] **Step 4: Run; verify pass.**

```
npm run test:run -- MessageCard
```

Expected: 2 passed.

- [ ] **Step 5: Commit.**

```
git add frontend/src/components/MessageCard.jsx frontend/src/__tests__/MessageCard.test.jsx
git commit -m "feat(ui): department capsule on MessageCard with stable hash color"
```

---

# Phase 2 — Persistent today's briefing

## Task 8: Add `briefing_date` column and helpers

**Files:**
- Modify: `backend/db.py`

- [ ] **Step 1: Write the failing tests.**

Create `tests/test_db_today.py`:

```python
import os
import importlib

import pytest


@pytest.fixture
def fresh_db(tmp_path, monkeypatch):
    monkeypatch.setenv("INNATEAI_DB_PATH", str(tmp_path / "test.db"))
    import db
    importlib.reload(db)
    return db


def test_get_today_returns_none_when_empty(fresh_db):
    assert fresh_db.get_today("2026-05-14") is None


def test_upsert_today_creates_row(fresh_db):
    payload = {"sections": [], "generated_at": "2026-05-14T00:00:00+00:00"}
    row_id = fresh_db.upsert_today("2026-05-14", payload)
    assert row_id > 0

    row = fresh_db.get_today("2026-05-14")
    assert row is not None
    assert row["briefing_date"] == "2026-05-14"
    assert row["sections"] == []


def test_get_today_returns_full_payload(fresh_db):
    payload = {
        "sections": [{"title": "Top Decisions Needed", "items": []}],
        "generated_at": "2026-05-14T00:00:00+00:00",
        "completed_ids": [3, 7],
        "overrides": {"4": "Ignore"},
        "day_summary": None,
    }
    fresh_db.upsert_today("2026-05-14", payload)
    row = fresh_db.get_today("2026-05-14")
    assert row["completed_ids"] == [3, 7]
    assert row["overrides"] == {"4": "Ignore"}


def test_update_today_payload_merges(fresh_db):
    fresh_db.upsert_today("2026-05-14", {"sections": [], "completed_ids": []})
    fresh_db.update_today_payload("2026-05-14", lambda p: {**p, "completed_ids": [9]})

    row = fresh_db.get_today("2026-05-14")
    assert row["completed_ids"] == [9]


def test_unique_index_blocks_duplicate_dates(fresh_db):
    fresh_db.upsert_today("2026-05-14", {"sections": []})
    # Second upsert with same date should overwrite, not duplicate.
    fresh_db.upsert_today("2026-05-14", {"sections": [{"title": "Quick Wins", "items": []}]})

    row = fresh_db.get_today("2026-05-14")
    assert len(row["sections"]) == 1
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_db_today.py -v
```

Expected: `AttributeError: module 'db' has no attribute 'get_today'`.

- [ ] **Step 3: Implement helpers in `backend/db.py`.**

Replace the entire `get_connection` function and append new helpers. The full new file:

```python
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Optional

DEFAULT_DB_PATH = Path(__file__).resolve().parent / "data" / "briefings.db"


def _resolve_path() -> Path:
    raw = os.getenv("INNATEAI_DB_PATH")
    return Path(raw) if raw else DEFAULT_DB_PATH


def get_connection() -> sqlite3.Connection:
    path = _resolve_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS briefings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            generated_at TEXT NOT NULL,
            payload TEXT NOT NULL,
            briefing_date TEXT
        )
        """
    )
    # Older databases may not have briefing_date — add if missing.
    cols = {row["name"] for row in conn.execute("PRAGMA table_info(briefings)").fetchall()}
    if "briefing_date" not in cols:
        conn.execute("ALTER TABLE briefings ADD COLUMN briefing_date TEXT")
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_briefings_date "
        "ON briefings(briefing_date) WHERE briefing_date IS NOT NULL"
    )
    return conn


def save_briefing(payload: dict[str, Any]) -> int:
    generated_at = payload.get("generated_at")
    if isinstance(generated_at, datetime):
        stamp = generated_at.isoformat()
    elif isinstance(generated_at, str) and generated_at:
        stamp = generated_at
    else:
        stamp = datetime.now(timezone.utc).isoformat()

    conn = get_connection()
    try:
        cur = conn.execute(
            "INSERT INTO briefings (generated_at, payload) VALUES (?, ?)",
            (stamp, json.dumps(payload, default=str)),
        )
        conn.commit()
        return cur.lastrowid
    finally:
        conn.close()


def list_briefings(limit: int = 50) -> list[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT id, generated_at, payload FROM briefings "
            "ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    finally:
        conn.close()

    result = []
    for row in rows:
        data = json.loads(row["payload"])
        data["id"] = row["id"]
        data["generated_at"] = row["generated_at"]
        result.append(data)
    return result


def get_today(briefing_date: str) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT id, generated_at, payload, briefing_date FROM briefings "
            "WHERE briefing_date = ?",
            (briefing_date,),
        ).fetchone()
    finally:
        conn.close()

    if not row:
        return None

    data = json.loads(row["payload"])
    data["id"] = row["id"]
    data["briefing_date"] = row["briefing_date"]
    data["generated_at"] = row["generated_at"]
    return data


def upsert_today(briefing_date: str, payload: dict[str, Any]) -> int:
    stamp = payload.get("generated_at") or datetime.now(timezone.utc).isoformat()
    if isinstance(stamp, datetime):
        stamp = stamp.isoformat()

    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        existing = conn.execute(
            "SELECT id FROM briefings WHERE briefing_date = ?",
            (briefing_date,),
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE briefings SET payload = ?, generated_at = ? WHERE id = ?",
                (json.dumps(payload, default=str), stamp, existing["id"]),
            )
            row_id = existing["id"]
        else:
            cur = conn.execute(
                "INSERT INTO briefings (generated_at, payload, briefing_date) "
                "VALUES (?, ?, ?)",
                (stamp, json.dumps(payload, default=str), briefing_date),
            )
            row_id = cur.lastrowid
        conn.commit()
        return row_id
    finally:
        conn.close()


def update_today_payload(
    briefing_date: str,
    mutator: Callable[[dict[str, Any]], dict[str, Any]],
) -> Optional[dict]:
    """Atomic read-modify-write of today's payload JSON."""
    conn = get_connection()
    try:
        conn.execute("BEGIN IMMEDIATE")
        row = conn.execute(
            "SELECT id, generated_at, payload FROM briefings WHERE briefing_date = ?",
            (briefing_date,),
        ).fetchone()
        if not row:
            conn.commit()
            return None

        payload = json.loads(row["payload"])
        new_payload = mutator(payload)
        conn.execute(
            "UPDATE briefings SET payload = ? WHERE id = ?",
            (json.dumps(new_payload, default=str), row["id"]),
        )
        conn.commit()

        new_payload["id"] = row["id"]
        new_payload["briefing_date"] = briefing_date
        new_payload["generated_at"] = row["generated_at"]
        return new_payload
    finally:
        conn.close()


def utc_today_str() -> str:
    return datetime.now(timezone.utc).date().isoformat()
```

- [ ] **Step 4: Run; verify pass.**

```
pytest tests/test_db_today.py -v
```

Expected: 5 passed.

- [ ] **Step 5: Commit.**

```
git add backend/db.py tests/test_db_today.py
git commit -m "feat(db): add briefing_date column, get_today/upsert_today/update_today_payload"
```

---

## Task 9: `run_day_summary` service function

**Files:**
- Modify: `backend/services/claude_service.py`
- Modify: `backend/models/schemas.py`
- Create: `tests/test_day_summary.py`

- [ ] **Step 1: Write the failing test.**

Create `tests/test_day_summary.py`:

```python
import json

import pytest


def test_run_day_summary_returns_bullets(monkeypatch):
    from services import claude_service

    monkeypatch.setattr(
        claude_service,
        "_call_claude",
        lambda system, user, max_tokens: json.dumps({"bullets": ["closed Series B prep", "approved Horizon timeline fix"]}),
    )

    payload = {"sections": [], "messages": [], "triage": [], "completed_ids": [1, 2]}
    result = claude_service.run_day_summary(payload)

    assert result.bullets == ["closed Series B prep", "approved Horizon timeline fix"]


def test_run_day_summary_502_on_malformed(monkeypatch):
    from fastapi import HTTPException

    from services import claude_service

    monkeypatch.setattr(
        claude_service,
        "_call_claude",
        lambda system, user, max_tokens: "not json",
    )

    with pytest.raises(HTTPException) as exc:
        claude_service.run_day_summary({})
    assert exc.value.status_code == 502


def test_run_day_summary_prompt_references_payload(monkeypatch):
    from services import claude_service

    seen = {}

    def fake(system, user, max_tokens):
        seen["system"] = system
        seen["user"] = user
        return json.dumps({"bullets": ["x"]})

    monkeypatch.setattr(claude_service, "_call_claude", fake)
    claude_service.run_day_summary({"sections": [{"title": "Top Decisions Needed", "items": [{"summary": "A", "message_id": 1}]}], "completed_ids": [1]})

    assert "wrap" in seen["system"].lower() or "summary" in seen["system"].lower()
    assert "Top Decisions Needed" in seen["user"]
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_day_summary.py -v
```

Expected: `AttributeError: module 'services.claude_service' has no attribute 'run_day_summary'`.

- [ ] **Step 3: Add the `DaySummary` schema.**

Append to `backend/models/schemas.py`:

```python
class DaySummary(BaseModel):
    bullets: List[str]
```

- [ ] **Step 4: Implement `run_day_summary`.**

Append to `backend/services/claude_service.py`:

```python
DAY_SUMMARY_MAX_TOKENS = 600

DAY_SUMMARY_SYSTEM = """You are an AI Chief of Staff writing the end-of-day wrap for a CEO whose entire briefing has been cleared.

Produce 3-5 short bullet points covering:
- Key accomplishments today (one bullet per major decision/delegation closed)
- Any pending Watch Items still worth monitoring tomorrow
- Reminders or follow-ups for tomorrow

Each bullet should be one sentence, plain prose, no markdown bullets in the strings themselves.

Return a JSON object matching this schema exactly:
{ "bullets": [string, ...] }

Return ONLY valid JSON. No markdown, no prose, no backticks."""


def run_day_summary(payload: dict) -> "DaySummary":
    from models.schemas import DaySummary

    user = (
        f"Today's sections:\n{json.dumps(payload.get('sections', []), indent=2)}\n\n"
        f"Completed message ids: {payload.get('completed_ids', [])}\n\n"
        f"Triage:\n{json.dumps(payload.get('triage', []), indent=2)}"
    )
    raw = _call_claude(DAY_SUMMARY_SYSTEM, user, DAY_SUMMARY_MAX_TOKENS)
    parsed = _parse_json_or_502(raw)

    if not isinstance(parsed, dict) or "bullets" not in parsed:
        raise HTTPException(
            status_code=502,
            detail={"error": "Claude returned malformed JSON", "raw": raw[:2000]},
        )

    try:
        return DaySummary.model_validate(parsed)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={"error": "Claude returned malformed JSON", "raw": raw[:2000], "validation": str(e)},
        )
```

- [ ] **Step 5: Run; verify pass.**

```
pytest tests/test_day_summary.py -v
```

Expected: 3 passed.

- [ ] **Step 6: Commit.**

```
git add backend/services/claude_service.py backend/models/schemas.py tests/test_day_summary.py
git commit -m "feat(services): run_day_summary for end-of-day wrap"
```

---

## Task 10: `POST /api/briefing/today` endpoint

**Files:**
- Create: `backend/routers/today.py`
- Modify: `backend/main.py`
- Modify: `backend/models/schemas.py`
- Create: `tests/test_briefing_today.py`

- [ ] **Step 1: Write the failing tests.**

Create `tests/test_briefing_today.py`:

```python
import importlib

import pytest

from tests.fixtures import (
    SAMPLE_MESSAGES,
    briefing_response_json,
    triage_response_json,
)


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setenv("INNATEAI_DB_PATH", str(tmp_path / "test.db"))
    import db
    importlib.reload(db)


def test_today_creates_row_on_first_call(client, monkeypatch):
    from services import claude_service

    responses = [triage_response_json(), briefing_response_json()]

    def fake(system, user, max_tokens):
        return responses.pop(0)

    monkeypatch.setattr(claude_service, "_call_claude", fake)

    res = client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES})
    assert res.status_code == 200
    body = res.json()

    assert body["briefing_date"]
    assert body["completed_ids"] == []
    assert body["overrides"] == {}
    assert body["day_summary"] is None
    assert len(body["triage"]) == 2
    assert body["triage"][0]["department"] == "Investors"


def test_today_returns_same_row_on_second_call(client, monkeypatch):
    from services import claude_service

    responses = [triage_response_json(), briefing_response_json()]
    calls = {"n": 0}

    def fake(system, user, max_tokens):
        calls["n"] += 1
        return responses.pop(0)

    monkeypatch.setattr(claude_service, "_call_claude", fake)

    first = client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES}).json()
    second = client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES}).json()

    assert first["id"] == second["id"]
    assert calls["n"] == 2  # No additional Claude calls on second request.
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_briefing_today.py -v
```

Expected: 404 (route not registered).

- [ ] **Step 3: Add the `TodayBriefingResponse` schema.**

Append to `backend/models/schemas.py`:

```python
class TodayBriefingRequest(BaseModel):
    messages: List[Message]


class TodayBriefingResponse(BaseModel):
    id: int
    briefing_date: str
    sections: List[BriefingSection]
    generated_at: datetime
    messages: List[Message]
    triage: List[TriageItem]
    completed_ids: List[int]
    overrides: dict[str, Category]
    day_summary: Optional[DaySummary] = None
```

- [ ] **Step 4: Implement the router.**

Create `backend/routers/today.py`:

```python
from fastapi import APIRouter

from db import get_today, upsert_today, utc_today_str
from models.schemas import (
    TodayBriefingRequest,
    TodayBriefingResponse,
)
from services.claude_service import run_briefing, run_triage

router = APIRouter()


@router.post("/api/briefing/today", response_model=TodayBriefingResponse)
def post_today(request: TodayBriefingRequest) -> TodayBriefingResponse:
    today = utc_today_str()
    existing = get_today(today)
    if existing:
        return TodayBriefingResponse.model_validate(existing)

    triage_items = run_triage(request.messages)
    briefing = run_briefing(request.messages, triage_items)

    payload = {
        "sections": [s.model_dump() for s in briefing.sections],
        "generated_at": briefing.generated_at.isoformat(),
        "messages": [m.model_dump(by_alias=True) for m in request.messages],
        "triage": [t.model_dump() for t in triage_items],
        "completed_ids": [],
        "overrides": {},
        "day_summary": None,
    }
    row_id = upsert_today(today, payload)
    payload["id"] = row_id
    payload["briefing_date"] = today
    return TodayBriefingResponse.model_validate(payload)
```

- [ ] **Step 5: Register the router.**

Edit `backend/main.py`, change:

```python
from routers import briefing, flags, history, triage  # noqa: E402
```

to:

```python
from routers import briefing, flags, history, today, triage  # noqa: E402
```

and below the existing `app.include_router(...)` lines add:

```python
app.include_router(today.router)
```

- [ ] **Step 6: Run; verify pass.**

```
pytest tests/test_briefing_today.py -v
```

Expected: 2 passed.

- [ ] **Step 7: Commit.**

```
git add backend/routers/today.py backend/main.py backend/models/schemas.py tests/test_briefing_today.py
git commit -m "feat(api): POST /api/briefing/today fetch-or-create endpoint"
```

---

## Task 11: Frontend `api.js` with `getTodayBriefing`

**Files:**
- Rename: `frontend/src/lib/claude.js` → `frontend/src/lib/api.js`
- Create: `frontend/src/__tests__/api.test.js`

- [ ] **Step 1: Write the failing test.**

Create `frontend/src/__tests__/api.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest';

beforeEach(() => {
  global.fetch = vi.fn();
});

describe('api.getTodayBriefing', () => {
  it('POSTs messages to /api/briefing/today and returns the row', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, briefing_date: '2026-05-14', completed_ids: [] }),
    });

    const { getTodayBriefing } = await import('../lib/api.js');
    const result = await getTodayBriefing([{ id: 1 }]);

    const call = global.fetch.mock.calls[0];
    expect(call[0]).toContain('/api/briefing/today');
    expect(call[1].method).toBe('POST');
    expect(JSON.parse(call[1].body)).toEqual({ messages: [{ id: 1 }] });
    expect(result.id).toBe(1);
  });
});
```

- [ ] **Step 2: Run; verify fail.**

```
npm run test:run -- api
```

Expected: import resolution fails OR `getTodayBriefing` undefined.

- [ ] **Step 3: Rename `claude.js` → `api.js` and add the new export.**

```
git mv frontend/src/lib/claude.js frontend/src/lib/api.js
```

Then replace the file contents of `frontend/src/lib/api.js` with:

```js
// Thin client to the FastAPI backend. The Anthropic API key never reaches
// the browser — it lives in the backend's .env file.

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000';

async function postJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Backend ${path} returned ${res.status}: ${errText}`);
  }
  return res.json();
}

async function patchJson(path, body) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Backend ${path} returned ${res.status}: ${errText}`);
  }
  return res.json();
}

export async function triageMessages(messages) {
  const data = await postJson('/api/triage', { messages });
  return data.triage;
}

export async function generateBriefing(messages, triage) {
  return postJson('/api/briefing', { messages, triage });
}

export async function getTodayBriefing(messages) {
  return postJson('/api/briefing/today', { messages });
}

export async function setCompletion(messageId, completed) {
  return patchJson('/api/briefing/today/completion', {
    message_id: messageId,
    completed,
  });
}

export async function setOverride(messageId, category) {
  return patchJson('/api/briefing/today/override', {
    message_id: messageId,
    category,
  });
}
```

- [ ] **Step 4: Update the App.jsx import.**

In `frontend/src/App.jsx`, change:

```js
import { triageMessages, generateBriefing } from './lib/claude.js';
```

to:

```js
import { triageMessages, generateBriefing } from './lib/api.js';
```

(Full refactor of `App.jsx` happens in Task 12 — this is just the import fix to keep the build green.)

- [ ] **Step 5: Run; verify pass.**

```
npm run test:run -- api
```

Expected: 1 passed.

- [ ] **Step 6: Commit.**

```
git add frontend/src/lib/api.js frontend/src/App.jsx frontend/src/__tests__/api.test.js
git commit -m "refactor(api): rename claude.js to api.js, add today/completion/override clients"
```

---

## Task 12: Refactor App.jsx to use `getTodayBriefing`

**Files:**
- Modify: `frontend/src/App.jsx`

- [ ] **Step 1: Replace the data-loading logic.**

Edit `frontend/src/App.jsx`. Replace the import block:

```js
import { triageMessages, generateBriefing } from './lib/api.js';
```

with:

```js
import { getTodayBriefing, setCompletion, setOverride } from './lib/api.js';
```

Replace the entire body of the `App` component up to (but not including) the `return` statement with:

```jsx
  const [active, setActive] = useState('briefing');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await getTodayBriefing(messages);
      setToday(row);
    } catch (e) {
      setError(e?.message ?? 'Unknown error');
      setToday(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const triage = today?.triage ?? [];
  const overrides = today?.overrides ?? {};
  const completedIds = today?.completed_ids ?? [];
  const daySummary = today?.day_summary ?? null;
  const sourceMessages = today?.messages ?? messages;
  const briefing = today
    ? { sections: today.sections, generated_at: today.generated_at }
    : null;

  const enriched = useMemo(() => {
    if (!triage.length) return [];
    const byId = new Map(triage.map(t => [t.id, t]));
    return sourceMessages
      .map(m => {
        const t = byId.get(m.id);
        if (!t) return null;
        const override = overrides[String(m.id)];
        return { ...m, ...t, category: override ?? t.category, overridden: !!override };
      })
      .filter(Boolean);
  }, [triage, overrides, sourceMessages]);

  const counts = useMemo(
    () => ({
      total: sourceMessages.length,
      decide: enriched.filter(m => m.category === 'Decide').length,
      delegate: enriched.filter(m => m.category === 'Delegate').length,
      flagged: enriched.filter(m => m.flagged).length,
      ignore: enriched.filter(m => m.category === 'Ignore').length,
    }),
    [enriched, sourceMessages],
  );

  const openMessage = id => {
    const m = enriched.find(x => x.id === id);
    if (m) setSelected(m);
  };

  const toggleCompletion = async messageId => {
    if (!today) return;
    const isCurrentlyDone = completedIds.includes(messageId);
    const snapshot = today;
    const optimistic = {
      ...today,
      completed_ids: isCurrentlyDone
        ? completedIds.filter(id => id !== messageId)
        : [...completedIds, messageId],
    };
    setToday(optimistic);
    try {
      const updated = await setCompletion(messageId, !isCurrentlyDone);
      setToday(updated);
    } catch (e) {
      setToday(snapshot);
      setError(e?.message ?? 'Failed to update completion');
    }
  };

  const applyOverride = async (messageId, category) => {
    if (!today) return;
    const snapshot = today;
    const nextOverrides = { ...overrides };
    if (category === null) delete nextOverrides[String(messageId)];
    else nextOverrides[String(messageId)] = category;
    setToday({ ...today, overrides: nextOverrides });
    try {
      const updated = await setOverride(messageId, category);
      setToday(updated);
      if (selected?.id === messageId) {
        const t = (updated.triage ?? []).find(x => x.id === messageId);
        const override = (updated.overrides ?? {})[String(messageId)];
        if (t) setSelected({ ...selected, ...t, category: override ?? t.category, overridden: !!override });
      }
    } catch (e) {
      setToday(snapshot);
      setError(e?.message ?? 'Failed to update category');
    }
  };
```

Then update the `return` JSX so the `Briefing` component receives the new props (the change to the `Briefing` render):

Find the existing block:

```jsx
            {active === 'briefing' && (
              <Briefing
                briefing={briefing}
                loading={loading}
                onJumpToTriage={() => setActive('triage')}
                onOpenMessage={openMessage}
                noiseCount={counts.ignore}
              />
            )}
```

Replace it with:

```jsx
            {active === 'briefing' && (
              <Briefing
                briefing={briefing}
                loading={loading}
                onJumpToTriage={() => setActive('triage')}
                onOpenMessage={openMessage}
                noiseCount={counts.ignore}
                completedIds={completedIds}
                daySummary={daySummary}
                onToggle={toggleCompletion}
              />
            )}
```

And in the `MessageFlyout` render at the bottom, replace:

```jsx
      <MessageFlyout message={selected} onClose={() => setSelected(null)} />
```

with:

```jsx
      <MessageFlyout
        message={selected}
        onClose={() => setSelected(null)}
        onOverride={applyOverride}
      />
```

- [ ] **Step 2: Boot the app to confirm it still renders.**

```
cd frontend
npm run dev
```

Open http://localhost:5173. Expected: backend serves today's briefing, page renders normally (no completion UI yet — that's the next task).

Stop the dev server (`Ctrl-C`).

- [ ] **Step 3: Run all frontend tests.**

```
npm run test:run
```

Expected: existing tests still pass.

- [ ] **Step 4: Commit.**

```
git add frontend/src/App.jsx
git commit -m "refactor(app): fetch today's briefing once, wire completion + override handlers"
```

---

# Phase 3 — Todo completion + day summary

## Task 13: `PATCH /api/briefing/today/completion`

**Files:**
- Modify: `backend/routers/today.py`
- Modify: `backend/models/schemas.py`
- Create: `tests/test_completion.py`

- [ ] **Step 1: Write the failing tests.**

Create `tests/test_completion.py`:

```python
import importlib
import json

import pytest

from tests.fixtures import (
    SAMPLE_MESSAGES,
    briefing_response_json,
    triage_response_json,
)


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setenv("INNATEAI_DB_PATH", str(tmp_path / "test.db"))
    import db
    importlib.reload(db)


def _seed_today(client, monkeypatch):
    from services import claude_service
    responses = [triage_response_json(), briefing_response_json()]
    monkeypatch.setattr(
        claude_service,
        "_call_claude",
        lambda s, u, m: responses.pop(0),
    )
    return client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES}).json()


def test_completion_adds_message_id(client, monkeypatch):
    _seed_today(client, monkeypatch)

    res = client.patch(
        "/api/briefing/today/completion",
        json={"message_id": 1, "completed": True},
    )

    assert res.status_code == 200
    assert res.json()["completed_ids"] == [1]


def test_completion_is_idempotent(client, monkeypatch):
    _seed_today(client, monkeypatch)
    client.patch("/api/briefing/today/completion", json={"message_id": 1, "completed": True})
    res = client.patch("/api/briefing/today/completion", json={"message_id": 1, "completed": True})

    assert res.json()["completed_ids"] == [1]


def test_completion_removes_message_id_when_false(client, monkeypatch):
    _seed_today(client, monkeypatch)
    client.patch("/api/briefing/today/completion", json={"message_id": 1, "completed": True})
    res = client.patch("/api/briefing/today/completion", json={"message_id": 1, "completed": False})

    assert res.json()["completed_ids"] == []


def test_completing_last_todo_triggers_day_summary(client, monkeypatch):
    """When all checkable items are complete, a day_summary is generated."""
    from services import claude_service

    # The fixture briefing has a single item (message_id=1) in "Top Decisions Needed",
    # so checking message 1 finishes the day.
    responses = [
        triage_response_json(),
        briefing_response_json(),
        json.dumps({"bullets": ["Series B locked", "Horizon timeline corrected"]}),
    ]
    monkeypatch.setattr(claude_service, "_call_claude", lambda s, u, m: responses.pop(0))

    client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES})
    res = client.patch(
        "/api/briefing/today/completion",
        json={"message_id": 1, "completed": True},
    )

    assert res.status_code == 200
    assert res.json()["day_summary"] == {"bullets": ["Series B locked", "Horizon timeline corrected"]}


def test_completion_404_when_no_today_row(client):
    res = client.patch(
        "/api/briefing/today/completion",
        json={"message_id": 1, "completed": True},
    )
    assert res.status_code == 404
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_completion.py -v
```

Expected: 405 or 404 on all — route does not exist.

- [ ] **Step 3: Add the request schema.**

Append to `backend/models/schemas.py`:

```python
class CompletionRequest(BaseModel):
    message_id: int
    completed: bool
```

- [ ] **Step 4: Implement the endpoint.**

Append to `backend/routers/today.py`:

```python
from fastapi import HTTPException

from db import update_today_payload
from models.schemas import CompletionRequest
from services.claude_service import run_day_summary

CHECKABLE_SECTIONS = {"Top Decisions Needed", "Delegated Actions", "Quick Wins"}


def _checkable_ids(payload: dict) -> set[int]:
    ids: set[int] = set()
    for section in payload.get("sections", []):
        if section.get("title") in CHECKABLE_SECTIONS:
            for item in section.get("items", []):
                ids.add(int(item["message_id"]))
    return ids


@router.patch("/api/briefing/today/completion", response_model=TodayBriefingResponse)
def patch_completion(req: CompletionRequest) -> TodayBriefingResponse:
    today = utc_today_str()

    def mutate(payload: dict) -> dict:
        completed = set(payload.get("completed_ids", []))
        if req.completed:
            completed.add(req.message_id)
        else:
            completed.discard(req.message_id)
        payload["completed_ids"] = sorted(completed)

        # If every checkable todo is done, generate the day summary.
        checkable = _checkable_ids(payload)
        if checkable and checkable.issubset(completed) and not payload.get("day_summary"):
            summary = run_day_summary(payload)
            payload["day_summary"] = summary.model_dump()
        return payload

    updated = update_today_payload(today, mutate)
    if updated is None:
        raise HTTPException(status_code=404, detail="No briefing for today yet")
    return TodayBriefingResponse.model_validate(updated)
```

- [ ] **Step 5: Run; verify pass.**

```
pytest tests/test_completion.py -v
```

Expected: 5 passed.

- [ ] **Step 6: Commit.**

```
git add backend/routers/today.py backend/models/schemas.py tests/test_completion.py
git commit -m "feat(api): PATCH /api/briefing/today/completion + day-summary trigger"
```

---

## Task 14: DayWrapped component

**Files:**
- Create: `frontend/src/components/DayWrapped.jsx`

- [ ] **Step 1: Write the failing test.**

Create `frontend/src/__tests__/DayWrapped.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import DayWrapped from '../components/DayWrapped.jsx';

describe('DayWrapped', () => {
  it('renders each bullet', () => {
    render(<DayWrapped bullets={['Closed Series B', 'Followed up with Horizon']} />);
    expect(screen.getByText('Closed Series B')).toBeInTheDocument();
    expect(screen.getByText('Followed up with Horizon')).toBeInTheDocument();
  });

  it('renders nothing when bullets is empty', () => {
    const { container } = render(<DayWrapped bullets={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2: Run; verify fail.**

```
npm run test:run -- DayWrapped
```

Expected: import resolution fails.

- [ ] **Step 3: Implement.**

Create `frontend/src/components/DayWrapped.jsx`:

```jsx
import { Sparkles } from 'lucide-react';

export default function DayWrapped({ bullets }) {
  if (!bullets || bullets.length === 0) return null;

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-emerald-50/40 rounded-2xl border border-emerald-200 shadow-card p-7 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Sparkles size={18} />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
          Day Wrapped
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 mb-4">
        Everything for today is done.
      </h2>
      <ul className="space-y-2">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
            <span className="text-emerald-600 mt-0.5">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Run; verify pass.**

```
npm run test:run -- DayWrapped
```

Expected: 2 passed.

- [ ] **Step 5: Commit.**

```
git add frontend/src/components/DayWrapped.jsx frontend/src/__tests__/DayWrapped.test.jsx
git commit -m "feat(ui): DayWrapped hero card"
```

---

## Task 15: Briefing.jsx — checkbox rows, Done divider, DayWrapped

**Files:**
- Modify: `frontend/src/components/Briefing.jsx`
- Create: `frontend/src/__tests__/Briefing.test.jsx`

- [ ] **Step 1: Write the failing tests.**

Create `frontend/src/__tests__/Briefing.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Briefing from '../components/Briefing.jsx';

const briefing = {
  sections: [
    {
      title: 'Top Decisions Needed',
      items: [
        { message_id: 1, summary: 'Lock Series B meeting', action: 'Confirm Thu 2pm' },
        { message_id: 2, summary: 'Approve timeline fix', action: 'Sync with David' },
      ],
    },
    { title: 'Delegated Actions', items: [] },
    {
      title: 'Watch Items',
      items: [{ message_id: 5, summary: 'API migration ETA', action: 'Re-check Friday' }],
    },
    { title: 'Quick Wins', items: [] },
  ],
  generated_at: '2026-05-14T08:00:00Z',
};

describe('Briefing todo behaviour', () => {
  it('renders checkboxes on decision rows', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[]}
        daySummary={null}
        onToggle={() => {}}
      />,
    );
    expect(screen.getAllByRole('checkbox').length).toBe(2);
  });

  it('does not render checkboxes on watch items', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[]}
        daySummary={null}
        onToggle={() => {}}
      />,
    );
    const watchRow = screen.getByText('API migration ETA').closest('li');
    expect(within(watchRow).queryByRole('checkbox')).toBeNull();
  });

  it('calls onToggle with message_id when a checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[]}
        daySummary={null}
        onToggle={onToggle}
      />,
    );
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it('renders a Done divider and sinks completed rows', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[1]}
        daySummary={null}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText(/Done · 1/i)).toBeInTheDocument();
  });

  it('renders DayWrapped when day_summary present', () => {
    render(
      <Briefing
        briefing={briefing}
        loading={false}
        onJumpToTriage={() => {}}
        onOpenMessage={() => {}}
        noiseCount={0}
        completedIds={[1, 2]}
        daySummary={{ bullets: ['Series B locked'] }}
        onToggle={() => {}}
      />,
    );
    expect(screen.getByText('Series B locked')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run; verify fail.**

```
npm run test:run -- Briefing
```

Expected: FAIL — no checkboxes, no Done divider, no day summary rendering.

- [ ] **Step 3: Rewrite Briefing.jsx.**

Replace `frontend/src/components/Briefing.jsx` with:

```jsx
import {
  Coffee,
  AlertTriangle,
  UserCheck,
  Eye,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';
import { BriefingSkeleton } from './SkeletonLoader.jsx';
import DayWrapped from './DayWrapped.jsx';

const SECTION_TITLES = {
  decisions: 'Top Decisions Needed',
  delegated: 'Delegated Actions',
  watch: 'Watch Items',
  quickWins: 'Quick Wins',
};

function itemsByTitle(briefing, title) {
  const section = briefing.sections?.find(s => s.title === title);
  return section?.items ?? [];
}

function formatGeneratedAt(ts) {
  if (!ts) return '';
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Section({ icon: Icon, title, accent, items, completedSet, onOpen, onToggle, checkable }) {
  const pending = checkable ? items.filter(i => !completedSet.has(i.message_id)) : items;
  const completed = checkable ? items.filter(i => completedSet.has(i.message_id)) : [];

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={16} />
        </span>
        <h3 className="font-bold text-slate-900 text-sm tracking-tight">{title}</h3>
        <span className="ml-auto text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full tabular-nums">
          {items.length}
        </span>
      </div>
      <ul className="divide-y divide-slate-100">
        {pending.map(item => (
          <Row
            key={`p-${item.message_id}`}
            item={item}
            onOpen={onOpen}
            onToggle={onToggle}
            checked={false}
            checkable={checkable}
          />
        ))}
        {completed.length > 0 && (
          <li className="px-6 py-2 bg-slate-50 border-t border-dashed border-slate-200 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Done · {completed.length}
          </li>
        )}
        {completed.map(item => (
          <Row
            key={`d-${item.message_id}`}
            item={item}
            onOpen={onOpen}
            onToggle={onToggle}
            checked={true}
            checkable={checkable}
          />
        ))}
      </ul>
    </section>
  );
}

function Row({ item, onOpen, onToggle, checked, checkable }) {
  return (
    <li
      className={`group flex items-start gap-3 px-6 py-3.5 transition-colors duration-200 ${
        checked ? 'bg-slate-50 opacity-70' : 'hover:bg-slate-50'
      }`}
    >
      {checkable && (
        <input
          type="checkbox"
          checked={checked}
          onChange={() => onToggle(item.message_id)}
          aria-label={`Mark "${item.summary}" complete`}
          className="mt-1 cursor-pointer"
        />
      )}
      <button
        onClick={() => onOpen(item.message_id)}
        className="flex-1 min-w-0 cursor-pointer text-left"
      >
        <p
          className={`font-semibold text-sm ${
            checked ? 'text-slate-500 line-through' : 'text-slate-900'
          }`}
        >
          {item.summary}
        </p>
        <p
          className={`text-xs mt-1 leading-relaxed ${
            checked ? 'text-slate-400 line-through' : 'text-slate-500'
          }`}
        >
          {item.action}
        </p>
      </button>
      <ArrowUpRight
        size={16}
        className="text-slate-300 group-hover:text-brand-500 mt-0.5 shrink-0 transition-colors"
      />
    </li>
  );
}

export default function Briefing({
  briefing,
  loading,
  onJumpToTriage,
  onOpenMessage,
  noiseCount = 0,
  completedIds = [],
  daySummary = null,
  onToggle = () => {},
}) {
  if (loading || !briefing) return <BriefingSkeleton />;

  const decisions = itemsByTitle(briefing, SECTION_TITLES.decisions);
  const delegated = itemsByTitle(briefing, SECTION_TITLES.delegated);
  const watch = itemsByTitle(briefing, SECTION_TITLES.watch);
  const quickWins = itemsByTitle(briefing, SECTION_TITLES.quickWins);
  const stamp = formatGeneratedAt(briefing.generated_at);
  const completedSet = new Set(completedIds);

  return (
    <div className="space-y-6 animate-fade-in">
      {daySummary && <DayWrapped bullets={daySummary.bullets} />}

      {!daySummary && (
        <section className="relative overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-card p-7">
          <div
            aria-hidden
            className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-brand-100 to-transparent rounded-full blur-2xl opacity-70"
          />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Coffee size={18} />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                AI Briefing{stamp ? ` · ${stamp}` : ''}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-3">
              Good morning, CEO.
            </h2>
            <p className="text-slate-600 text-[15px] leading-relaxed max-w-3xl">
              {decisions.length} decision{decisions.length === 1 ? '' : 's'} need you today,
              {' '}{delegated.length} already routed to direct reports,
              {' '}{watch.length} to watch, and {quickWins.length} quick win
              {quickWins.length === 1 ? '' : 's'}.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={onJumpToTriage}
                className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors duration-200"
              >
                Open Triage
                <ChevronRight size={16} />
              </button>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-xl">
                <Sparkles size={14} className="text-brand-500" />
                Filtered {noiseCount} noise item{noiseCount === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        </section>
      )}

      <Section
        icon={AlertTriangle}
        title={SECTION_TITLES.decisions}
        accent="bg-amber-50 text-amber-700"
        items={decisions}
        completedSet={completedSet}
        onOpen={onOpenMessage}
        onToggle={onToggle}
        checkable
      />

      <Section
        icon={UserCheck}
        title={SECTION_TITLES.delegated}
        accent="bg-sky-50 text-sky-700"
        items={delegated}
        completedSet={completedSet}
        onOpen={onOpenMessage}
        onToggle={onToggle}
        checkable
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section
          icon={Eye}
          title={SECTION_TITLES.watch}
          accent="bg-slate-100 text-slate-700"
          items={watch}
          completedSet={completedSet}
          onOpen={onOpenMessage}
          onToggle={onToggle}
          checkable={false}
        />

        <Section
          icon={Sparkles}
          title={SECTION_TITLES.quickWins}
          accent="bg-emerald-50 text-emerald-700"
          items={quickWins}
          completedSet={completedSet}
          onOpen={onOpenMessage}
          onToggle={onToggle}
          checkable
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run; verify pass.**

```
npm run test:run -- Briefing
```

Expected: 5 passed.

- [ ] **Step 5: Smoke-test in the browser.**

```
cd frontend
npm run dev
```

Open http://localhost:5173. Verify: checkboxes appear on Decisions / Delegated / Quick Wins rows; clicking one strikes the row and sinks it under "Done · N"; Watch items have no checkbox. Stop the server.

- [ ] **Step 6: Commit.**

```
git add frontend/src/components/Briefing.jsx frontend/src/__tests__/Briefing.test.jsx
git commit -m "feat(ui): briefing todos with strikethrough + sink-to-bottom + DayWrapped"
```

---

# Phase 4 — Recategorize overrides

## Task 16: `PATCH /api/briefing/today/override`

**Files:**
- Modify: `backend/routers/today.py`
- Modify: `backend/models/schemas.py`
- Create: `tests/test_overrides.py`

- [ ] **Step 1: Write the failing tests.**

Create `tests/test_overrides.py`:

```python
import importlib

import pytest

from tests.fixtures import (
    SAMPLE_MESSAGES,
    briefing_response_json,
    triage_response_json,
)


@pytest.fixture(autouse=True)
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setenv("INNATEAI_DB_PATH", str(tmp_path / "test.db"))
    import db
    importlib.reload(db)


def _seed(client, monkeypatch):
    from services import claude_service
    responses = [triage_response_json(), briefing_response_json()]
    monkeypatch.setattr(claude_service, "_call_claude", lambda s, u, m: responses.pop(0))
    client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES})


def test_override_writes_category(client, monkeypatch):
    _seed(client, monkeypatch)

    res = client.patch(
        "/api/briefing/today/override",
        json={"message_id": 1, "category": "Ignore"},
    )

    assert res.status_code == 200
    assert res.json()["overrides"] == {"1": "Ignore"}


def test_override_null_clears(client, monkeypatch):
    _seed(client, monkeypatch)
    client.patch(
        "/api/briefing/today/override",
        json={"message_id": 1, "category": "Ignore"},
    )
    res = client.patch(
        "/api/briefing/today/override",
        json={"message_id": 1, "category": None},
    )

    assert res.json()["overrides"] == {}


def test_invalid_category_422(client, monkeypatch):
    _seed(client, monkeypatch)
    res = client.patch(
        "/api/briefing/today/override",
        json={"message_id": 1, "category": "Banana"},
    )
    assert res.status_code == 422


def test_override_404_when_no_today_row(client):
    res = client.patch(
        "/api/briefing/today/override",
        json={"message_id": 1, "category": "Decide"},
    )
    assert res.status_code == 404
```

- [ ] **Step 2: Run; verify fail.**

```
pytest tests/test_overrides.py -v
```

Expected: 405 / 404 / wrong status — route does not exist.

- [ ] **Step 3: Add the request schema.**

Append to `backend/models/schemas.py`:

```python
class OverrideRequest(BaseModel):
    message_id: int
    category: Optional[Category] = None
```

- [ ] **Step 4: Implement the endpoint.**

Append to `backend/routers/today.py`:

```python
from models.schemas import OverrideRequest


@router.patch("/api/briefing/today/override", response_model=TodayBriefingResponse)
def patch_override(req: OverrideRequest) -> TodayBriefingResponse:
    today = utc_today_str()

    def mutate(payload: dict) -> dict:
        overrides = dict(payload.get("overrides", {}))
        key = str(req.message_id)
        if req.category is None:
            overrides.pop(key, None)
        else:
            overrides[key] = req.category
        payload["overrides"] = overrides
        return payload

    updated = update_today_payload(today, mutate)
    if updated is None:
        raise HTTPException(status_code=404, detail="No briefing for today yet")
    return TodayBriefingResponse.model_validate(updated)
```

- [ ] **Step 5: Run; verify pass.**

```
pytest tests/test_overrides.py -v
```

Expected: 4 passed.

- [ ] **Step 6: Commit.**

```
git add backend/routers/today.py backend/models/schemas.py tests/test_overrides.py
git commit -m "feat(api): PATCH /api/briefing/today/override"
```

---

## Task 17: MessageFlyout — category segmented control

**Files:**
- Modify: `frontend/src/components/MessageFlyout.jsx`
- Create: `frontend/src/__tests__/MessageFlyout.test.jsx`

- [ ] **Step 1: Write the failing tests.**

Create `frontend/src/__tests__/MessageFlyout.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageFlyout from '../components/MessageFlyout.jsx';

const message = {
  id: 1,
  channel: 'email',
  from: 'Sarah Chen <sarah.chen@meridianventures.com>',
  subject: 'Series B',
  timestamp: '2026-03-18T08:12:00Z',
  body: 'Hello',
  reasoning: 'r',
  draft: 'd',
  category: 'Decide',
  urgency: 4,
  flagged: false,
  overridden: false,
  department: 'Investors',
};

describe('MessageFlyout category override', () => {
  it('renders three category buttons', () => {
    render(<MessageFlyout message={message} onClose={() => {}} onOverride={() => {}} />);
    expect(screen.getByRole('button', { name: 'Decide' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delegate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ignore' })).toBeInTheDocument();
  });

  it('calls onOverride with new category when a different one is clicked', () => {
    const onOverride = vi.fn();
    render(<MessageFlyout message={message} onClose={() => {}} onOverride={onOverride} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ignore' }));
    expect(onOverride).toHaveBeenCalledWith(1, 'Ignore');
  });

  it('calls onOverride with null when the active category is clicked', () => {
    const onOverride = vi.fn();
    render(
      <MessageFlyout
        message={{ ...message, overridden: true }}
        onClose={() => {}}
        onOverride={onOverride}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Decide' }));
    expect(onOverride).toHaveBeenCalledWith(1, null);
  });
});
```

- [ ] **Step 2: Run; verify fail.**

```
npm run test:run -- MessageFlyout
```

Expected: FAIL — buttons not present, `onOverride` not called.

- [ ] **Step 3: Add the segmented control to MessageFlyout.**

Edit `frontend/src/components/MessageFlyout.jsx`. Change the props signature:

```jsx
export default function MessageFlyout({ message, onClose, onOverride = () => {} }) {
```

Just after the existing `{/* AI reasoning */}` section (before `{/* Editable draft */}`), insert a new section:

```jsx
          {/* Category override */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Category
            </p>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl">
              {['Decide', 'Delegate', 'Ignore'].map(cat => {
                const isActive = message.category === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => onOverride(message.id, isActive && message.overridden ? null : cat)}
                    className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
            {message.overridden && (
              <p className="text-[11px] text-slate-400 mt-1.5">
                Override active — click the highlighted button to revert to the AI's suggestion.
              </p>
            )}
          </section>
```

Also fix the small bug where clicking a non-active category when no override is active: that should also call `onOverride(id, cat)`. The expression above handles it because `isActive && message.overridden` is only true when both conditions hold; otherwise the new category is sent. Confirm by re-reading the test.

- [ ] **Step 4: Run; verify pass.**

```
npm run test:run -- MessageFlyout
```

Expected: 3 passed.

- [ ] **Step 5: Smoke-test in the browser.**

```
cd frontend
npm run dev
```

Click a message card → flyout opens → click "Ignore" on a Decide message → flyout reflects the change → close flyout → MessageCard pill reads "Ignore" with an edited dot (added next task). Stop the server.

- [ ] **Step 6: Commit.**

```
git add frontend/src/components/MessageFlyout.jsx frontend/src/__tests__/MessageFlyout.test.jsx
git commit -m "feat(ui): category segmented control + revert in MessageFlyout"
```

---

## Task 18: MessageCard — overridden dot

**Files:**
- Modify: `frontend/src/components/MessageCard.jsx`
- Modify: `frontend/src/__tests__/MessageCard.test.jsx`

- [ ] **Step 1: Add the failing test.**

Append to `frontend/src/__tests__/MessageCard.test.jsx`:

```jsx
describe('MessageCard overridden indicator', () => {
  it('shows a data-overridden flag when the message has been recategorized', () => {
    render(
      <MessageCard
        message={{ ...base, overridden: true, category: 'Ignore' }}
        onClick={() => {}}
      />,
    );
    expect(screen.getByTestId('overridden-dot')).toBeInTheDocument();
  });

  it('does not show the dot for messages that retain the AI category', () => {
    render(<MessageCard message={base} onClick={() => {}} />);
    expect(screen.queryByTestId('overridden-dot')).toBeNull();
  });
});
```

- [ ] **Step 2: Run; verify fail.**

```
npm run test:run -- MessageCard
```

Expected: FAIL on the two new tests.

- [ ] **Step 3: Update MessageCard.**

In `frontend/src/components/MessageCard.jsx`, find the existing category pill span:

```jsx
        <span
          className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wide ${
            categoryPill[message.category] ?? categoryPill.Ignore
          }`}
        >
          {message.category}
        </span>
```

Replace it with:

```jsx
        <span
          className={`relative shrink-0 text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wide ${
            categoryPill[message.category] ?? categoryPill.Ignore
          }`}
        >
          {message.category}
          {message.overridden && (
            <span
              data-testid="overridden-dot"
              aria-label="Category overridden"
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand-500"
            />
          )}
        </span>
```

- [ ] **Step 4: Run; verify pass.**

```
npm run test:run -- MessageCard
```

Expected: 4 passed total in this file.

- [ ] **Step 5: Commit.**

```
git add frontend/src/components/MessageCard.jsx frontend/src/__tests__/MessageCard.test.jsx
git commit -m "feat(ui): overridden-category dot on MessageCard"
```

---

## Task 19: End-to-end smoke

**Files:**
- Modify: `tests/test_e2e.py` (extend with one new scenario)

- [ ] **Step 1: Add a scenario covering the full Phase 2–4 loop.**

Append to `tests/test_e2e.py`:

```python
def test_e2e_today_completion_and_override(client, monkeypatch, tmp_path):
    """Full loop: create today's row, override a category, complete the day."""
    import importlib
    monkeypatch.setenv("INNATEAI_DB_PATH", str(tmp_path / "e2e.db"))
    import db
    importlib.reload(db)

    from services import claude_service
    from tests.fixtures import (
        SAMPLE_MESSAGES,
        briefing_response_json,
        triage_response_json,
    )

    responses = [
        triage_response_json(),
        briefing_response_json(),
        '{"bullets":["wrapped"]}',
    ]
    monkeypatch.setattr(claude_service, "_call_claude", lambda s, u, m: responses.pop(0))

    today = client.post("/api/briefing/today", json={"messages": SAMPLE_MESSAGES}).json()
    assert today["overrides"] == {}

    overridden = client.patch(
        "/api/briefing/today/override",
        json={"message_id": 2, "category": "Decide"},
    ).json()
    assert overridden["overrides"] == {"2": "Decide"}

    completed = client.patch(
        "/api/briefing/today/completion",
        json={"message_id": 1, "completed": True},
    ).json()
    assert completed["completed_ids"] == [1]
    assert completed["day_summary"] == {"bullets": ["wrapped"]}
```

- [ ] **Step 2: Run the whole suite.**

```
pytest -v
cd frontend && npm run test:run
```

Expected: backend green, frontend green.

- [ ] **Step 3: Manual smoke test.**

Start backend in one terminal:

```
cd backend
uvicorn main:app --reload
```

Start frontend in another:

```
cd frontend
npm run dev
```

Open http://localhost:5173 and verify the golden path:

1. Briefing loads (department capsules visible on every card).
2. Click a Decisions row's checkbox → strikes + sinks under "Done · N".
3. Open a message in the flyout → click a different category → flyout pill updates + MessageCard pill updates with edited dot.
4. Check the last todo → "Day Wrapped" card appears at the top with bullets.
5. Reload the page → all completions + overrides + day summary persist.

Stop both servers.

- [ ] **Step 4: Commit.**

```
git add tests/test_e2e.py
git commit -m "test(e2e): cover today/completion/override loop"
```

---

# Verification checklist

After Task 19:

- [ ] `pytest -v` — all backend tests green
- [ ] `cd frontend && npm run test:run` — all frontend tests green
- [ ] Manual smoke per Task 19 Step 3 — every step passes
- [ ] `git log --oneline` shows ~19 small, focused commits

If any of the above fails, do not declare the plan complete. Fix the regression, re-run, and commit.
