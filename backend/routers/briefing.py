from fastapi import APIRouter

from db import save_briefing
from models.schemas import BriefingRequest, BriefingResponse
from services.claude_service import run_briefing

router = APIRouter()


@router.post("/api/briefing", response_model=BriefingResponse)
def briefing(request: BriefingRequest) -> BriefingResponse:
    result = run_briefing(request.messages, request.triage)
    save_briefing(result.model_dump(mode="json"))
    return result
