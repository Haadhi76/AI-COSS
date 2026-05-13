from tests.fixtures import SAMPLE_MESSAGES, triage_response_json


def test_triage_happy_path(client, mock_claude):
    mock_claude.respond_with(triage_response_json())

    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})

    assert res.status_code == 200
    body = res.json()
    assert "triage" in body
    assert len(body["triage"]) == 2
    assert body["triage"][0]["id"] == 1
    assert body["triage"][0]["category"] == "Decide"
    assert body["triage"][0]["flag_severity"] is None


def test_triage_strips_markdown_fences(client, mock_claude):
    mock_claude.respond_with(f"```json\n{triage_response_json()}\n```")

    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})

    assert res.status_code == 200
    assert len(res.json()["triage"]) == 2


def test_triage_returns_502_on_malformed_claude_output(client, mock_claude):
    mock_claude.respond_with("not json at all")

    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})

    assert res.status_code == 502
    detail = res.json()["detail"]
    assert detail["error"] == "Claude returned malformed JSON"
    assert "raw" in detail


def test_triage_returns_502_when_claude_returns_object_instead_of_array(client, mock_claude):
    mock_claude.respond_with('{"oops": "wrong shape"}')

    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})

    assert res.status_code == 502


def test_triage_rejects_missing_messages_field(client, mock_claude):
    res = client.post("/api/triage", json={})
    assert res.status_code == 422
