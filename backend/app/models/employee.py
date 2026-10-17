import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    full_name: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    position: Mapped[str] = mapped_column(String(255), nullable=False)
    department_id: Mapped[str] = mapped_column(String(36), ForeignKey("departments.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), onupdate=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)

    department: Mapped["Department | None"] = relationship("Department", back_populates="employees")
    badges: Mapped[list["Badge"]] = relationship("Badge", back_populates="employee", cascade="all, delete-orphan")
