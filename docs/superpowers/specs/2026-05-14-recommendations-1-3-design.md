# Design: Recommendations 1–3 — Briefing Todos, Department Capsules, Recategorize

**Date:** 2026-05-14
**Scope:** Points 1, 2, and 3 of `Recommendations.md` (lines 1–23). Items below line 25 ("Not for MVP", "Optional Features") are explicitly out of scope.
**Targets:** `frontend/` (React/Vite) and `backend/` (FastAPI). Frontend changes use the `ui-ux-pro-max` skill.

---

## 1. Goals

1. **Briefing as a daily todo list.** Items in the Decisions, Delegated, and Quick Wins sections can be checked off. Checked items strike through and sink under a "Done · N" divider within their section. When every checkable item for the day is complete, a "Day Wrapped" summary card appears.
2. **Department capsules on every message.** Each `MessageCard` shows a color-coded department label derived from a new `Memory.md` company directory, alongside the existing Decide/Delegate/Ignore pill.
3. **Recategorize from the flyout.** Clicking a message opens the flyout; a 3-button segmented control (Decide / Delegate / Ignore) lets the user override the AI's verdict. Overrides persist to today's briefing row.

## 2. Non-goals

- ML-based auto-recategorization (Recommendations.md item below line 25).
- Date filtering / historical day browsing (item below line 25).
- Snooze (item below line 25).
- Multi-user accounts or auth — system stays single-user.
- Editing `Memory.md` from the UI — file is hand-edited in the repo for MVP.
- Notifications (browser Notification API) for day-wrapped state.

## 3. Architecture changes

### 3.1 Persistence shift

The system today is stateless on read: every page load re-runs `/api/triage` and `/api/briefing` against a hardcoded `frontend/src/lib/messages.js`, and `briefings.db` only stores history rows. After this change, `briefings.db` is the **source of truth for what the UI renders for today**.

**Schema (additive):**

```sql
ALTER TABLE briefings ADD COLUMN briefing_date TEXT;   -- 'YYYY-MM-DD', UTC
CREATE UNIQUE INDEX IF NOT EXISTS idx_briefings_date ON briefings(briefing_date);
```

Older rows have `briefing_date = NULL` and are untouched. The unique index is partial-friendly: `NULL`s do not collide in SQLite.

**Payload JSON gains four keys** (defaults on a fresh row shown):

```json
{
  "sections": [...],
  "generated_at": "...",
  "messages": [...],
  "triage": [...],
  "completed_ids": [],
  "overrides": {},
  "day_summary": null
}
```

- `messages` — the raw inbox snapshot for the day (currently `frontend/src/lib/messages.js` data, passed through; future-proofs against the source moving server-side).
- `triage` — each `TriageItem` now carries a `department: str`.
- `completed_ids: list[int]` — `message_id`s whose briefing item has been checked off.
- `overrides: dict[str, "Ignore"|"Delegate"|"Decide"]` — user category overrides keyed by `str(message_id)`.
- `day_summary: {"bullets": [str, ...]} | null` — populated when the last checkable todo is checked.

### 3.2 Memory.md

New committed file at the repo root: `Memory.md`. Backend reads it on demand, caches by mtime, and injects the verbatim text into the triage system prompt inside a `<company_directory>...</company_directory>` block. Missing file → empty string → backend still works.

Format follows the `Recommendations.md` example; one extension — an `Identifiers:` line per employee listing tokens (email addresses, slack handles, "Mum") that may appear in a message's `from` field. The backend does **not** parse this — it's there for Claude to use.

Seed content is derived from the unique senders in `frontend/src/lib/messages.js`. Departments seeded: Engineering, Investors, Executive, Personal, External.

### 3.3 New TriageItem field

`department: str` is added to `models/schemas.py`'s `TriageItem`. Free-form short label. Validated: non-empty string; if Claude omits it, the service patches it to `"Unknown"` rather than failing.

## 4. Backend API

### 4.1 New endpoints

#### `POST /api/briefing/today`

Primary entry point for the frontend. `POST` because it carries the inbox `messages` body; the route is fetch-or-create rather than a pure GET.

Behaviour:

1. Look up the row where `briefing_date = <today, UTC date>`. Date is computed server-side as `datetime.now(timezone.utc).date().isoformat()` for consistency across environments.
2. If present, return its full payload (with `id`, `briefing_date`).
3. If absent: run triage on `request.messages` (same body shape as `POST /api/triage`), run briefing on the result, persist the new row with `briefing_date` set, return it.

Returning the new row from the create-path keeps the contract single-shot.

