"""Resolutions router: CRUD for DIAN numbering resolutions."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.resolution import NumberingResolution
from app.schemas.resolution import ResolutionCreate, ResolutionResponse

router = APIRouter(prefix="/api/resolutions", tags=["resolutions"])


@router.get("", response_model=list[ResolutionResponse])
async def list_resolutions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all numbering resolutions."""
    result = await db.execute(
        select(NumberingResolution).order_by(NumberingResolution.id.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ResolutionResponse, status_code=status.HTTP_201_CREATED)
async def create_resolution(
    data: ResolutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new numbering resolution.
    Validates that from_number < to_number.
    """
    if data.from_number >= data.to_number:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El numero desde debe ser menor que el numero hasta",
        )

    resolution = NumberingResolution(
        prefix=data.prefix,
        from_number=data.from_number,
        to_number=data.to_number,
        current_number=data.from_number,
        technical_key=data.technical_key,
        valid_from=data.valid_from,
        valid_to=data.valid_to,
        resolution_number=data.resolution_number,
        is_active=True,
    )
    db.add(resolution)
    await db.commit()
    await db.refresh(resolution)
    return resolution


@router.get("/{resolution_id}", response_model=ResolutionResponse)
async def get_resolution(
    resolution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single numbering resolution by ID."""
    result = await db.execute(
        select(NumberingResolution).where(NumberingResolution.id == resolution_id)
    )
    resolution = result.scalar_one_or_none()
    if resolution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resolucion no encontrada")
    return resolution


@router.put("/{resolution_id}", response_model=ResolutionResponse)
async def update_resolution(
    resolution_id: int,
    data: ResolutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing numbering resolution."""
    if data.from_number >= data.to_number:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El numero desde debe ser menor que el numero hasta",
        )

    result = await db.execute(
        select(NumberingResolution).where(NumberingResolution.id == resolution_id)
    )
    resolution = result.scalar_one_or_none()
    if resolution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resolucion no encontrada")

    resolution.prefix = data.prefix
    resolution.from_number = data.from_number
    resolution.to_number = data.to_number
    resolution.technical_key = data.technical_key
    resolution.valid_from = data.valid_from
    resolution.valid_to = data.valid_to
    resolution.resolution_number = data.resolution_number

    await db.commit()
    await db.refresh(resolution)
    return resolution


@router.delete("/{resolution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resolution(
    resolution_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a numbering resolution."""
    result = await db.execute(
        select(NumberingResolution).where(NumberingResolution.id == resolution_id)
    )
    resolution = result.scalar_one_or_none()
    if resolution is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resolucion no encontrada")

    await db.delete(resolution)
    await db.commit()
