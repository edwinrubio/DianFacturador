"""Pydantic schemas for DIAN numbering resolution management."""
import datetime

from pydantic import BaseModel


class ResolutionCreate(BaseModel):
    prefix: str
    from_number: int
    to_number: int
    technical_key: str
    valid_from: datetime.date
    valid_to: datetime.date
    resolution_number: str | None = None


class ResolutionResponse(BaseModel):
    id: int
    prefix: str
    from_number: int
    to_number: int
    current_number: int | None
    technical_key: str
    valid_from: datetime.date
    valid_to: datetime.date
    resolution_number: str | None
    is_active: bool

    model_config = {"from_attributes": True}
