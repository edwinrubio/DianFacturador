"""Pydantic schemas for company business profile (CompanySettings)."""
from pydantic import BaseModel, EmailStr, field_validator


class BusinessProfileCreate(BaseModel):
    nit: str
    razon_social: str
    fiscal_regime: str
    address: str
    city: str
    department: str
    email: str
    phone: str | None = None

    @field_validator("fiscal_regime")
    @classmethod
    def validate_fiscal_regime(cls, v: str) -> str:
        if v not in ("simplificado", "comun"):
            raise ValueError("fiscal_regime must be 'simplificado' or 'comun'")
        return v

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        if "@" not in v or "." not in v.split("@")[-1]:
            raise ValueError("Invalid email address")
        return v.lower()


class BusinessProfileResponse(BaseModel):
    nit: str
    check_digit: str
    razon_social: str
    fiscal_regime: str
    address: str
    city: str
    department: str
    email: str
    phone: str | None
    has_certificate: bool
    dian_environment: str | None

    model_config = {"from_attributes": True}


class CertificateUploadResponse(BaseModel):
    status: str
    cert_filename: str


class EnvironmentUpdate(BaseModel):
    dian_environment: str

    @field_validator("dian_environment")
    @classmethod
    def validate_environment(cls, v: str) -> str:
        if v not in ("habilitacion", "produccion"):
            raise ValueError("dian_environment must be 'habilitacion' or 'produccion'")
        return v
