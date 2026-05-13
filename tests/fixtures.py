"""Shared sample payloads for endpoint tests."""

import json

SAMPLE_MESSAGES = [
    {
        "id": 1,
        "channel": "email",
        "from": "Sarah Chen <sarah.chen@meridianventures.com>",
        "timestamp": "2026-03-18T08:12:00Z",
        "subject": "Follow-up: Series B timeline",
        "body": "Can we lock in Thursday at 2pm to go through the financials?",
    },
    {
        "id": 2,
        "channel": "slack",
        "from": "tom.bradley",
        "timestamp": "2026-03-18T08:34:00Z",
        "body": "heads up - the API migration is about 60% done.",
    },
]

SAMPLE_TRIAGE_RESPONSE = [
    {
        "id": 1,
        "category": "Decide",
        "reasoning": "Series B due diligence is on the critical path.",
        "draft": "Sarah - 10am Thursday works.",
        "urgency": 4,
        "flagged": False,
        "flag_severity": None,
    },
    {
        "id": 2,
        "category": "Ignore",
        "reasoning": "FYI update from engineering.",
        "draft": "No response needed.",
        "urgency": 1,
        "flagged": False,
        "flag_severity": None,
    },
]

SAMPLE_BRIEFING_RESPONSE = {
    "sections": [
        {
            "title": "Top Decisions Needed",
            "items": [
                {
                    "message_id": 1,
                    "summary": "Lock in Meridian Series B Thursday meeting",
                    "action": "Confirm 10am slot, send revenue projections by Wednesday.",
                }
            ],
        },
        {"title": "Delegated Actions", "items": []},
        {"title": "Watch Items", "items": []},
        {"title": "Quick Wins", "items": []},
    ]
}


def triage_response_json() -> str:
    return json.dumps(SAMPLE_TRIAGE_RESPONSE)


def briefing_response_json() -> str:
    return json.dumps(SAMPLE_BRIEFING_RESPONSE)
