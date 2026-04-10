"""CompanySettings ORM model — single-row table enforced by CHECK(id = 1)."""
import enum

from sqlalchemy import CheckConstraint, Enum, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DIANEnvironment(str, enum.Enum):
    habilitacion = "habilitacion"
    produccion = "produccion"


class FiscalRegime(str, enum.Enum):
    simplificado = "simplificado"
    comun = "comun"


class CompanySettings(Base):
    __tablename__ = "company_settings"
    __table_args__ = (
        CheckConstraint("id = 1", name="single_row"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    nit: Mapped[str] = mapped_column(String(20), nullable=False)
    check_digit: Mapped[str] = mapped_column(String(1), nullable=False)
    razon_social: Mapped[str] = mapped_column(String(255), nullable=False)
    fiscal_regime: Mapped[FiscalRegime] = mapped_column(
        Enum(FiscalRegime, name="fiscal_regime_enum"), nullable=False
    )
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    cert_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cert_passphrase_encrypted: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    dian_environment: Mapped[DIANEnvironment | None] = mapped_column(
        Enum(DIANEnvironment, name="dian_environment_enum"), nullable=True
    )
    profile_execution_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    software_pin: Mapped[str | None] = mapped_column(String(10), nullable=True)
    dian_wsdl_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
