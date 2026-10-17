import os
import shutil
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Request
from fastapi.responses import FileResponse
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.badge import Badge
from app.models.department import Department
from app.models.employee import Employee
from app.schemas.badge import (
    BadgeCreateRequest,
    BadgeOut,
    BadgeListResponse,
    BadgePreviewRequest,
    BadgePreviewResponse,
    BatchPrintRequest,
    SubmitToGlpiResponse,
    BatchBadgeItem,
    BatchBadgeCreateRequest,
    BatchBadgeCreateResponse,
    BatchSubmitToGlpiResponse
)
from app.services.generator import prepare_employee_render_data, render_html_template
from app.services.pdf_renderer import generate_badge_pdf, generate_sheet_a4_pdf
from app.services.user_resolver import extract_client_ip, resolve_client_info
from app.services.sso_service import resolve_current_user_context
from app.services.glpi_client import glpi_client

router = APIRouter(prefix="/badges", tags=["badges"])

@router.post("/upload-background")
async def upload_background(
    request: Request,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Uploads a custom background image for badges (Admins only)."""
    user_context = await resolve_current_user_context(request, db)
    if not user_context.get("can_edit_design"):
        raise HTTPException(
            status_code=403,
            detail="Изменение фона бейджа доступно только Администраторам домена или локальному администратору."
        )

    bg_dir = settings.STORAGE_DIR / "backgrounds"
    bg_dir.mkdir(parents=True, exist_ok=True)

    ext = Path(file.filename or "").suffix.lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
        ext = ".png"

    filename = f"bg_{uuid.uuid4()}{ext}"
    file_path = bg_dir / filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return {
        "url": f"/storage/backgrounds/{filename}",
        "filename": filename,
        "path": str(file_path)
    }

@router.post("/preview", response_model=BadgePreviewResponse)
async def preview_badge(req: BadgePreviewRequest):
    """
    Renders HTML preview for the interactive constructor
    (front side, back side, or folded 180x60mm view) with custom background,
    typography layout offsets and custom safety codes.
    """
    render_data = prepare_employee_render_data(
        full_name=req.full_name,
        position=req.position,
        department_name=req.department_name,
        layout_config=req.layout_config.model_dump() if req.layout_config else None,
        safety_codes=req.safety_codes.model_dump() if req.safety_codes else None,
        background_image=req.background_image
    )

    if req.side == "front":
        html = render_html_template("badge_face.html", render_data)
    elif req.side == "back":
        html = render_html_template("badge_back.html", render_data)
    else:
        html = render_html_template("badge_folded.html", render_data)

    return BadgePreviewResponse(
        side=req.side,
        html=html
    )

@router.get("", response_model=BadgeListResponse)
async def list_badges(
    search: Optional[str] = None,
    department_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    query = select(Badge).join(Badge.employee).options(
        selectinload(Badge.employee).selectinload(Employee.department)
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

    # Count
    count_query = select(func.count(Badge.id)).join(Badge.employee)
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

    query = query.order_by(Badge.created_at.desc()).offset((page - 1) * limit).limit(limit)
    res = await db.execute(query)
    badges = res.scalars().all()

    return {
        "items": badges,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.post("/create", response_model=BadgeOut)
async def create_badge(
    req: BadgeCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Creates an employee (if needed), saves to DB, and renders the PDF badge with custom layout & background."""
    user_context = await resolve_current_user_context(request, db)
    can_edit = user_context.get("can_edit_design", False)

    bg_img = req.background_image if can_edit else "/default_badge_bg.png"
    layout_cfg = req.layout_config.model_dump() if (can_edit and req.layout_config) else None
    safety_cfg = req.safety_codes.model_dump() if (can_edit and req.safety_codes) else None

    dept_id = None
    if req.department_name:
        dept_name_clean = req.department_name.strip()
        d_res = await db.execute(select(Department).where(Department.name == dept_name_clean))
        dept = d_res.scalar_one_or_none()
        if not dept:
            dept = Department(name=dept_name_clean)
            db.add(dept)
            await db.flush()
        dept_id = dept.id

    employee_id = req.employee_id
    if not employee_id:
        clean_name = req.full_name.strip()
        clean_pos = req.position.strip()
        e_stmt = select(Employee).where(
            func.lower(Employee.full_name) == clean_name.lower(),
            func.lower(Employee.position) == clean_pos.lower()
        )
        existing_emp = (await db.execute(e_stmt)).scalars().first()
        if existing_emp:
            employee = existing_emp
            if dept_id and employee.department_id != dept_id:
                employee.department_id = dept_id
            employee_id = employee.id
        else:
            employee = Employee(
                full_name=clean_name,
                position=clean_pos,
                department_id=dept_id
            )
            db.add(employee)
            await db.flush()
            employee_id = employee.id
    else:
        e_res = await db.execute(select(Employee).where(Employee.id == employee_id))
        employee = e_res.scalar_one_or_none()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee not found")

    badge_id = str(uuid.uuid4())
    pdf_filename = f"badge_{badge_id}.pdf"
    pdf_path = settings.STORAGE_DIR / "pdfs" / pdf_filename

    generate_badge_pdf(
        {
            "full_name": req.full_name.strip(),
            "position": req.position.strip(),
            "department_name": req.department_name,
            "background_image": bg_img,
            "layout_config": layout_cfg,
            "safety_codes": safety_cfg
        },
        str(pdf_path),
        mode="folded"
    )

    badge = Badge(
        id=badge_id,
        employee_id=employee_id,
        file_pdf_path=str(pdf_path),
        status="active"
    )
    db.add(badge)
    await db.commit()

    q = select(Badge).options(
        selectinload(Badge.employee).selectinload(Employee.department)
    ).where(Badge.id == badge.id)
    return (await db.execute(q)).scalar_one()

def to_safe_ascii_name(text: str) -> str:
    mapping = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'shch',
        'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        'ә': 'a', 'і': 'i', 'ң': 'n', 'ғ': 'g', 'ү': 'u', 'ұ': 'u', 'қ': 'k',
        'ө': 'o', 'һ': 'h',
    }
    res = []
    for c in text:
        low = c.lower()
        if low in mapping:
            trans = mapping[low]
            res.append(trans.upper() if c.isupper() else trans)
        elif c.isalnum() or c in ('-', '_'):
            res.append(c)
        elif c == ' ':
            res.append('_')
    clean = "".join(res).strip('_')
    return clean or "badge"

