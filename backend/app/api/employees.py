import io
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
import pandas as pd
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.department import Department
from app.models.employee import Employee
from app.models.badge import Badge
from app.schemas.employee import EmployeeCreate, EmployeeUpdate, EmployeeOut, EmployeeListResponse
from app.schemas.badge import BatchImportResult
from app.services.pdf_renderer import generate_badge_pdf
from app.core.config import settings

router = APIRouter(prefix="/employees", tags=["employees"])

@router.get("", response_model=EmployeeListResponse)
async def list_employees(
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(Employee).options(
        selectinload(Employee.department),
        selectinload(Employee.badges)
    )

    if search:
        search_filter = f"%{search.strip()}%"
        query = query.where(
            or_(
                Employee.full_name.ilike(search_filter),
                Employee.position.ilike(search_filter)
            )
        )

    if department_id:
        query = query.where(Employee.department_id == department_id)

    # Count total
    count_query = select(func.count(Employee.id))
    if search:
        search_filter = f"%{search.strip()}%"
        count_query = count_query.where(
            or_(
                Employee.full_name.ilike(search_filter),
                Employee.position.ilike(search_filter)
            )
        )
    if department_id:
        count_query = count_query.where(Employee.department_id == department_id)

    total_res = await db.execute(count_query)
    total = total_res.scalar() or 0

    # Paginate
    query = query.order_by(Employee.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(query)
    employees = res.scalars().all()

    return {
        "items": employees,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.post("", response_model=EmployeeOut)
async def create_employee(emp_in: EmployeeCreate, db: AsyncSession = Depends(get_db)):
    dept_id = emp_in.department_id

    # If department_name is given, find or create
    if emp_in.department_name and not dept_id:
        dept_name_clean = emp_in.department_name.strip()
        d_res = await db.execute(select(Department).where(Department.name == dept_name_clean))
        dept = d_res.scalar_one_or_none()
        if not dept:
            dept = Department(name=dept_name_clean)
            db.add(dept)
            await db.flush()
        dept_id = dept.id

    employee = Employee(
        full_name=emp_in.full_name.strip(),
        position=emp_in.position.strip(),
        department_id=dept_id
    )
    db.add(employee)
    await db.commit()
    await db.refresh(employee)

    # Load relationship
    q = select(Employee).options(selectinload(Employee.department)).where(Employee.id == employee.id)
    refreshed = (await db.execute(q)).scalar_one()
    return refreshed

@router.put("/{employee_id}", response_model=EmployeeOut)
async def update_employee(employee_id: str, emp_in: EmployeeUpdate, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = res.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    if emp_in.full_name is not None:
        employee.full_name = emp_in.full_name.strip()
    if emp_in.position is not None:
        employee.position = emp_in.position.strip()

    if emp_in.department_name is not None:
        dept_name_clean = emp_in.department_name.strip()
        d_res = await db.execute(select(Department).where(Department.name == dept_name_clean))
        dept = d_res.scalar_one_or_none()
        if not dept:
            dept = Department(name=dept_name_clean)
            db.add(dept)
            await db.flush()
        employee.department_id = dept.id
    elif emp_in.department_id is not None:
        employee.department_id = emp_in.department_id

    await db.commit()
    await db.refresh(employee)

    q = select(Employee).options(selectinload(Employee.department)).where(Employee.id == employee.id)
    return (await db.execute(q)).scalar_one()

@router.delete("/{employee_id}")
async def delete_employee(employee_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Employee).where(Employee.id == employee_id))
    employee = res.scalar_one_or_none()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    await db.delete(employee)
    await db.commit()
    return {"status": "success", "message": "Employee and associated badges deleted"}

@router.get("/export-template")
async def download_csv_template():
    """Generates a downloadable CSV template with Kazakh and Russian examples."""
    csv_content = (
        "ФИО;Должность;Отделение\n"
        "Тоқтыбаева Аида Салходдиновна;врач акушер-гинеколог;Акушерское отделение\n"
        "Гоцадзе Маргарита Викторовна;врач акушер-гинеколог;Гинекологическое отделение\n"
        "Қасымов Нұрлан Бауыржанұлы;заведующий отделением;Хирургическое отделение\n"
        "Иванова Елена Сергеевна;старшая медицинская сестра;Терапевтическое отделение\n"
    )
    # Encode with UTF-8 BOM so Excel opens it with Cyrillic characters correctly
    return StreamingResponse(
        io.BytesIO(csv_content.encode("utf-8-sig")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=employees_template.csv"}
    )

@router.post("/import-csv", response_model=BatchImportResult)
async def import_employees_csv(file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """Imports employees and generates badges from CSV or Excel file."""
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""

    try:
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(content))
        else:
            # Try reading csv with autodetection of separator
            try:
                df = pd.read_csv(io.BytesIO(content), sep=None, engine="python", encoding="utf-8-sig")
            except Exception:
                try:
                    df = pd.read_csv(io.BytesIO(content), sep=";", encoding="utf-8")
                except Exception:
                    df = pd.read_csv(io.BytesIO(content), sep=",", encoding="cp1251")

        # Normalize column names
        col_map = {}
        for c in df.columns:
            cl = str(c).strip().lower()
            if "фио" in cl or "full_name" in cl or "имя" in cl or "аты" in cl:
                col_map[c] = "full_name"
            elif "должность" in cl or "position" in cl or "қызметі" in cl:
                col_map[c] = "position"
            elif "отделение" in cl or "department" in cl or "бөлімі" in cl:
                col_map[c] = "department"

        df = df.rename(columns=col_map)
        if "full_name" not in df.columns or "position" not in df.columns:
            raise HTTPException(
                status_code=400,
                detail="Файл должен содержать колонки 'ФИО' (full_name) и 'Должность' (position)."
            )

        imported = 0
        errors = []

        # Cache existing departments
        dep_res = await db.execute(select(Department))
        dept_cache = {d.name.lower(): d for d in dep_res.scalars().all()}

        for index, row in df.iterrows():
            name = str(row.get("full_name", "")).strip()
            pos = str(row.get("position", "")).strip()
            dept_name = str(row.get("department", "")).strip() if pd.notna(row.get("department")) else None

            if not name or name == "nan" or not pos or pos == "nan":
                continue

            try:
                # Find or create department
                dept_id = None
                if dept_name and dept_name != "nan":
                    dept_key = dept_name.lower()
                    if dept_key in dept_cache:
                        dept_id = dept_cache[dept_key].id
                    else:
                        new_dept = Department(name=dept_name)
                        db.add(new_dept)
                        await db.flush()
                        dept_cache[dept_key] = new_dept
                        dept_id = new_dept.id

                # Create employee
                emp = Employee(
                    full_name=name,
                    position=pos,
                    department_id=dept_id
                )
                db.add(emp)
                await db.flush()

                # Generate badge for employee
                badge_id = str(uuid.uuid4())
                pdf_filename = f"badge_{badge_id}.pdf"
                pdf_path = settings.STORAGE_DIR / "pdfs" / pdf_filename

                generate_badge_pdf(
                    {
                        "full_name": name,
                        "position": pos,
                        "department_name": dept_name
                    },
                    str(pdf_path),
                    mode="folded"
                )

                badge = Badge(
                    id=badge_id,
                    employee_id=emp.id,
                    file_pdf_path=str(pdf_path),
                    status="active"
                )
                db.add(badge)
                imported += 1

            except Exception as row_err:
                errors.append(f"Строка {index + 2}: {str(row_err)}")

        await db.commit()

        return BatchImportResult(
            total_processed=len(df),
            imported_count=imported,
            error_count=len(errors),
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка обработки файла: {str(e)}")
