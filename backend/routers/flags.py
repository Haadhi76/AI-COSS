from typing import List

from fastapi import APIRouter, Body

from models.schemas import FlagItem, FlagsResponse, TriageItem

router = APIRouter()


@router.get("/api/flags", response_model=FlagsResponse)
def flags(triage: List[TriageItem] = Body(..., embed=True)) -> FlagsResponse:
    """
    Derive flagged items from a triage result set.

    The service is stateless, so the client passes the triage list in the
    request body. Returns only items where flagged is true, projected to the
    minimal shape needed by the flags view.
    """
    flagged = [
        FlagItem(
            id=item.id,
            flag_severity=item.flag_severity or "High",
            reasoning=item.reasoning,
        )
        for item in triage
        if item.flagged
    ]
    return FlagsResponse(flags=flagged)
