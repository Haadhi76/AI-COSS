def _triage_with_one_flag():
    return [
        {
            "id": 16,
            "category": "Decide",
            "reasoning": "Production incident.",
            "draft": "Hotfix.",
            "urgency": 5,
            "flagged": True,
            "flag_severity": "Critical",
        },
        {
            "id": 1,
            "category": "Decide",
            "reasoning": "Series B meeting.",
            "draft": "Confirm.",
            "urgency": 4,
            "flagged": False,
            "flag_severity": None,
        },
    ]


def test_flags_returns_only_flagged_items(client):
    res = client.request(
        "GET",
        "/api/flags",
        json={"triage": _triage_with_one_flag()},
    )

    assert res.status_code == 200
    body = res.json()
    assert len(body["flags"]) == 1
    assert body["flags"][0]["id"] == 16
    assert body["flags"][0]["flag_severity"] == "Critical"


def test_flags_defaults_severity_to_high_when_null(client):
    triage = [
        {
            "id": 5,
            "category": "Decide",
            "reasoning": "Flagged but no severity.",
            "draft": "Review.",
            "urgency": 4,
            "flagged": True,
            "flag_severity": None,
        }
    ]
    res = client.request("GET", "/api/flags", json={"triage": triage})

    assert res.status_code == 200
    flags = res.json()["flags"]
    assert len(flags) == 1
    assert flags[0]["flag_severity"] == "High"


def test_flags_empty_when_nothing_flagged(client):
    triage = [
        {
            "id": 1,
            "category": "Ignore",
            "reasoning": "noise",
            "draft": "ignore",
            "urgency": 1,
            "flagged": False,
            "flag_severity": None,
        }
    ]
    res = client.request("GET", "/api/flags", json={"triage": triage})

    assert res.status_code == 200
    assert res.json()["flags"] == []
