from tests.fixtures import (
    SAMPLE_MESSAGES,
    SAMPLE_TRIAGE_RESPONSE,
    briefing_response_json,
)


def test_briefing_happy_path(client, mock_claude):
    mock_claude.respond_with(briefing_response_json())

    res = client.post(
        "/api/briefing",
        json={"messages": SAMPLE_MESSAGES, "triage": SAMPLE_TRIAGE_RESPONSE},
    )

    assert res.status_code == 200
    body = res.json()
    assert "sections" in body
    assert len(body["sections"]) == 4
    titles = [s["title"] for s in body["sections"]]
    assert titles == [
        "Top Decisions Needed",
        "Delegated Actions",
        "Watch Items",
        "Quick Wins",
    ]
    assert "generated_at" in body


def test_briefing_returns_502_on_malformed_claude_output(client, mock_claude):
    mock_claude.respond_with("not json")

    res = client.post(
        "/api/briefing",
        json={"messages": SAMPLE_MESSAGES, "triage": SAMPLE_TRIAGE_RESPONSE},
    )

    assert res.status_code == 502


def test_briefing_returns_502_when_sections_missing(client, mock_claude):
    mock_claude.respond_with('{"not_sections": []}')

    res = client.post(
        "/api/briefing",
        json={"messages": SAMPLE_MESSAGES, "triage": SAMPLE_TRIAGE_RESPONSE},
    )

    assert res.status_code == 502


def test_briefing_rejects_missing_body(client, mock_claude):
    res = client.post("/api/briefing", json={})
    assert res.status_code == 422
