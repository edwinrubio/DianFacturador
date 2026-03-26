"""Setup status router: onboarding completion check for all 4 configuration steps."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.settings import CompanySettings
from app.models.resolution import NumberingResolution

router = APIRouter(prefix="/api/setup", tags=["setup"])


@router.get("/status")
async def get_setup_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return structured setup completion status for the onboarding wizard.
    Each step maps to a CONF requirement:
    - business_profile: CONF-01 (NIT, razon social, etc.)
    - certificate: CONF-02 (.p12 uploaded)
    - resolution: CONF-03 (at least one active resolution)
    - environment: CONF-04 (habilitacion/produccion selected)
    """
    result = await db.execute(select(CompanySettings).where(CompanySettings.id == 1))
    settings = result.scalar_one_or_none()

    resolution_count = await db.execute(
        select(func.count()).select_from(NumberingResolution).where(
            NumberingResolution.is_active == True
        )
    )
    active_resolutions = resolution_count.scalar() or 0

    steps = {
        "business_profile": (
            settings is not None
            and settings.nit is not None
            and settings.razon_social is not None
        ),
        "certificate": (
            settings is not None
            and settings.cert_path is not None
        ),
        "resolution": active_resolutions > 0,
        "environment": (
            settings is not None
            and settings.dian_environment is not None
        ),
    }

    return {
        "is_complete": all(steps.values()),
        "steps": steps,
        "missing": [k for k, v in steps.items() if not v],
    }
