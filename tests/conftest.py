import os
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent
BACKEND = REPO_ROOT / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")


@pytest.fixture
def client():
    from main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture
def mock_claude(monkeypatch):
    from services import claude_service

    state = {"response": ""}
    calls = []

    def fake_call(system, user, max_tokens):
        calls.append({"system": system, "user": user, "max_tokens": max_tokens})
        return state["response"]

    monkeypatch.setattr(claude_service, "_call_claude", fake_call)

    class Recorder:
        @staticmethod
        def respond_with(text):
            state["response"] = text

        @property
        def calls(self):
            return calls

    return Recorder()
