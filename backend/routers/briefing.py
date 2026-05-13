from fastapi import APIRouter

from models.schemas import BriefingRequest, BriefingResponse
from services.claude_service import run_briefing

router = APIRouter()


@router.post("/api/briefing", response_model=BriefingResponse)
def briefing(request: BriefingRequest) -> BriefingResponse:
    return run_briefing(request.messages, request.triage)
