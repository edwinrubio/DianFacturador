"""Clients router: CRUD for customer fiscal records."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientUpdate, ClientResponse
from app.services.nit import calculate_check_digit

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("", response_model=list[ClientResponse])
async def list_clients(
    q: str | None = Query(default=None, description="Search by name, document number, or email"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all active clients, optionally filtered by search query."""
    stmt = select(Client).where(Client.is_active == True)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Client.name.ilike(like),
                Client.document_number.ilike(like),
                Client.email.ilike(like),
                Client.trade_name.ilike(like),
            )
        )
    stmt = stmt.order_by(Client.name)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    data: ClientCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new client. Auto-calculates check digit for NIT document type."""
    check_digit = None
    if data.document_type == "31":  # NIT
        try:
            check_digit = calculate_check_digit(data.document_number)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Numero de NIT invalido: {e}",
            )

    client = Client(
        document_type=data.document_type,
        document_number=data.document_number,
        check_digit=check_digit,
        name=data.name,
        trade_name=data.trade_name,
        fiscal_regime=data.fiscal_regime,
        fiscal_responsibilities=data.fiscal_responsibilities,
        address=data.address,
        city=data.city,
        department=data.department,
        email=data.email,
        phone=data.phone,
        is_active=True,
    )
    db.add(client)
    await db.commit()
    await db.refresh(client)
    return client


@router.get("/{client_id}", response_model=ClientResponse)
async def get_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single client by ID."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")
    return client


@router.put("/{client_id}", response_model=ClientResponse)
async def update_client(
    client_id: int,
    data: ClientUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing client. Recalculates check digit if document_number or document_type changes."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # Recalculate check digit if NIT-related fields changed
    new_doc_type = update_data.get("document_type", client.document_type)
    new_doc_number = update_data.get("document_number", client.document_number)

    if "document_type" in update_data or "document_number" in update_data:
        if new_doc_type == "31":  # NIT
            try:
                update_data["check_digit"] = calculate_check_digit(new_doc_number)
            except ValueError as e:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Numero de NIT invalido: {e}",
                )
        else:
            update_data["check_digit"] = None

    for field, value in update_data.items():
        setattr(client, field, value)

    await db.commit()
    await db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_client(
    client_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft-delete a client by setting is_active=False."""
    result = await db.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cliente no encontrado")

    client.is_active = False
    await db.commit()
