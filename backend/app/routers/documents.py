"""Documents router: unified view of all document types (invoices + quotations)."""
import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.quotation import Quotation
from app.models.user import User
from app.schemas.document import DocumentListItem

# Try to import Invoice — it may not exist if the invoices agent hasn't run yet.
try:
    from app.models.invoice import Invoice

    _HAS_INVOICE_MODEL = True
except ImportError:
    _HAS_INVOICE_MODEL = False

router = APIRouter(prefix="/api/documents", tags=["documents"])

# Map invoice_type codes to human-readable labels
_INVOICE_TYPE_LABELS: dict[str, str] = {
    "01": "Factura de Venta",
    "91": "Nota Crédito",
    "92": "Nota Débito",
}


def _invoice_to_item(inv: Any) -> DocumentListItem:
    """Convert an Invoice ORM row to a DocumentListItem."""
    return DocumentListItem(
        id=inv.id,
        source="invoice",
        number=inv.number or f"FC-{inv.id:05d}",
        document_type=_INVOICE_TYPE_LABELS.get(inv.invoice_type, "Factura de Venta"),
        client_name=inv.client_name,
        client_document=inv.client_document,
        issue_date=str(inv.issue_date),
        total=float(inv.total),
        status=inv.dian_status,
        has_pdf=bool(inv.pdf_path),
        has_xml=bool(inv.xml_path),
    )


def _quotation_to_item(q: Quotation) -> DocumentListItem:
    """Convert a Quotation ORM row to a DocumentListItem."""
    return DocumentListItem(
        id=q.id,
        source="quotation",
        number=q.number,
        document_type="Cotización",
        client_name=q.client_name,
        client_document=q.client_document,
        issue_date=str(q.issue_date),
        total=float(q.total),
        status=q.status,
        has_pdf=False,
        has_xml=False,
    )


@router.get("", response_model=list[DocumentListItem])
async def list_documents(
    type: str | None = Query(default=None, description="invoice | credit_note | debit_note | quotation"),
    status: str | None = Query(default=None),
    q: str | None = Query(default=None, description="Search by client name, document number, or NIT"),
    from_date: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    to_date: str | None = Query(default=None, description="ISO date YYYY-MM-DD"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DocumentListItem]:
    """Return a unified list of all documents sorted by issue_date descending.

    Combines invoices (if the table exists) and quotations. Supports filtering
    by document type, status, date range, and a free-text search term.
    """
    items: list[DocumentListItem] = []

    # --- Parse date filters ---
    date_from: datetime.date | None = None
    date_to: datetime.date | None = None
    if from_date:
        try:
            date_from = datetime.date.fromisoformat(from_date)
        except ValueError:
            pass
    if to_date:
        try:
            date_to = datetime.date.fromisoformat(to_date)
        except ValueError:
            pass

    # --- Determine which source types to include ---
    include_invoices = type in (None, "invoice", "credit_note", "debit_note")
    include_quotations = type in (None, "quotation")

    # Map frontend type filter to invoice_type code
    _type_to_code: dict[str, str] = {
        "invoice": "01",
        "credit_note": "91",
        "debit_note": "92",
    }

    # --- Query invoices ---
    if _HAS_INVOICE_MODEL and include_invoices:
        try:
            stmt = select(Invoice)
            if type in _type_to_code:
                stmt = stmt.where(Invoice.invoice_type == _type_to_code[type])
            if status:
                stmt = stmt.where(Invoice.dian_status == status)
            if date_from:
                stmt = stmt.where(Invoice.issue_date >= date_from)
            if date_to:
                stmt = stmt.where(Invoice.issue_date <= date_to)
            if q:
                search = f"%{q}%"
                from sqlalchemy import or_
                stmt = stmt.where(
                    or_(
                        Invoice.client_name.ilike(search),
                        Invoice.client_document.ilike(search),
                        Invoice.number.ilike(search),
                    )
                )
            result = await db.execute(stmt)
            for inv in result.scalars().all():
                items.append(_invoice_to_item(inv))
        except Exception:
            # Table may not exist yet — skip invoices gracefully
            pass

    # --- Query quotations ---
    if include_quotations:
        stmt_q = select(Quotation)
        if status:
            stmt_q = stmt_q.where(Quotation.status == status)
        if date_from:
            stmt_q = stmt_q.where(Quotation.issue_date >= date_from)
        if date_to:
            stmt_q = stmt_q.where(Quotation.issue_date <= date_to)
        if q:
            search = f"%{q}%"
            from sqlalchemy import or_
            stmt_q = stmt_q.where(
                or_(
                    Quotation.client_name.ilike(search),
                    Quotation.client_document.ilike(search),
                    Quotation.number.ilike(search),
                )
            )
        result_q = await db.execute(stmt_q)
        for quot in result_q.scalars().all():
            items.append(_quotation_to_item(quot))

    # --- Sort combined list by issue_date descending, then id descending ---
    items.sort(key=lambda x: (x.issue_date, x.id), reverse=True)

    return items
