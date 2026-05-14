from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


Category = Literal["Ignore", "Delegate", "Decide"]
FlagSeverity = Literal["Critical", "High"]


class Message(BaseModel):
    id: int
    channel: str
    from_: str = Field(alias="from")
    timestamp: str
    body: str
    subject: Optional[str] = None

    model_config = {"populate_by_name": True}


class TriageItem(BaseModel):
    id: int
    category: Category
    reasoning: str
    draft: str
    urgency: int = Field(ge=1, le=5)
    flagged: bool
    flag_severity: Optional[FlagSeverity] = None
    department: str = "Unknown"


class TriageRequest(BaseModel):
    messages: List[Message]


class TriageResponse(BaseModel):
    triage: List[TriageItem]


class BriefingItem(BaseModel):
    message_id: int
    summary: str
    action: str


class BriefingSection(BaseModel):
    title: str
    items: List[BriefingItem]


class BriefingResponse(BaseModel):
    sections: List[BriefingSection]
    generated_at: datetime


class BriefingRequest(BaseModel):
    messages: List[Message]
    triage: List[TriageItem]


class FlagItem(BaseModel):
    id: int
    flag_severity: FlagSeverity
    reasoning: str


class FlagsResponse(BaseModel):
    flags: List[FlagItem]


class DaySummary(BaseModel):
    bullets: List[str]
