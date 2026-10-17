from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.schemas.department import DepartmentOut

class EmployeeBase(BaseModel):
    full_name: str
    position: str
    department_id: str | None = None

class EmployeeCreate(EmployeeBase):
    department_name: str | None = None  # Allow creating/finding department by name

class EmployeeUpdate(BaseModel):
    full_name: str | None = None
    position: str | None = None
    department_id: str | None = None
    department_name: str | None = None

class EmployeeOut(EmployeeBase):
    id: str
    created_at: datetime
    updated_at: datetime
    department: DepartmentOut | None = None
    
    model_config = ConfigDict(from_attributes=True)

class EmployeeListResponse(BaseModel):
    items: list[EmployeeOut]
    total: int
    page: int
    limit: int
    total_pages: int
