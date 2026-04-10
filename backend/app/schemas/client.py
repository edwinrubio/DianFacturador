"""Pydantic schemas for Client CRUD operations."""
from pydantic import BaseModel, EmailStr


class ClientCreate(BaseModel):
    document_type: str
    document_number: str
    name: str
    trade_name: str | None = None
    fiscal_regime: str = "R-99-PN"
    fiscal_responsibilities: str = "R-99-PN"
    address: str
    city: str
    department: str
    email: str
    phone: str | None = None


class ClientUpdate(BaseModel):
    document_type: str | None = None
    document_number: str | None = None
    name: str | None = None
    trade_name: str | None = None
    fiscal_regime: str | None = None
    fiscal_responsibilities: str | None = None
    address: str | None = None
    city: str | None = None
    department: str | None = None
    email: str | None = None
    phone: str | None = None
    is_active: bool | None = None


class ClientResponse(BaseModel):
    id: int
    document_type: str
    document_number: str
    check_digit: str | None
    name: str
    trade_name: str | None
    fiscal_regime: str
    fiscal_responsibilities: str
    address: str
    city: str
    department: str
    email: str
    phone: str | None
    is_active: bool

    model_config = {"from_attributes": True}
