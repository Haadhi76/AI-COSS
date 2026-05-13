"""CORS preflight tests — drove the fix for the OPTIONS /api/triage 400 bug."""

import pytest

PREFLIGHT_HEADERS = {
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
}


@pytest.mark.parametrize(
    "origin",
    [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
)
def test_preflight_allowed_for_dev_origins(client, origin):
    res = client.options(
        "/api/triage",
        headers={"Origin": origin, **PREFLIGHT_HEADERS},
    )
    assert res.status_code == 200, res.text
    assert res.headers.get("access-control-allow-origin") == origin


def test_preflight_rejected_for_unknown_origin(client):
    res = client.options(
        "/api/triage",
        headers={"Origin": "http://evil.example.com", **PREFLIGHT_HEADERS},
    )
    assert res.status_code == 400
    assert "Disallowed CORS origin" in res.text
