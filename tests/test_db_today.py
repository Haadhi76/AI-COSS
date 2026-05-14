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