Response model: `TodayBriefingResponse` = existing `BriefingResponse` + `id: int`, `briefing_date: str`, `messages: List[Message]`, `triage: List[TriageItem]`, `completed_ids: List[int]`, `overrides: Dict[str, Category]`, `day_summary: Optional[DaySummary]`.

#### `PATCH /api/briefing/today/completion`

Body: `{ "message_id": int, "completed": bool }`.

Behaviour:

1. Load today's row (404 if none).
2. Mutate `completed_ids`: add or remove `message_id`. Idempotent.
3. If, after the mutation, every checkable todo is in `completed_ids`, call `run_day_summary(payload)` and store the result in `day_summary`. Checkable = items in Decisions ∪ Delegated ∪ Quick Wins. Watch Items don't count.
4. Persist and return the updated row.

Wrapped in a SQLite transaction so the read-modify-write of the payload JSON is atomic.

#### `PATCH /api/briefing/today/override`

Body: `{ "message_id": int, "category": "Decide"|"Delegate"|"Ignore"|null }`.

Behaviour:

1. Load today's row (404 if none).
2. If `category` is `null`, delete the key from `overrides`. Otherwise set it.
3. Persist and return updated row.

Invalid `category` → 422 (Pydantic).

### 4.2 Unchanged endpoints

`POST /api/triage`, `POST /api/briefing`, `GET /api/flags`, `GET /api/history`, `GET /health` keep working and remain covered by the existing test suite. The frontend just stops calling triage/briefing directly on mount.

### 4.3 New services

- **`services/memory_service.py`** — `load_memory() -> str` with mtime-based cache. Path resolves from `INNATEAI_MEMORY_PATH` env var, else `<repo_root>/Memory.md`. Missing file returns `""`.
- **`claude_service.run_day_summary(payload) -> DaySummary`** — system prompt instructs Claude to produce 3–5 bullets covering accomplishments, pending watch items, and reminders. `max_tokens = 600`. Same JSON-only contract; same fence-stripping parser; malformed → 502.
- **`claude_service.run_triage`** — modified to fetch `memory_service.load_memory()` and inject it inside `<company_directory>...</company_directory>` in the system prompt. Triage prompt also asks for a `department` field per item.

### 4.4 Concurrency

SQLite is sufficient for single-user MVP. PATCH handlers acquire a single connection per request and use `BEGIN IMMEDIATE` to serialize writes. Concurrent reads are fine.

## 5. Frontend

### 5.1 API layer

Rename `frontend/src/lib/claude.js` → `frontend/src/lib/api.js`. Add:

- `getTodayBriefing(messages)` → `POST /api/briefing/today`
- `setCompletion(messageId, completed) → PATCH /api/briefing/today/completion`
- `setOverride(messageId, category | null) → PATCH /api/briefing/today/override`

Existing `triageMessages` and `generateBriefing` exports remain (kept for test parity and history flows). All exports go through the same `postJson` / `patchJson` helpers.

### 5.2 App.jsx

The `load()` callback becomes a single `getTodayBriefing(messages)` call. State variables collapse:

```js
const [today, setToday] = useState(null);
// today = { id, briefing_date, sections, generated_at, messages, triage,
//           completed_ids, overrides, day_summary }
```

`enriched` is derived as before but applies `overrides` on top of the raw triage list:

```js
const enriched = useMemo(() => {
  if (!today) return [];
  const byId = new Map(today.triage.map(t => [t.id, t]));
  return today.messages.map(m => {
    const t = byId.get(m.id);
    if (!t) return null;
    const overridden = today.overrides[String(m.id)];
    return { ...m, ...t, category: overridden ?? t.category, overridden: !!overridden };
  }).filter(Boolean);
}, [today]);
```

Optimistic mutation helpers `toggleCompletion(id)` and `applyOverride(id, category)` flip local state, call the API, and rollback to a snapshot of `today` on error.

### 5.3 Briefing.jsx

`Row` becomes a checkbox row. Each `Section` splits its items into two lists driven by `completed_ids`:

- **Pending** at the top, normal styling.
- A dashed `Done · N` divider when `N > 0`.
- **Completed** below: strikethrough, 70% opacity, light slate background. Per the selected mockup (option C, browser-confirmed 2026-05-14).

Watch Items section gets `readOnly` and renders rows without checkboxes.

When `today.day_summary` is non-null, a new `<DayWrapped>` hero card renders at the very top of the briefing page with the bullets as a list. Replaces the existing hero only visually; the hero stays for the not-yet-complete state.

### 5.4 MessageCard.jsx

Adds a department capsule next to the category pill. Helper `departmentColor(name)`:

