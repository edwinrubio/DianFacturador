"""Pydantic schemas for Quotation (cotizacion) CRUD."""
import datetime
from decimal import Decimal

from pydantic import BaseModel


class QuotationLineCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    discount_rate: Decimal = Decimal("0")
    tax_code: str = "01"
    tax_rate: Decimal = Decimal("19")


class QuotationLineResponse(BaseModel):
    id: int
    quotation_id: int
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_rate: Decimal
    tax_code: str
    tax_rate: Decimal
    line_total: Decimal
    tax_amount: Decimal

    model_config = {"from_attributes": True}


class QuotationCreate(BaseModel):
    client_id: int | None = None
    client_name: str
    client_document: str
    issue_date: datetime.date | None = None
    expiry_date: datetime.date | None = None
    notes: str | None = None
    lines: list[QuotationLineCreate]


class QuotationUpdate(BaseModel):
    client_id: int | None = None
    client_name: str
    client_document: str
    issue_date: datetime.date | None = None
    expiry_date: datetime.date | None = None
    notes: str | None = None
    status: str | None = None
    lines: list[QuotationLineCreate]


class QuotationResponse(BaseModel):
    id: int
    number: str
    client_id: int | None
    client_name: str
    client_document: str
    issue_date: datetime.date
    expiry_date: datetime.date | None
    notes: str | None
    subtotal: Decimal
    tax_total: Decimal
    total: Decimal
    status: str
    created_at: datetime.datetime
    lines: list[QuotationLineResponse]

    model_config = {"from_attributes": True}


class QuotationListResponse(BaseModel):
    id: int
    number: str
    client_name: str
    client_document: str
    issue_date: datetime.date
    total: Decimal
    status: str

    model_config = {"from_attributes": True}
