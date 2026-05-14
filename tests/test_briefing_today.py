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
