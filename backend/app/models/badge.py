import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Badge(Base):
    __tablename__ = "badges"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    employee_id: Mapped[str] = mapped_column(String(36), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False)
    file_pdf_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    preview_png_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    employee: Mapped["Employee"] = relationship("Employee", back_populates="badges")
