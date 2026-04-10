"""Quotations router: full CRUD for cotizaciones."""
import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.quotation import Quotation, QuotationLine
from app.models.user import User
from app.schemas.quotation import (
    QuotationCreate,
    QuotationLineResponse,
    QuotationListResponse,
    QuotationResponse,
    QuotationUpdate,
)

router = APIRouter(prefix="/api/quotations", tags=["quotations"])


async def _generate_number(db: AsyncSession) -> str:
    """Auto-generate next quotation number as COT-XXXXX."""
    result = await db.execute(select(func.count()).select_from(Quotation))
    count = result.scalar() or 0
    return f"COT-{(count + 1):05d}"


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


@router.get("", response_model=list[QuotationListResponse])
async def list_quotations(
    status_filter: str | None = Query(default=None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all quotations, optionally filtered by status."""
    stmt = select(Quotation).order_by(Quotation.id.desc())
    if status_filter:
        stmt = stmt.where(Quotation.status == status_filter)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    data: QuotationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a quotation with its line items. Auto-generates number and calculates totals."""
    if not data.lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La cotizacion debe tener al menos una linea",
        )

    number = await _generate_number(db)
    issue_date = data.issue_date or datetime.date.today()

    quotation = Quotation(
        number=number,
        client_id=data.client_id,
        client_name=data.client_name,
        client_document=data.client_document,
        issue_date=issue_date,
        expiry_date=data.expiry_date,
        notes=data.notes,
        subtotal=Decimal("0"),
        tax_total=Decimal("0"),
        total=Decimal("0"),
        status="draft",
    )
    db.add(quotation)
    await db.flush()  # get quotation.id

    subtotal = Decimal("0")
    tax_total = Decimal("0")

    for line_data in data.lines:
        line_total, tax_amount = _calculate_line(
            line_data.quantity,
            line_data.unit_price,
            line_data.discount_rate,
            line_data.tax_rate,
        )
        line = QuotationLine(
            quotation_id=quotation.id,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_rate=line_data.discount_rate,
            tax_code=line_data.tax_code,
            tax_rate=line_data.tax_rate,
            line_total=line_total,
            tax_amount=tax_amount,
        )
        db.add(line)
        subtotal += line_total
        tax_total += tax_amount

    quotation.subtotal = subtotal
    quotation.tax_total = tax_total
    quotation.total = subtotal + tax_total

    await db.commit()
    await db.refresh(quotation)

    # load lines for response
    lines_result = await db.execute(
        select(QuotationLine).where(QuotationLine.quotation_id == quotation.id)
    )
    lines = lines_result.scalars().all()

    response = QuotationResponse.model_validate(quotation)
    response.lines = [QuotationLineResponse.model_validate(l) for l in lines]
    return response


@router.get("/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single quotation with its line items."""
    result = await db.execute(
        select(Quotation).where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()
    if quotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotizacion no encontrada")

    lines_result = await db.execute(
        select(QuotationLine).where(QuotationLine.quotation_id == quotation_id)
    )
    lines = lines_result.scalars().all()

    response = QuotationResponse.model_validate(quotation)
    response.lines = [QuotationLineResponse.model_validate(l) for l in lines]
    return response


@router.put("/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: int,
    data: QuotationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a quotation and replace all its line items."""
    if not data.lines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La cotizacion debe tener al menos una linea",
        )

    result = await db.execute(
        select(Quotation).where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()
    if quotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotizacion no encontrada")

    # delete existing lines
    existing_lines_result = await db.execute(
        select(QuotationLine).where(QuotationLine.quotation_id == quotation_id)
    )
    for line in existing_lines_result.scalars().all():
        await db.delete(line)

    quotation.client_id = data.client_id
    quotation.client_name = data.client_name
    quotation.client_document = data.client_document
    quotation.issue_date = data.issue_date or quotation.issue_date
    quotation.expiry_date = data.expiry_date
    quotation.notes = data.notes
    if data.status:
        quotation.status = data.status

    subtotal = Decimal("0")
    tax_total = Decimal("0")

    for line_data in data.lines:
        line_total, tax_amount = _calculate_line(
            line_data.quantity,
            line_data.unit_price,
            line_data.discount_rate,
            line_data.tax_rate,
        )
        line = QuotationLine(
            quotation_id=quotation.id,
            description=line_data.description,
            quantity=line_data.quantity,
            unit_price=line_data.unit_price,
            discount_rate=line_data.discount_rate,
            tax_code=line_data.tax_code,
            tax_rate=line_data.tax_rate,
            line_total=line_total,
            tax_amount=tax_amount,
        )
        db.add(line)
        subtotal += line_total
        tax_total += tax_amount

    quotation.subtotal = subtotal
    quotation.tax_total = tax_total
    quotation.total = subtotal + tax_total

    await db.commit()
    await db.refresh(quotation)

    lines_result = await db.execute(
        select(QuotationLine).where(QuotationLine.quotation_id == quotation.id)
    )
    lines = lines_result.scalars().all()

    response = QuotationResponse.model_validate(quotation)
    response.lines = [QuotationLineResponse.model_validate(l) for l in lines]
    return response


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a quotation and all its line items."""
    result = await db.execute(
        select(Quotation).where(Quotation.id == quotation_id)
    )
    quotation = result.scalar_one_or_none()
    if quotation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cotizacion no encontrada")

    lines_result = await db.execute(
        select(QuotationLine).where(QuotationLine.quotation_id == quotation_id)
    )
    for line in lines_result.scalars().all():
        await db.delete(line)

    await db.delete(quotation)
    await db.commit()
