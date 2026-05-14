import json
import os
import re
from datetime import datetime, timezone
from typing import Any, List

from anthropic import Anthropic
from fastapi import HTTPException

from models.schemas import (
    BriefingResponse,
    BriefingSection,
    Message,
    TriageItem,
)
from services.memory_service import load_memory

MODEL = "claude-sonnet-4-6"
TRIAGE_MAX_TOKENS = 8000
BRIEFING_MAX_TOKENS = 4000

_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)

_client: Anthropic | None = None


def _get_client() -> Anthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=500,
                detail="Server misconfigured: ANTHROPIC_API_KEY is not set",
            )
        _client = Anthropic(api_key=api_key)
    return _client


def _strip_fences(text: str) -> str:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```\s*$", "", cleaned)
    return cleaned.strip()


def _parse_json_or_502(raw: str) -> Any:
    cleaned = _strip_fences(raw)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Claude returned malformed JSON",
                "raw": raw[:2000],
            },
        )


def _call_claude(system: str, user: str, max_tokens: int) -> str:
    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user}],
    )
    parts = [block.text for block in response.content if getattr(block, "type", None) == "text"]
    return "".join(parts)


TRIAGE_SYSTEM_TEMPLATE = """You are an AI Chief of Staff triaging incoming messages for a CEO.

{company_directory_block}For each message, decide:
- category: "Decide" (CEO must personally choose), "Delegate" (a direct report can handle), or "Ignore" (noise, FYI, superseded, or personal).
- urgency: integer 1-5 (5 = critical, requires action within the hour).
- flagged: true if this is a security risk, a production incident, or a deal-breaking decision; false otherwise.
- flag_severity: "Critical" or "High" when flagged is true; null when flagged is false.
- reasoning: 1-3 sentences explaining the categorization. Be specific. Reference other messages by id if relevant.
- draft: a short proposed response the CEO can edit and send. For "Ignore" use "No response needed." For personal messages use "Personal — handle directly."
- department: a short label for the sender's organisation/team based on the company directory above (e.g. "Engineering", "Investors", "Executive", "Personal", "External"). If you cannot tell, use "Unknown".

Return a JSON array. Each item must match this schema exactly:
{{ "id": number, "category": "Ignore"|"Delegate"|"Decide", "reasoning": string, "draft": string, "urgency": 1-5, "flagged": boolean, "flag_severity": "Critical"|"High"|null, "department": string }}

Return ONLY valid JSON. No markdown, no prose, no backticks."""


def _triage_system() -> str:
    memory = load_memory().strip()
    if memory:
        block = f"<company_directory>\n{memory}\n</company_directory>\n\nUse the directory above to assign 'department' for each message.\n\n"
    else:
        block = ""
    return TRIAGE_SYSTEM_TEMPLATE.format(company_directory_block=block)


BRIEFING_SYSTEM = """You are an AI Chief of Staff producing a structured daily briefing for a CEO.

Group the day's items into exactly four sections, in this order:
1. "Top Decisions Needed" — items the CEO must personally decide today.
2. "Delegated Actions" — items already routed to a direct report.
3. "Watch Items" — items to monitor but no action today.
4. "Quick Wins" — short acknowledgements, appreciations, or closures.

Each item must include:
- message_id: number (the source message id)
- summary: one sentence, <= 140 chars
- action: a clear next step, <= 140 chars

Return a JSON object matching this schema exactly:
{
  "sections": [
    { "title": "Top Decisions Needed", "items": [ { "message_id": number, "summary": string, "action": string } ] },
    { "title": "Delegated Actions",   "items": [ ... ] },
    { "title": "Watch Items",         "items": [ ... ] },
    { "title": "Quick Wins",          "items": [ ... ] }
  ]
}

Include all four sections even if some have empty items arrays. Do not include any other top-level fields.

Return ONLY valid JSON. No markdown, no prose, no backticks."""


def run_triage(messages: List[Message]) -> List[TriageItem]:
    payload = [m.model_dump(by_alias=True) for m in messages]
    user = f"Triage these {len(messages)} messages:\n\n{json.dumps(payload, indent=2)}"
    raw = _call_claude(_triage_system(), user, TRIAGE_MAX_TOKENS)
    parsed = _parse_json_or_502(raw)

    if not isinstance(parsed, list):
        raise HTTPException(
            status_code=502,
            detail={"error": "Claude returned malformed JSON", "raw": raw[:2000]},
        )

    try:
        return [TriageItem.model_validate(item) for item in parsed]
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Claude returned malformed JSON",
                "raw": raw[:2000],
                "validation": str(e),
            },
        )


def run_briefing(messages: List[Message], triage: List[TriageItem]) -> BriefingResponse:
    messages_payload = [m.model_dump(by_alias=True) for m in messages]
    triage_payload = [t.model_dump() for t in triage]

    user = (
        f"Source messages:\n{json.dumps(messages_payload, indent=2)}\n\n"
        f"Triage results:\n{json.dumps(triage_payload, indent=2)}"
    )

    raw = _call_claude(BRIEFING_SYSTEM, user, BRIEFING_MAX_TOKENS)
    parsed = _parse_json_or_502(raw)

    if not isinstance(parsed, dict) or "sections" not in parsed:
        raise HTTPException(
            status_code=502,
            detail={"error": "Claude returned malformed JSON", "raw": raw[:2000]},
        )

    try:
        sections = [BriefingSection.model_validate(s) for s in parsed["sections"]]
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={
                "error": "Claude returned malformed JSON",
                "raw": raw[:2000],
                "validation": str(e),
            },
        )

    return BriefingResponse(
        sections=sections,
        generated_at=datetime.now(timezone.utc),
    )


DAY_SUMMARY_MAX_TOKENS = 600

DAY_SUMMARY_SYSTEM = """You are an AI Chief of Staff writing the end-of-day wrap for a CEO whose entire briefing has been cleared.

Produce 3-5 short bullet points covering:
- Key accomplishments today (one bullet per major decision/delegation closed)
- Any pending Watch Items still worth monitoring tomorrow
- Reminders or follow-ups for tomorrow

Each bullet should be one sentence, plain prose, no markdown bullets in the strings themselves.

Return a JSON object matching this schema exactly:
{ "bullets": [string, ...] }

Return ONLY valid JSON. No markdown, no prose, no backticks."""


def run_day_summary(payload: dict) -> "DaySummary":
    from models.schemas import DaySummary

    user = (
        f"Today's sections:\n{json.dumps(payload.get('sections', []), indent=2)}\n\n"
        f"Completed message ids: {payload.get('completed_ids', [])}\n\n"
        f"Triage:\n{json.dumps(payload.get('triage', []), indent=2)}"
    )
    raw = _call_claude(DAY_SUMMARY_SYSTEM, user, DAY_SUMMARY_MAX_TOKENS)
    parsed = _parse_json_or_502(raw)

    if not isinstance(parsed, dict) or "bullets" not in parsed:
        raise HTTPException(
            status_code=502,
            detail={"error": "Claude returned malformed JSON", "raw": raw[:2000]},
        )

    try:
        return DaySummary.model_validate(parsed)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail={"error": "Claude returned malformed JSON", "raw": raw[:2000], "validation": str(e)},
        )
