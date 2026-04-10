"""Schemas for the unified documents endpoint."""
from pydantic import BaseModel


class DocumentListItem(BaseModel):
    """A single document row in the unified documents list.

    Aggregates invoices (FC/NC/ND) and quotations into one response shape.
    """

    id: int
    source: str  # "invoice" | "quotation"
    number: str
    document_type: str  # "Factura de Venta" | "Nota Crédito" | "Nota Débito" | "Cotización"
    client_name: str
    client_document: str
    issue_date: str  # ISO date string YYYY-MM-DD
    total: float
    status: str  # dian_status for invoices, status for quotations
    has_pdf: bool
    has_xml: bool

    model_config = {"from_attributes": True}
