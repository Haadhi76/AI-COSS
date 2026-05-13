from fastapi import APIRouter, Query

from db import list_briefings

router = APIRouter()


@router.get("/api/briefings/history")
def history(limit: int = Query(50, ge=1, le=200)) -> dict:
    return {"briefings": list_briefings(limit=limit)}
