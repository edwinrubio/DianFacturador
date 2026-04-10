"""Pydantic schemas for Invoice (factura electronica) CRUD."""
import datetime
from decimal import Decimal

from pydantic import BaseModel


class InvoiceLineCreate(BaseModel):
    description: str
    quantity: Decimal = Decimal("1")
    unit_measure: str = "94"
    unit_price: Decimal
    discount_rate: Decimal = Decimal("0")
    tax_code: str = "01"
    tax_rate: Decimal = Decimal("19")


class InvoiceLineResponse(BaseModel):
    id: int
    invoice_id: int
    description: str
    quantity: Decimal
    unit_measure: str
    unit_price: Decimal
    discount_rate: Decimal
    tax_code: str
    tax_rate: Decimal
    line_total: Decimal
    tax_amount: Decimal

    model_config = {"from_attributes": True}


class InvoiceCreate(BaseModel):
    invoice_type: str = "01"
    client_id: int | None = None
    client_name: str
    client_document_type: str = "31"
    client_document: str
    client_email: str | None = None
    issue_date: datetime.date | None = None
    due_date: datetime.date | None = None
    payment_method: str = "10"
    notes: str | None = None
    resolution_id: int | None = None
    lines: list[InvoiceLineCreate]


class InvoiceUpdate(BaseModel):
    invoice_type: str = "01"
    client_id: int | None = None
    client_name: str
    client_document_type: str = "31"
    client_document: str
    client_email: str | None = None
    issue_date: datetime.date | None = None
    due_date: datetime.date | None = None
    payment_method: str = "10"
    notes: str | None = None
    resolution_id: int | None = None
    lines: list[InvoiceLineCreate]


class InvoiceResponse(BaseModel):
    id: int
    number: str | None
    invoice_type: str
    client_id: int | None
    client_name: str
    client_document_type: str
    client_document: str
    client_email: str | None
    issue_date: datetime.date
    due_date: datetime.date | None
    payment_method: str
    notes: str | None
    subtotal: Decimal
    discount_total: Decimal
    tax_total: Decimal
    total: Decimal
    cufe: str | None
    dian_status: str
    dian_response: str | None
    xml_path: str | None
    pdf_path: str | None
    resolution_id: int | None
    created_at: datetime.datetime
    lines: list[InvoiceLineResponse]

    model_config = {"from_attributes": True}


class InvoiceListResponse(BaseModel):
    id: int
    number: str | None
    invoice_type: str
    client_name: str
    issue_date: datetime.date
    total: Decimal
    dian_status: str

    model_config = {"from_attributes": True}
