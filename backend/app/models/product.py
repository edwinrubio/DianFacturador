"""Product ORM model — catalog of products and services for invoicing."""
from sqlalchemy import Boolean, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    unit_measure: Mapped[str] = mapped_column(String(10), nullable=False, default="94")
    unit_price: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False)
    tax_code: Mapped[str] = mapped_column(String(5), nullable=False, default="01")
    tax_rate: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False, default=19.00)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
