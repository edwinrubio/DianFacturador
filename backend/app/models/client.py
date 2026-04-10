"""Client ORM model — stores customer fiscal data for Colombian electronic invoicing."""
from sqlalchemy import Boolean, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Client(Base):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    # Colombian document types: CC=13, NIT=31, CE=22, Pasaporte=41, PPT=48, DIE=50
    document_type: Mapped[str] = mapped_column(String(5), nullable=False)
    document_number: Mapped[str] = mapped_column(String(20), nullable=False)
    check_digit: Mapped[str | None] = mapped_column(String(1), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    trade_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fiscal_regime: Mapped[str] = mapped_column(String(20), default="R-99-PN", nullable=False)
    fiscal_responsibilities: Mapped[str] = mapped_column(String(100), default="R-99-PN", nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
