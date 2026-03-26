"""Settings router: business profile, certificate upload, and DIAN environment selection."""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import get_settings, Settings
from app.core.security import get_current_user
from app.models.user import User
from app.models.settings import CompanySettings, DIANEnvironment, FiscalRegime
from app.schemas.settings import (
    BusinessProfileCreate, BusinessProfileResponse,
    CertificateUploadResponse, EnvironmentUpdate,
)
from app.services.nit import calculate_check_digit
from app.services.certificate import (
    validate_pkcs12, save_certificate_file, encrypt_passphrase,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=BusinessProfileResponse)
async def get_settings_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the company settings profile."""
    result = await db.execute(select(CompanySettings).where(CompanySettings.id == 1))
    settings_row = result.scalar_one_or_none()
    if settings_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Perfil no configurado")
    return BusinessProfileResponse(
        nit=settings_row.nit,
        check_digit=settings_row.check_digit,
        razon_social=settings_row.razon_social,
        fiscal_regime=settings_row.fiscal_regime.value,
        address=settings_row.address,
        city=settings_row.city,
        department=settings_row.department,
        email=settings_row.email,
        phone=settings_row.phone,
        has_certificate=settings_row.cert_path is not None,
        dian_environment=settings_row.dian_environment.value if settings_row.dian_environment else None,
    )


@router.put("/profile", response_model=BusinessProfileResponse)
async def update_business_profile(
    data: BusinessProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create or update the business profile (upsert on id=1).
    Auto-calculates NIT check digit using DIAN Module-11 algorithm.
    """
    check_digit = calculate_check_digit(data.nit)

    result = await db.execute(select(CompanySettings).where(CompanySettings.id == 1))
    settings_row = result.scalar_one_or_none()

    if settings_row is None:
        settings_row = CompanySettings(
            id=1,
            nit=data.nit,
            check_digit=check_digit,
            razon_social=data.razon_social,
            fiscal_regime=FiscalRegime(data.fiscal_regime),
            address=data.address,
            city=data.city,
            department=data.department,
            email=data.email,
            phone=data.phone,
        )
        db.add(settings_row)
    else:
        settings_row.nit = data.nit
        settings_row.check_digit = check_digit
        settings_row.razon_social = data.razon_social
        settings_row.fiscal_regime = FiscalRegime(data.fiscal_regime)
        settings_row.address = data.address
        settings_row.city = data.city
        settings_row.department = data.department
        settings_row.email = data.email
        settings_row.phone = data.phone

    await db.commit()
    await db.refresh(settings_row)

    return BusinessProfileResponse(
        nit=settings_row.nit,
        check_digit=settings_row.check_digit,
        razon_social=settings_row.razon_social,
        fiscal_regime=settings_row.fiscal_regime.value,
        address=settings_row.address,
        city=settings_row.city,
        department=settings_row.department,
        email=settings_row.email,
        phone=settings_row.phone,
        has_certificate=settings_row.cert_path is not None,
        dian_environment=settings_row.dian_environment.value if settings_row.dian_environment else None,
    )


@router.post("/certificate", response_model=CertificateUploadResponse)
async def upload_certificate(
    file: UploadFile = File(...),
    passphrase: str = Form(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    app_settings: Settings = Depends(get_settings),
):
    """Upload a .p12/.pfx digital certificate file.
    Validates the PKCS12 content with the provided passphrase (per D-03: no DIAN validation).
    Stores the file to the cert volume and encrypts the passphrase with Fernet.
    """
    content = await file.read()

    # Validate PKCS12 parse with passphrase
    try:
        validate_pkcs12(content, passphrase)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Certificado invalido o contrasena incorrecta",
        )

    # Save file to disk
    cert_path = await save_certificate_file(content, app_settings.cert_storage_path)

    # Encrypt passphrase
    encrypted_passphrase = encrypt_passphrase(passphrase, app_settings.fernet_key)

    # Update database
    result = await db.execute(select(CompanySettings).where(CompanySettings.id == 1))
    settings_row = result.scalar_one_or_none()
    if settings_row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configura primero el perfil de la empresa",
        )
    settings_row.cert_path = cert_path
    settings_row.cert_passphrase_encrypted = encrypted_passphrase
    await db.commit()

    return CertificateUploadResponse(
        status="ok",
        cert_filename=file.filename or "certificate.p12",
    )


@router.put("/environment")
async def update_environment(
    data: EnvironmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update the DIAN environment selection (habilitacion/produccion).
    No default value — user must explicitly choose (per D-02, Pitfall 7).
    """
    result = await db.execute(select(CompanySettings).where(CompanySettings.id == 1))
    settings_row = result.scalar_one_or_none()
    if settings_row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Configura primero el perfil de la empresa",
        )
    settings_row.dian_environment = DIANEnvironment(data.dian_environment)
    await db.commit()
    return {"status": "ok", "dian_environment": data.dian_environment}
