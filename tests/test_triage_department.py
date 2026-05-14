from tests.fixtures import SAMPLE_MESSAGES, triage_response_json


def test_triage_prompt_includes_memory(client, mock_claude, tmp_path, monkeypatch):
    from services import memory_service

    mem = tmp_path / "Memory.md"
    mem.write_text("## Employees\n- Name: Tom Bradley\n  Department: Engineering\n", encoding="utf-8")
    monkeypatch.setenv("INNATEAI_MEMORY_PATH", str(mem))
    memory_service._cache = None

    mock_claude.respond_with(triage_response_json())

    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})
    assert res.status_code == 200

    system_prompt = mock_claude.calls[0]["system"]
    assert "<company_directory>" in system_prompt
    assert "Tom Bradley" in system_prompt
    assert "</company_directory>" in system_prompt


def test_triage_prompt_asks_for_department(client, mock_claude):
    from services import memory_service
    memory_service._cache = None

    mock_claude.respond_with(triage_response_json())
    client.post("/api/triage", json={"messages": SAMPLE_MESSAGES})

    system_prompt = mock_claude.calls[0]["system"]
    assert "department" in system_prompt.lower()


def test_triage_defaults_department_when_claude_omits_it(client, mock_claude):
    import json

    payload = [
        {
            "id": 1,
            "category": "Ignore",
            "reasoning": "x",
            "draft": "No response needed.",
            "urgency": 1,
            "flagged": False,
            "flag_severity": None,
            # department omitted
        }
    ]
    mock_claude.respond_with(json.dumps(payload))
    res = client.post("/api/triage", json={"messages": SAMPLE_MESSAGES[:1]})

    assert res.status_code == 200
    assert res.json()["triage"][0]["department"] == "Unknown"
