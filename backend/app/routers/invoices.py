"""Invoices router: full CRUD for facturas electronicas."""
import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.invoice import Invoice, InvoiceLine
from app.models.resolution import NumberingResolution
from app.models.user import User
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceLineResponse,
    InvoiceListResponse,
    InvoiceResponse,
    InvoiceUpdate,
)

router = APIRouter(prefix="/api/invoices", tags=["invoices"])


async def _generate_number(db: AsyncSession, resolution_id: int | None) -> str | None:
    """Auto-generate next invoice number from active resolution prefix + next number.

    Returns None if no resolution is available (the number column is nullable).
    """
    resolution: NumberingResolution | None = None

    if resolution_id:
        result = await db.execute(
            select(NumberingResolution).where(NumberingResolution.id == resolution_id)
        )
        resolution = result.scalar_one_or_none()

    if resolution is None:
        # Try to find any active resolution
        result = await db.execute(
            select(NumberingResolution)
            .where(NumberingResolution.is_active == True)  # noqa: E712
            .order_by(NumberingResolution.id.asc())
            .limit(1)
        )
        resolution = result.scalar_one_or_none()

    if resolution is None:
        return None

    next_number = (resolution.current_number or resolution.from_number - 1) + 1
    resolution.current_number = next_number
    return f"{resolution.prefix}{next_number}"


def _calculate_line(
    quantity: Decimal,
    unit_price: Decimal,
    discount_rate: Decimal,
    tax_rate: Decimal,
) -> tuple[Decimal, Decimal]:
    """Return (line_total, tax_amount)."""
    line_total = quantity * unit_price * (1 - discount_rate / Decimal("100"))
    line_total = line_total.quantize(Decimal("0.01"))
    tax_amount = (line_total * tax_rate / Decimal("100")).quantize(Decimal("0.01"))
    return line_total, tax_amount


