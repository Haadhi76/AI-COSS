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
