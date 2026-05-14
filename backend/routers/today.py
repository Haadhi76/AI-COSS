from fastapi import APIRouter, HTTPException

from db import get_today, update_today_payload, upsert_today, utc_today_str
from models.schemas import (
    CompletionRequest,
    OverrideRequest,
    TodayBriefingRequest,
    TodayBriefingResponse,
)
from services.claude_service import run_briefing, run_day_summary, run_triage

router = APIRouter()

CHECKABLE_SECTIONS = {"Top Decisions Needed", "Delegated Actions", "Quick Wins"}


def _checkable_ids(payload: dict) -> set[int]:
    ids: set[int] = set()
    for section in payload.get("sections", []):
        if section.get("title") in CHECKABLE_SECTIONS:
            for item in section.get("items", []):
                ids.add(int(item["message_id"]))
    return ids


@router.post("/api/briefing/today", response_model=TodayBriefingResponse)
def post_today(request: TodayBriefingRequest, force: bool = False) -> TodayBriefingResponse:
    today = utc_today_str()
    if not force:
        existing = get_today(today)
        if existing:
            return TodayBriefingResponse.model_validate(existing)

    triage_items = run_triage(request.messages)
    briefing = run_briefing(request.messages, triage_items)

    payload = {
        "sections": [s.model_dump() for s in briefing.sections],
        "generated_at": briefing.generated_at.isoformat(),
        "messages": [m.model_dump(by_alias=True) for m in request.messages],
        "triage": [t.model_dump() for t in triage_items],
        "completed_ids": [],
        "overrides": {},
        "day_summary": None,
    }
    row_id = upsert_today(today, payload)
    payload["id"] = row_id
    payload["briefing_date"] = today
    return TodayBriefingResponse.model_validate(payload)


@router.patch("/api/briefing/today/completion", response_model=TodayBriefingResponse)
def patch_completion(req: CompletionRequest) -> TodayBriefingResponse:
    today = utc_today_str()

    def mutate(payload: dict) -> dict:
        completed = set(payload.get("completed_ids", []))
        if req.completed:
            completed.add(req.message_id)
        else:
            completed.discard(req.message_id)
        payload["completed_ids"] = sorted(completed)

        # If every checkable todo is done, generate the day summary.
        checkable = _checkable_ids(payload)
        if checkable and checkable.issubset(completed) and not payload.get("day_summary"):
            summary = run_day_summary(payload)
            payload["day_summary"] = summary.model_dump()
        return payload

    updated = update_today_payload(today, mutate)
    if updated is None:
        raise HTTPException(status_code=404, detail="No briefing for today yet")
    return TodayBriefingResponse.model_validate(updated)


@router.patch("/api/briefing/today/override", response_model=TodayBriefingResponse)
def patch_override(req: OverrideRequest) -> TodayBriefingResponse:
    today = utc_today_str()

    def mutate(payload: dict) -> dict:
        overrides = dict(payload.get("overrides", {}))
        key = str(req.message_id)
        if req.category is None:
            overrides.pop(key, None)
        else:
            overrides[key] = req.category
        payload["overrides"] = overrides
        return payload

    updated = update_today_payload(today, mutate)
    if updated is None:
        raise HTTPException(status_code=404, detail="No briefing for today yet")
    return TodayBriefingResponse.model_validate(updated)
