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
