"""End-to-end test: full triage -> briefing -> history flow through the
real FastAPI stack with Anthropic mocked.

This is the smallest test that proves the three endpoints compose correctly:
the triage output feeds the briefing call, and the briefing call writes a
durable row that history can read back. If any link breaks, this single test
catches it.
"""

import pytest

from tests.fixtures import (
    SAMPLE_MESSAGES,
    briefing_response_json,
    triage_response_json,
)


@pytest.fixture
def isolated_db(tmp_path, monkeypatch):
    monkeypatch.setenv("INNATEAI_DB_PATH", str(tmp_path / "e2e.db"))


def test_full_pipeline_triage_then_briefing_then_history(
    client, mock_claude, isolated_db
):
    # 1. Triage the morning's messages.
    mock_claude.respond_with(triage_response_json())
    triage_res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})
    assert triage_res.status_code == 200, triage_res.text
    triage_items = triage_res.json()["triage"]
    assert len(triage_items) == 2

    # 2. Derive flags from the triage result (stateless GET-with-body).
    flags_res = client.request("GET", "/api/flags", json={"triage": triage_items})
    assert flags_res.status_code == 200
    # Sample triage data has no flagged items.
    assert flags_res.json()["flags"] == []

    # 3. Generate a briefing from the same messages + triage.
    mock_claude.respond_with(briefing_response_json())
    briefing_res = client.post(
        "/api/briefing",
        json={"messages": SAMPLE_MESSAGES, "triage": triage_items},
    )
    assert briefing_res.status_code == 200, briefing_res.text
    briefing_body = briefing_res.json()
    assert len(briefing_body["sections"]) == 4

    # 4. Verify the briefing landed in the archive.
    history_res = client.get("/api/briefings/history")
    assert history_res.status_code == 200
    archived = history_res.json()["briefings"]
    assert len(archived) == 1

    archived_titles = [s["title"] for s in archived[0]["sections"]]
    response_titles = [s["title"] for s in briefing_body["sections"]]
    assert archived_titles == response_titles
    assert archived[0]["generated_at"] == briefing_body["generated_at"]


def test_e2e_records_three_separate_claude_calls(client, mock_claude, isolated_db):
    """Triage and briefing each hit Claude exactly once; flags is local-only."""
    mock_claude.respond_with(triage_response_json())
    triage_items = client.post(
        "/api/triage", json={"messages": SAMPLE_MESSAGES}
    ).json()["triage"]

    mock_claude.respond_with(briefing_response_json())
    client.post(
        "/api/briefing",
        json={"messages": SAMPLE_MESSAGES, "triage": triage_items},
    )

    client.request("GET", "/api/flags", json={"triage": triage_items})

    # Two LLM round-trips: one for triage, one for briefing. Flags is derived
    # locally and must never reach the LLM.
    assert len(mock_claude.calls) == 2


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