@router.get("", response_model=list[InvoiceListResponse])
async def list_invoices(
    status_filter: str | None = Query(default=None, alias="status"),
    type_filter: str | None = Query(default=None, alias="type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all invoices, optionally filtered by dian_status and/or invoice_type."""
    stmt = select(Invoice).order_by(Invoice.id.desc())
    if status_filter:
        stmt = stmt.where(Invoice.dian_status == status_filter)
    if type_filter:
        stmt = stmt.where(Invoice.invoice_type == type_filter)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create an invoice with its line items. Auto-calculates totals and generates number from resolution."""
    if not data.lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La factura debe tener al menos una linea",
        )

    number = await _generate_number(db, data.resolution_id)
    issue_date = data.issue_date or datetime.date.today()

    invoice = Invoice(
        number=number,
        invoice_type=data.invoice_type,
        client_id=data.client_id,
        client_name=data.client_name,
        client_document_type=data.client_document_type,
        client_document=data.client_document,
        client_email=data.client_email,
        issue_date=issue_date,
        due_date=data.due_date,
        payment_method=data.payment_method,
        notes=data.notes,
        resolution_id=data.resolution_id,
        subtotal=Decimal("0"),
        discount_total=Decimal("0"),
        tax_total=Decimal("0"),
        total=Decimal("0"),
        dian_status="draft",
    )
    db.add(invoice)
    await db.flush()  # get invoice.id

    subtotal = Decimal("0")
    discount_total = Decimal("0")
    tax_total = Decimal("0")

    for line_data in data.lines:
        gross = line_data.quantity * line_data.unit_price
        gross = gross.quantize(Decimal("0.01"))
        discount_amount = (gross * line_data.discount_rate / Decimal("100")).quantize(Decimal("0.01"))
        line_total, tax_amount = _calculate_line(
            line_data.quantity,
            line_data.unit_price,
            line_data.discount_rate,
            line_data.tax_rate,
        )
        line = InvoiceLine(
            invoice_id=invoice.id,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_measure=line_data.unit_measure,
            unit_price=line_data.unit_price,
            discount_rate=line_data.discount_rate,
            tax_code=line_data.tax_code,
            tax_rate=line_data.tax_rate,
            line_total=line_total,
            tax_amount=tax_amount,
        )
        db.add(line)
        subtotal += gross
        discount_total += discount_amount
        tax_total += tax_amount

    invoice.subtotal = subtotal
    invoice.discount_total = discount_total
    invoice.tax_total = tax_total
    invoice.total = subtotal - discount_total + tax_total

    await db.commit()
    await db.refresh(invoice)

    lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice.id)
    )
    lines = lines_result.scalars().all()

    response = InvoiceResponse.model_validate(invoice)
    response.lines = [InvoiceLineResponse.model_validate(l) for l in lines]
    return response


@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single invoice with its line items."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")

    lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id)
    )
    lines = lines_result.scalars().all()

    response = InvoiceResponse.model_validate(invoice)
    response.lines = [InvoiceLineResponse.model_validate(l) for l in lines]
    return response


@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    data: InvoiceUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an invoice and replace all its line items. Only allowed when dian_status is 'draft'."""
    if not data.lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La factura debe tener al menos una linea",
        )

    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")

    if invoice.dian_status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solo se pueden editar facturas en estado 'draft'. Estado actual: '{invoice.dian_status}'",
        )

    # Delete existing lines
    existing_lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id)
    )
    for line in existing_lines_result.scalars().all():
        await db.delete(line)

    invoice.invoice_type = data.invoice_type
    invoice.client_id = data.client_id
    invoice.client_name = data.client_name
    invoice.client_document_type = data.client_document_type
    invoice.client_document = data.client_document
    invoice.client_email = data.client_email
    invoice.issue_date = data.issue_date or invoice.issue_date
    invoice.due_date = data.due_date
    invoice.payment_method = data.payment_method
    invoice.notes = data.notes
    invoice.resolution_id = data.resolution_id

    subtotal = Decimal("0")
    discount_total = Decimal("0")
    tax_total = Decimal("0")

    for line_data in data.lines:
        gross = line_data.quantity * line_data.unit_price
        gross = gross.quantize(Decimal("0.01"))
        discount_amount = (gross * line_data.discount_rate / Decimal("100")).quantize(Decimal("0.01"))
        line_total, tax_amount = _calculate_line(
            line_data.quantity,
            line_data.unit_price,
            line_data.discount_rate,
            line_data.tax_rate,
        )
        line = InvoiceLine(
            invoice_id=invoice.id,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_measure=line_data.unit_measure,
            unit_price=line_data.unit_price,
            discount_rate=line_data.discount_rate,
            tax_code=line_data.tax_code,
            tax_rate=line_data.tax_rate,
            line_total=line_total,
            tax_amount=tax_amount,
        )
        db.add(line)
        subtotal += gross
        discount_total += discount_amount
        tax_total += tax_amount

    invoice.subtotal = subtotal
    invoice.discount_total = discount_total
    invoice.tax_total = tax_total
    invoice.total = subtotal - discount_total + tax_total

    await db.commit()
    await db.refresh(invoice)

    lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice.id)
    )
    lines = lines_result.scalars().all()

    response = InvoiceResponse.model_validate(invoice)
    response.lines = [InvoiceLineResponse.model_validate(l) for l in lines]
    return response


@router.delete("/{invoice_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_invoice(
    invoice_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete an invoice and all its line items. Only allowed when dian_status is 'draft'."""
    result = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    invoice = result.scalar_one_or_none()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Factura no encontrada")

    if invoice.dian_status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Solo se pueden eliminar facturas en estado 'draft'. Estado actual: '{invoice.dian_status}'",
        )

    lines_result = await db.execute(
        select(InvoiceLine).where(InvoiceLine.invoice_id == invoice_id)
    )
    for line in lines_result.scalars().all():
        await db.delete(line)

    await db.delete(invoice)
    await db.commit()
