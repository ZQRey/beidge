import math
from jinja2 import Environment, FileSystemLoader
from app.core.config import settings

jinja_env = Environment(
    loader=FileSystemLoader(str(settings.TEMPLATES_DIR)),
    autoescape=True
)

DEFAULT_SAFETY_CODES = {
    "white_phones": "8 (701) 961 77 26, 8 (707) 755 12 41, 8 (707) 755 12 38",
    "white_extra": "ОХРАННАЯ СЛУЖБА ВН. СВЯЗЬ - РАЦИЯ",
    "red_phone": "8 (702) 584 99 94",
    "red_extra": "ТУШИТЬ - ЭВАКУИРОВАТЬ",
    "blue_phone": "8 (7212) 98-24-49",
    "blue_extra": "ОЦЕНИТЬ СОСТОЯНИЕ, АКТИВИРОВАТЬ «КОД СИНИЙ», КНОПКИ ВЫЗОВА РЕАНИМАЦИИ",
    "yellow_phone": "8 (702) 142 16 51",
    "yellow_extra": "ОЦЕНИТЬ СИТУАЦИЮ, В СЛУЧАЕ НЕОБХОДИМОСТИ АКТИВИРОВАТЬ «КОД ЖЕЛТЫЙ»",
    "black_phone": "8 (702) 769 44 90",
    "black_extra": "СООБЩИТЬ СТАРШЕМУ МЕНЕДЖЕРУ БЕЗОПАСНОСТИ (ДИСПЕТЧЕРУ)"
}

DEFAULT_LAYOUT_CONFIG = {
    "name_offset_x": 0.0,
    "name_offset_y": 0.0,
    "name_font_size": 13.0,
    "name_line_height": 4.8,
    "name_align": "center",
    "pos_offset_x": 0.0,
    "pos_offset_y": 0.0,
    "pos_font_size": 10.5,
    "pos_line_height": 4.0,
    "pos_align": "center",
    "dept_offset_x": 0.0,
    "dept_offset_y": 0.0,
    "dept_font_size": 7.2,
    "show_department": True,
    "show_divider": False
}

def prepare_employee_render_data(
    full_name: str,
    position: str,
    department_name: str | None = None,
    layout_config: dict | None = None,
    safety_codes: dict | None = None,
    background_image: str | None = None
) -> dict:
    """
    Cleans and computes optimal auto-scaling typography and line splits
    for names and positions (including Kazakh Cyrillic glyphs), applying custom
    layout offsets and safety codes.
    """
    cleaned_name = " ".join(full_name.strip().split())
    parts = cleaned_name.split()

    # Determine line splits for name (Surname / Name / Patronymic)
    if len(parts) >= 3:
        name_lines = [parts[0], parts[1], " ".join(parts[2:])]
    elif len(parts) == 2:
        name_lines = [parts[0], parts[1]]
    else:
        name_lines = [cleaned_name]

    # Clean and split position into lines
    pos_clean = position.strip().lower()
    pos_parts = pos_clean.split()
    if len(pos_parts) >= 2 and len(pos_clean) > 14:
        if len(pos_parts[0]) <= 7:
            pos_lines = [pos_parts[0], " ".join(pos_parts[1:])]
        else:
            mid = math.ceil(len(pos_parts) / 2)
            pos_lines = [" ".join(pos_parts[:mid]), " ".join(pos_parts[mid:])]
    else:
        pos_lines = [pos_clean]

    # Merge layout config
    merged_layout = dict(DEFAULT_LAYOUT_CONFIG)
    if layout_config:
        merged_layout.update({k: v for k, v in layout_config.items() if v is not None})

    # Merge safety codes
    merged_codes = dict(DEFAULT_SAFETY_CODES)
    if safety_codes:
        merged_codes.update({k: v for k, v in safety_codes.items() if v is not None})

    name_font_size = f"{merged_layout['name_font_size']}pt"
    pos_font_size = f"{merged_layout['pos_font_size']}pt"
    dept_font_size = f"{merged_layout['dept_font_size']}pt"

    return {
        "full_name": cleaned_name,
        "name_lines": name_lines,
        "name_font_size": name_font_size,
        "position": pos_clean,
        "pos_lines": pos_lines,
        "pos_font_size": pos_font_size,
        "dept_font_size": dept_font_size,
        "department_name": department_name.strip() if department_name else None,
        "layout_config": merged_layout,
        "safety_codes": merged_codes,
        "background_image": background_image
    }

def render_html_template(template_name: str, context: dict) -> str:
    template = jinja_env.get_template(template_name)
    return template.render(**context)
