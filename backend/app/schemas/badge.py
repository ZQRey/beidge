from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict
from app.schemas.employee import EmployeeOut

class LayoutConfig(BaseModel):
    # Offsets in millimeters relative to default center (cx=64.2mm, y=divider)
    name_offset_x: float = 0.0
    name_offset_y: float = 0.0
    name_font_size: float = 13.0
    name_line_height: float = 4.8
    name_align: Literal["center", "left", "right"] = "center"

    pos_offset_x: float = 0.0
    pos_offset_y: float = 0.0
    pos_font_size: float = 10.5
    pos_line_height: float = 4.0
    pos_align: Literal["center", "left", "right"] = "center"

    dept_offset_x: float = 0.0
    dept_offset_y: float = 0.0
    dept_font_size: float = 7.2
    show_department: bool = True
    show_divider: bool = False  # False by default because default_badge_bg.png already has the line

class SafetyCodesConfig(BaseModel):
    # White code
    white_phones: str = "8 (701) 961 77 26, 8 (707) 755 12 41, 8 (707) 755 12 38"
    white_extra: str = "ОХРАННАЯ СЛУЖБА ВН. СВЯЗЬ - РАЦИЯ"

    # Red code
    red_phone: str = "8 (702) 584 99 94"
    red_extra: str = "ТУШИТЬ - ЭВАКУИРОВАТЬ"

    # Blue code
    blue_phone: str = "8 (7212) 98-24-49"
    blue_extra: str = "ОЦЕНИТЬ СОСТОЯНИЕ ПОСТРАДАВШЕГО; В СЛУЧАЕ НЕОБХОДИМОСТИ АКТИВИРОВАТЬ «КОД СИНИЙ» В ЗДАНИИ БОЛЬНИЦЫ, КНОПКИ ВЫЗОВА РЕАНИМАЦИИ ВО ВСЕХ ПОДРАЗДЕЛЕНИЯХ СТАЦИОНАРА"

    # Yellow code
    yellow_phone: str = "8 (702) 142 16 51"
    yellow_extra: str = "ОЦЕНИТЬ СИТУАЦИЮ, В СЛУЧАЕ НЕОБХОДИМОСТИ АКТИВИРОВАТЬ «КОД ЖЕЛТЫЙ»"

    # Black code
    black_phone: str = "8 (702) 769 44 90"
    black_extra: str = "СООБЩИТЬ СТАРШЕМУ МЕНЕДЖЕРУ БЕЗОПАСНОСТИ (ДИСПЕТЧЕРУ)"

class BadgeBase(BaseModel):
    employee_id: str
    status: str = "active"

class BadgeCreateRequest(BaseModel):
    full_name: str
    position: str
    department_name: str | None = None
    employee_id: str | None = None
    background_image: str | None = None
    layout_config: LayoutConfig | None = None
    safety_codes: SafetyCodesConfig | None = None

class BadgeOut(BadgeBase):
    id: str
    file_pdf_path: str | None = None
    preview_png_path: str | None = None
    created_at: datetime
    employee: EmployeeOut | None = None

    model_config = ConfigDict(from_attributes=True)

class BadgeListResponse(BaseModel):
    items: list[BadgeOut]
    total: int
    page: int
    limit: int
    total_pages: int

class BadgePreviewRequest(BaseModel):
    full_name: str = "Токтыбаева Аида Салходдиновна"
    position: str = "врач акушер-гинеколог"
    department_name: str | None = "Акушерское отделение"
    side: Literal["front", "back", "folded"] = "front"
    background_image: str | None = None
    layout_config: LayoutConfig | None = None
    safety_codes: SafetyCodesConfig | None = None

class BadgePreviewResponse(BaseModel):
    side: str
    html: str
    preview_base64: str | None = None

class BatchPrintRequest(BaseModel):
    badge_ids: list[str]
    layout: Literal["folded", "cards"] = "folded"
    include_crop_marks: bool = True
    background_image: str | None = None
    layout_config: LayoutConfig | None = None
    safety_codes: SafetyCodesConfig | None = None

class BatchImportResult(BaseModel):
    total_processed: int
    imported_count: int
    error_count: int
    errors: list[str] = []

class SubmitToGlpiResponse(BaseModel):
    success: bool
    ticket_id: int | None = None
    ticket_url: str | None = None
    requester: str | None = None
    machine: str | None = None
    room: str | None = None
    message: str
    error: str | None = None

class BatchBadgeItem(BaseModel):
    full_name: str
    position: str
    department_name: str | None = None

class BatchBadgeCreateRequest(BaseModel):
    items: list[BatchBadgeItem]
    background_image: str | None = None
    layout_config: LayoutConfig | None = None
    safety_codes: SafetyCodesConfig | None = None

class BatchBadgeCreateResponse(BaseModel):
    batch_id: str
    badge_ids: list[str]
    download_url: str
    count: int
    badges: list[BadgeOut] = []

class BatchSubmitToGlpiResponse(BaseModel):
    success: bool
    ticket_id: int | None = None
    ticket_url: str | None = None
    requester: str | None = None
    machine: str | None = None
    room: str | None = None
    count: int = 0
    message: str
    error: str | None = None
