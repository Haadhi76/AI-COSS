from fastapi import APIRouter

from db import get_today, upsert_today, utc_today_str
from models.schemas import (
    TodayBriefingRequest,
    TodayBriefingResponse,
)
from services.claude_service import run_briefing, run_triage

router = APIRouter()


@router.post("/api/briefing/today", response_model=TodayBriefingResponse)
def post_today(request: TodayBriefingRequest) -> TodayBriefingResponse:
    today = utc_today_str()
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
