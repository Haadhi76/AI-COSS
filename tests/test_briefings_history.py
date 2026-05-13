"""SQLite briefing archive — TDD specs for persistence + history endpoint."""

import pytest

from tests.fixtures import (
    SAMPLE_MESSAGES,
    SAMPLE_TRIAGE_RESPONSE,
    briefing_response_json,
)


@pytest.fixture
def isolated_db(tmp_path, monkeypatch):
    """Point the backend at a fresh SQLite file for this test."""
    db_path = tmp_path / "test_briefings.db"
    monkeypatch.setenv("INNATEAI_DB_PATH", str(db_path))
    return db_path


def test_history_empty_when_no_briefings_generated(client, isolated_db):
    res = client.get("/api/briefings/history")
    assert res.status_code == 200
    assert res.json() == {"briefings": []}


def test_post_briefing_persists_row_visible_via_history(
    client, mock_claude, isolated_db
):
    mock_claude.respond_with(briefing_response_json())

    post_res = client.post(
        "/api/briefing",
        json={"messages": SAMPLE_MESSAGES, "triage": SAMPLE_TRIAGE_RESPONSE},
    )
    assert post_res.status_code == 200

    history_res = client.get("/api/briefings/history")
    assert history_res.status_code == 200

    briefings = history_res.json()["briefings"]
    assert len(briefings) == 1

    entry = briefings[0]
    assert "id" in entry
    assert "generated_at" in entry
    assert "sections" in entry
    titles = [s["title"] for s in entry["sections"]]
    assert titles == [
        "Top Decisions Needed",
        "Delegated Actions",
        "Watch Items",
        "Quick Wins",
    ]


def test_history_returns_newest_first(client, mock_claude, isolated_db):
    mock_claude.respond_with(briefing_response_json())

    for _ in range(3):
        res = client.post(
            "/api/briefing",
            json={"messages": SAMPLE_MESSAGES, "triage": SAMPLE_TRIAGE_RESPONSE},
        )
        assert res.status_code == 200

    history = client.get("/api/briefings/history").json()["briefings"]
    assert len(history) == 3

    timestamps = [b["generated_at"] for b in history]
    assert timestamps == sorted(timestamps, reverse=True)


def test_history_respects_limit_param(client, mock_claude, isolated_db):
    mock_claude.respond_with(briefing_response_json())

    for _ in range(5):
        client.post(
            "/api/briefing",
            json={"messages": SAMPLE_MESSAGES, "triage": SAMPLE_TRIAGE_RESPONSE},
        )

    res = client.get("/api/briefings/history?limit=2")
    assert res.status_code == 200
    assert len(res.json()["briefings"]) == 2
