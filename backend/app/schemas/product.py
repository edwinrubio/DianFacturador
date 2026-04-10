"""Pydantic schemas for product/service catalog management."""
from decimal import Decimal

from pydantic import BaseModel


class ProductCreate(BaseModel):
    code: str | None = None
    description: str
    unit_measure: str = "94"
    unit_price: Decimal
    tax_code: str = "01"
    tax_rate: Decimal = Decimal("19.00")


class ProductUpdate(BaseModel):
    code: str | None = None
    description: str | None = None
    unit_measure: str | None = None
    unit_price: Decimal | None = None
    tax_code: str | None = None
    tax_rate: Decimal | None = None
    is_active: bool | None = None


class ProductResponse(BaseModel):
    id: int
    code: str | None
    description: str
    unit_measure: str
    unit_price: Decimal
    tax_code: str
    tax_rate: Decimal
    is_active: bool

    model_config = {"from_attributes": True}
