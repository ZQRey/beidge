import uuid
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Department(Base):
    __tablename__ = "departments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    employees: Mapped[list["Employee"]] = relationship("Employee", back_populates="department", cascade="all, delete-orphan")