```js
function departmentColor(name) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  return { bg: `hsl(${h}, 70%, 95%)`, text: `hsl(${h}, 50%, 30%)` };
}
```

Deterministic, stable, no central palette to maintain. Overridden messages show a tiny dot on the category pill (1.5px inset, brand-500) to indicate user edit.

### 5.5 MessageFlyout.jsx

Adds a "Category" row near the top of the flyout body: a segmented 3-button control (Decide / Delegate / Ignore). Active state = current effective category. Clicking a non-active button calls `applyOverride(id, newCategory)`. Clicking the active button calls `applyOverride(id, null)` to clear. A caption underneath reads "AI suggested *X*" when an override is active.

### 5.6 Sidebar.jsx / StatBar.jsx

No logic changes — they already read from `enriched`. Counts naturally reflect overrides.

## 6. Memory.md seed

Committed at repo root. Sample (full file generated during implementation):

```markdown
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

## 7. Testing strategy

Tests are written **before** the code they cover, per the user's TDD requirement.

### 7.1 Backend (pytest, new files under `tests/`)

| File | Covers |
|---|---|
| `test_memory_service.py` | Returns file text verbatim; missing file → `""`; mtime change invalidates cache. |
| `test_triage_department.py` | Triage response items carry `department`; Memory.md content appears in the system prompt (mock Anthropic client, assert on `messages.create` kwargs). |
| `test_briefing_today.py` | First `POST /api/briefing/today` generates + persists; second call same day returns same row without re-calling Claude (assert mock call count == 0 on second call); unique index enforces one row per date. |
| `test_completion.py` | PATCH adds/removes `message_id` from `completed_ids`; idempotent; checking the last checkable item triggers `run_day_summary` and persists it. |
| `test_overrides.py` | PATCH writes/clears overrides; invalid category → 422; non-existent today row → 404. |
| `test_day_summary.py` | `run_day_summary` builds correct prompt, parses bullets; malformed JSON → 502. |

Existing tests (`test_triage.py`, `test_briefing.py`, `test_flags.py`, `test_e2e.py`) get light updates to assert the new `department` field. Fixtures in `tests/fixtures.py` add a sample Memory.md and extend the mock triage payload.

### 7.2 Frontend (Vitest + @testing-library/react, new dir `frontend/src/__tests__/`)

| File | Covers |
|---|---|
| `Briefing.test.jsx` | Checking a Decisions row calls `setCompletion`, row moves below `Done` divider with strikethrough; Watch rows have no checkbox; `day_summary` renders the `DayWrapped` card. |
| `MessageCard.test.jsx` | Department capsule renders with stable color for the same department string; overridden category pill shows the "edited" dot. |
| `MessageFlyout.test.jsx` | Clicking a category button calls `setOverride`; clicking the active one calls `setOverride(id, null)`. |
| `api.test.js` | Endpoints hit expected URLs/methods; mocks `fetch`. |

Tooling adds: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, plus `frontend/vitest.config.js` and a setup file for jest-dom matchers. `npm run test` runs Vitest in watch mode; `npm run test:run` runs once for CI.

## 8. Error handling

- `GET /api/briefing/today` second call when DB write race produces two rows for same date → unique index errors the second insert; the handler catches `IntegrityError`, re-reads, and returns the existing row.
- Claude returns malformed day-summary JSON → 502 with the raw text, matching existing convention. The completion PATCH still succeeds (completion is saved); only `day_summary` is null and a follow-up retry endpoint can regenerate it later (out of scope for MVP — the user can refresh to retry).
- Frontend optimistic mutations rollback on non-2xx response and show the existing `ErrorBanner`.

## 9. Implementation phases (preview)

The full plan.md will detail TDD steps per phase. High-level:

1. **Phase 1 — Memory.md + department field.** Add memory service, extend triage prompt, add `department` to schema, update existing tests, seed `Memory.md`, add capsule to `MessageCard`.
2. **Phase 2 — Persistent today's briefing.** Schema migration, `POST /api/briefing/today`, frontend refactor of `App.jsx` to use it.
3. **Phase 3 — Todo completion + day summary.** PATCH completion endpoint, `run_day_summary`, `Briefing.jsx` checkbox rows + Done divider, DayWrapped card.
4. **Phase 4 — Recategorize overrides.** PATCH override endpoint, segmented control in `MessageFlyout`, override application in `App.jsx`'s `enriched` memo.

Each phase ends green-tested before the next begins.

## 10. Open items

None — all scope questions resolved during brainstorming (browser mockup, 2026-05-14).
