from fastapi import APIRouter

from models.schemas import TriageRequest, TriageResponse
from services.claude_service import run_triage

router = APIRouter()


@router.post("/api/triage", response_model=TriageResponse)
def triage(request: TriageRequest) -> TriageResponse:
    items = run_triage(request.messages)
    return TriageResponse(triage=items)