@router.get("/{badge_id}/download")
async def download_badge(
    badge_id: str,
    mode: str = Query("folded", pattern="^(folded|front|back)$"),
    db: AsyncSession = Depends(get_db)
):
    """Downloads individual badge PDF (folded 180x60mm, front 90x60mm, or back 90x60mm)."""
    res = await db.execute(
        select(Badge).options(
            selectinload(Badge.employee).selectinload(Employee.department)
        ).where(Badge.id == badge_id)
    )
    badge = res.scalar_one_or_none()
    if not badge:
        raise HTTPException(status_code=404, detail="Бейдж не найден")

    safe_name = to_safe_ascii_name(badge.employee.full_name)
    download_filename = f"badge_{safe_name}_{mode}.pdf"

    if mode == "folded" and badge.file_pdf_path and os.path.exists(badge.file_pdf_path):
        return FileResponse(
            badge.file_pdf_path,
            media_type="application/pdf",
            filename=download_filename,
            headers={
                "Content-Disposition": f'attachment; filename="{download_filename}"'
            }
        )

    # Dynamic render for front/back or if folded file was missing
    dept_name = badge.employee.department.name if badge.employee.department else None
    tmp_path = settings.STORAGE_DIR / "pdfs" / f"badge_{badge_id}_{mode}.pdf"
    generate_badge_pdf(
        {
            "full_name": badge.employee.full_name,
            "position": badge.employee.position,
            "department_name": dept_name
        },
        str(tmp_path),
        mode=mode
    )

    return FileResponse(
        str(tmp_path),
        media_type="application/pdf",
        filename=download_filename,
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"'
        }
    )

