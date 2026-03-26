"""NumberingResolution ORM model — DIAN-authorized invoice numbering ranges."""
import datetime

from sqlalchemy import Boolean, Date, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class NumberingResolution(Base):
    __tablename__ = "numbering_resolutions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    prefix: Mapped[str] = mapped_column(String(10), nullable=False)
    from_number: Mapped[int] = mapped_column(Integer, nullable=False)
    to_number: Mapped[int] = mapped_column(Integer, nullable=False)
    current_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    technical_key: Mapped[str] = mapped_column(String(255), nullable=False)
    valid_from: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    valid_to: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    resolution_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
