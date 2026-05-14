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
    # Includes a day_summary response because the fixture briefing has a single
    # checkable item, so completing it always triggers the wrap-up call.
    responses = [
        triage_response_json(),
        briefing_response_json(),
        json.dumps({"bullets": ["seeded"]}),
    ]
    monkeypatch.setattr(
        claude_service,
        "_call_claude",
        lambda s, u, m: responses.pop(0) if responses else json.dumps({"bullets": ["seeded"]}),
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