@router.post("/print-sheet")
async def print_sheet(req: BatchPrintRequest, db: AsyncSession = Depends(get_db)):
    """
    Accepts badge IDs, arranges them into an A4 sheet (2x3 or 4 folded pairs per sheet)
    with crop marks, and returns the merged printable PDF.
    """
    if not req.badge_ids:
        raise HTTPException(status_code=400, detail="Не выбрано ни одного бейджа для печати")

    res = await db.execute(
        select(Badge).options(
            selectinload(Badge.employee).selectinload(Employee.department)
        ).where(Badge.id.in_(req.badge_ids))
    )
    badges = res.scalars().all()
    if not badges:
        raise HTTPException(status_code=404, detail="Бейджи не найдены")

    badges_data = []
    for b in badges:
        dept_name = b.employee.department.name if b.employee.department else None
        badges_data.append({
            "id": b.id,
            "full_name": b.employee.full_name,
            "position": b.employee.position,
            "department_name": dept_name,
            "background_image": req.background_image,
            "layout_config": req.layout_config.model_dump() if req.layout_config else None,
            "safety_codes": req.safety_codes.model_dump() if req.safety_codes else None
        })

    sheet_filename = f"sheet_{uuid.uuid4()}.pdf"
    sheet_path = settings.STORAGE_DIR / "pdfs" / sheet_filename

    generate_sheet_a4_pdf(
        badges_data,
        str(sheet_path),
        include_crop_marks=req.include_crop_marks
    )

    return FileResponse(
        str(sheet_path),
        media_type="application/pdf",
        filename="hospital_badges_sheet_A4.pdf"
    )

@router.delete("/{badge_id}")
async def delete_badge(badge_id: str, db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Badge).where(Badge.id == badge_id))
    badge = res.scalar_one_or_none()
    if not badge:
        raise HTTPException(status_code=404, detail="Badge not found")

    if badge.file_pdf_path and os.path.exists(badge.file_pdf_path):
        try:
            os.remove(badge.file_pdf_path)
        except OSError:
            pass

    await db.delete(badge)
    await db.commit()
    return {"status": "success", "message": "Бейдж успешно удален"}

@router.post("/submit-to-glpi", response_model=SubmitToGlpiResponse)
async def submit_to_glpi(
    req: BadgeCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates/finds employee, generates PDF badge, resolves domain user via Helper by IP,
    and submits a ticket to GLPI with the PDF attached.
    """
    # 1. First ensure badge is created / generated locally
    badge_out = await create_badge(req, request, db)

    # 2. Resolve domain user and workstation via SSO / LDAP / DNS
    client_info = await resolve_current_user_context(request, db)

    # 3. Create ticket in GLPI and attach PDF
    pdf_path = badge_out.file_pdf_path
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=500, detail="Файл PDF не найден для прикрепления к заявке")

    res = await glpi_client.create_badge_ticket(
        full_name=req.full_name,
        position=req.position,
        department_name=req.department_name,
        pdf_path=pdf_path,
        client_info=client_info
    )

    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("error", "Ошибка создания заявки в GLPI"))

    return SubmitToGlpiResponse(
        success=True,
        ticket_id=res.get("ticket_id"),
        ticket_url=res.get("ticket_url"),
        requester=res.get("requester"),
        machine=res.get("machine"),
        room=res.get("room"),
        message=res.get("message", "Заявка успешно создана")
    )

@router.post("/create-batch", response_model=BatchBadgeCreateResponse)
async def create_batch_badges(
    req: BatchBadgeCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Accepts 1 to 20 employees, deduplicates them in DB, creates badges,
    generates a unified printable A4 sheet PDF with all badges, and returns the batch info.
    """
    if not req.items:
        raise HTTPException(status_code=400, detail="Список сотрудников не может быть пустым")

    user_context = await resolve_current_user_context(request, db)
    can_edit = user_context.get("can_edit_design", False)

    bg_img = req.background_image if can_edit else "/default_badge_bg.png"
    layout_cfg = req.layout_config.model_dump() if (can_edit and req.layout_config) else None
    safety_cfg = req.safety_codes.model_dump() if (can_edit and req.safety_codes) else None

    batch_id = str(uuid.uuid4())
    sheet_filename = f"sheet_{batch_id}.pdf"
    sheet_path = settings.STORAGE_DIR / "pdfs" / sheet_filename

    badge_ids = []
    badges_render_data = []

    for item in req.items:
        clean_name = item.full_name.strip()
        clean_pos = item.position.strip()
        if not clean_name or not clean_pos:
            continue

        dept_id = None
        dept_name = None
        if item.department_name:
            dept_name = item.department_name.strip()
            d_res = await db.execute(select(Department).where(Department.name == dept_name))
            dept = d_res.scalar_one_or_none()
            if not dept:
                dept = Department(name=dept_name)
                db.add(dept)
                await db.flush()
            dept_id = dept.id

        # Deduplicate employee
        e_stmt = select(Employee).where(
            func.lower(Employee.full_name) == clean_name.lower(),
            func.lower(Employee.position) == clean_pos.lower()
        )
        existing_emp = (await db.execute(e_stmt)).scalars().first()
        if existing_emp:
            emp = existing_emp
            if dept_id and emp.department_id != dept_id:
                emp.department_id = dept_id
        else:
            emp = Employee(
                full_name=clean_name,
                position=clean_pos,
                department_id=dept_id
            )
            db.add(emp)
            await db.flush()

        # Generate individual badge PDF
        badge_id = str(uuid.uuid4())
        indiv_pdf_path = settings.STORAGE_DIR / "pdfs" / f"badge_{badge_id}.pdf"
        generate_badge_pdf(
            {
                "full_name": clean_name,
                "position": clean_pos,
                "department_name": dept_name,
                "background_image": bg_img,
                "layout_config": layout_cfg,
                "safety_codes": safety_cfg
            },
            str(indiv_pdf_path),
            mode="folded"
        )

        badge = Badge(
            id=badge_id,
            employee_id=emp.id,
            file_pdf_path=str(indiv_pdf_path),
            status="active"
        )
        db.add(badge)
        badge_ids.append(badge_id)

        badges_render_data.append({
            "id": badge_id,
            "full_name": clean_name,
            "position": clean_pos,
            "department_name": dept_name,
            "background_image": bg_img,
            "layout_config": layout_cfg,
            "safety_codes": safety_cfg
        })

    if not badge_ids:
        raise HTTPException(status_code=400, detail="Не указано ни одного корректного сотрудника")

    await db.commit()

    # Generate unified A4 sheet
    generate_sheet_a4_pdf(
        badges_render_data,
        str(sheet_path),
        include_crop_marks=True
    )

    return BatchBadgeCreateResponse(
        batch_id=batch_id,
        badge_ids=badge_ids,
        download_url=f"/api/badges/batch/{batch_id}/download",
        count=len(badge_ids)
    )

@router.get("/batch/{batch_id}/download")
async def download_batch_sheet(batch_id: str):
    """Downloads the unified A4 sheet PDF for a batch of badges."""
    sheet_filename = f"sheet_{batch_id}.pdf"
    sheet_path = settings.STORAGE_DIR / "pdfs" / sheet_filename

    if not sheet_path.exists():
        raise HTTPException(status_code=404, detail="Файл листа бейджей не найден")

    download_name = f"hospital_badges_sheet_{batch_id[:8]}.pdf"
    return FileResponse(
        str(sheet_path),
        media_type="application/pdf",
        filename=download_name,
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"'
        }
    )

