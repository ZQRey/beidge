from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.department import Department
from app.schemas.department import DepartmentCreate, DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])

@router.get("", response_model=list[DepartmentOut])
async def list_departments(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).order_by(Department.name))
    return result.scalars().all()

@router.post("", response_model=DepartmentOut)
async def create_department(dept_in: DepartmentCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Department).where(Department.name == dept_in.name.strip()))
    existing = result.scalar_one_or_none()
    if existing:
        return existing
    
    dept = Department(name=dept_in.name.strip())
    db.add(dept)
    await db.commit()
    await db.refresh(dept)
    return dept
