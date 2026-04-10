"""Invoice and InvoiceLine ORM models for facturas electronicas DIAN."""
import datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    number: Mapped[str | None] = mapped_column(String(20), nullable=True, unique=True)
    invoice_type: Mapped[str] = mapped_column(String(5), nullable=False, default="01")
    client_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    client_name: Mapped[str] = mapped_column(String(255), nullable=False)
    client_document_type: Mapped[str] = mapped_column(String(5), nullable=False, default="31")
    client_document: Mapped[str] = mapped_column(String(20), nullable=False)
    client_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issue_date: Mapped[datetime.date] = mapped_column(Date, nullable=False, default=datetime.date.today)
    due_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(5), nullable=False, default="10")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    subtotal: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    discount_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    tax_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    total: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0"))
    cufe: Mapped[str | None] = mapped_column(String(96), nullable=True)
    dian_status: Mapped[str] = mapped_column(String(20), nullable=False, default="draft")
    dian_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    xml_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    resolution_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


class InvoiceLine(Base):
    __tablename__ = "invoice_lines"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    invoice_id: Mapped[int] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False, default=Decimal("1"))
    unit_measure: Mapped[str] = mapped_column(String(10), nullable=False, default="94")
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    discount_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("0"))
    tax_code: Mapped[str] = mapped_column(String(5), nullable=False, default="01")
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False, default=Decimal("19"))
    line_total: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