@router.post("/submit-batch-to-glpi", response_model=BatchSubmitToGlpiResponse)
async def submit_batch_to_glpi(
    req: BatchBadgeCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Creates badges for the batch, generates the unified A4 PDF sheet,
    resolves user info, and creates a single consolidated GLPI ticket with the PDF attached.
    """
    # 1. Create batch locally and generate sheet PDF
    batch_res = await create_batch_badges(req, request, db)

    # 2. Resolve domain user context
    client_info = await resolve_current_user_context(request, db)

    # 3. Locate generated sheet PDF
    sheet_path = settings.STORAGE_DIR / "pdfs" / f"sheet_{batch_res.batch_id}.pdf"
    if not sheet_path.exists():
        raise HTTPException(status_code=500, detail="Файл листа бейджей не найден для прикрепления к заявке")

    # Determine primary department
    primary_dept = None
    for item in req.items:
        if item.department_name and item.department_name.strip():
            primary_dept = item.department_name.strip()
            break

    items_dicts = [
        {
            "full_name": it.full_name,
            "position": it.position,
            "department_name": it.department_name
        }
        for it in req.items
    ]

    res = await glpi_client.create_batch_badge_ticket(
        items=items_dicts,
        primary_department=primary_dept,
        pdf_path=str(sheet_path),
        client_info=client_info
    )

    if not res.get("success"):
        raise HTTPException(status_code=502, detail=res.get("error", "Ошибка создания групповой заявки в GLPI"))

    return BatchSubmitToGlpiResponse(
        success=True,
        ticket_id=res.get("ticket_id"),
        ticket_url=res.get("ticket_url"),
        requester=res.get("requester"),
        machine=res.get("machine"),
        room=res.get("room"),
        count=res.get("count", len(req.items)),
        message=res.get("message", f"Заявка успешно создана на {len(req.items)} бейджей")
    )

