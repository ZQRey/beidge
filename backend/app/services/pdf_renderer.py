import os
from pathlib import Path
from typing import Any
import math

from app.core.config import settings

# Check if WeasyPrint is fully functional (with GTK/Pango)
HAS_WEASYPRINT = False
try:
    import weasyprint
    from weasyprint import HTML
    HAS_WEASYPRINT = True
except Exception:
    HAS_WEASYPRINT = False

from app.services.generator import prepare_employee_render_data, render_html_template, DEFAULT_SAFETY_CODES

# ReportLab imports for bulletproof vector fallback
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

FONT_BOLD = "Helvetica-Bold"
FONT_REGULAR = "Helvetica"
FONT_MEDIUM = "Helvetica"

# Register Montserrat TTF fonts (Debian server) or DejaVu/Arial (fallback)
for p in [
    "/usr/share/fonts/truetype/montserrat/Montserrat-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf"
]:
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("App-Bold", p))
            FONT_BOLD = "App-Bold"
            break
        except Exception:
            pass

for p in [
    "/usr/share/fonts/truetype/montserrat/Montserrat-Medium.ttf",
    "/usr/share/fonts/truetype/montserrat/Montserrat-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arial.ttf"
]:
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("App-Medium", p))
            FONT_MEDIUM = "App-Medium"
            break
        except Exception:
            pass

for p in [
    "/usr/share/fonts/truetype/montserrat/Montserrat-Regular.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "C:/Windows/Fonts/arial.ttf"
]:
    if os.path.exists(p):
        try:
            pdfmetrics.registerFont(TTFont("App-Regular", p))
            FONT_REGULAR = "App-Regular"
            break
        except Exception:
            pass

COLOR_PRIMARY_GREEN = HexColor("#1e5d36")
COLOR_ACCENT_GREEN = HexColor("#67b83d")
COLOR_LIGHT_GREEN = HexColor("#8bc34a")
COLOR_MED_GREEN = HexColor("#417c4e")
COLOR_TEXT_DARK = HexColor("#0f172a")
COLOR_TEXT_MUTED = HexColor("#475569")
COLOR_BORDER = HexColor("#cbd5e1")

COLOR_RED = HexColor("#e3342f")
COLOR_RED_DARK = HexColor("#cb2d28")
COLOR_BLUE = HexColor("#2563eb")
COLOR_BLUE_DARK = HexColor("#1d4ed8")
COLOR_YELLOW = HexColor("#f59e0b")
COLOR_YELLOW_DARK = HexColor("#d97706")
COLOR_BLACK = HexColor("#1f2937")
COLOR_BLACK_DARK = HexColor("#111827")

def resolve_background_image_path(bg_identifier: str | None) -> Path | None:
    """Finds physical image path from url, relative path, or default background."""
    if bg_identifier:
        # Check storage/backgrounds
        clean_name = bg_identifier.replace("/storage/backgrounds/", "").replace("/storage/", "")
        candidate = settings.STORAGE_DIR / "backgrounds" / clean_name
        if candidate.exists():
            return candidate
        candidate_root = settings.STORAGE_DIR / clean_name
        if candidate_root.exists():
            return candidate_root
        if Path(bg_identifier).exists():
            return Path(bg_identifier)

    # Check default background in static images
    default_bg = settings.STATIC_DIR / "images" / "default_badge_bg.png"
    if default_bg.exists():
        return default_bg
    return None

def draw_face_canvas(c: canvas.Canvas, x: float, y: float, data: dict, width: float = 90 * mm, height: float = 60 * mm):
    """
    Renders Front Side of the badge at (x, y).
    Draws the background image (default or custom uploaded), and overlays
    Full Name (multiline), Position, and Department with custom layout adjustments.
    """
    c.saveState()

    bg_path = resolve_background_image_path(data.get("background_image"))

    if bg_path and bg_path.exists():
        # Draw the complete background image (containing border, sash, emblem, divider)
        c.drawImage(str(bg_path), x, y, width=width, height=height, preserveAspectRatio=False)
    else:
        # Vector Fallback if image file is not present
        c.setFillColor(white)
        c.rect(x, y, width, height, fill=1, stroke=0)

        # Diagonal Ribbon
        c.saveState()
        clip = c.beginPath()
        clip.rect(x, y, width, height)
        c.clipPath(clip, stroke=0)

        sx = width / 900.0
        sy = height / 600.0
        def map_pt(sx_val, sy_val):
            return (x + sx_val * sx, y + height - sy_val * sy)

        # 1. Left outer dark green stripe
        p1 = c.beginPath()
        pt = map_pt(-90, 600); p1.moveTo(pt[0], pt[1])
        pt = map_pt(-75, 600); p1.lineTo(pt[0], pt[1])
        pt = map_pt(185, 0); p1.lineTo(pt[0], pt[1])
        pt = map_pt(170, 0); p1.lineTo(pt[0], pt[1]); p1.close()
        c.setFillColor(COLOR_PRIMARY_GREEN); c.drawPath(p1, fill=1, stroke=0)

        # 2. Left medium green stripe
        p2 = c.beginPath()
        pt = map_pt(-55, 600); p2.moveTo(pt[0], pt[1])
        pt = map_pt(-25, 600); p2.lineTo(pt[0], pt[1])
        pt = map_pt(235, 0); p2.lineTo(pt[0], pt[1])
        pt = map_pt(205, 0); p2.lineTo(pt[0], pt[1]); p2.close()
        c.setFillColor(COLOR_MED_GREEN); c.drawPath(p2, fill=1, stroke=0)

        # 3. Main wide lime ribbon
        p3 = c.beginPath()
        pt = map_pt(-25, 600); p3.moveTo(pt[0], pt[1])
        pt = map_pt(150, 600); p3.lineTo(pt[0], pt[1])
        pt = map_pt(385, 0); p3.lineTo(pt[0], pt[1])
        pt = map_pt(235, 0); p3.lineTo(pt[0], pt[1]); p3.close()
        c.setFillColor(COLOR_LIGHT_GREEN); c.drawPath(p3, fill=1, stroke=0)

        # 4. Right medium green stripe
        p4 = c.beginPath()
        pt = map_pt(150, 600); p4.moveTo(pt[0], pt[1])
        pt = map_pt(180, 600); p4.lineTo(pt[0], pt[1])
        pt = map_pt(415, 0); p4.lineTo(pt[0], pt[1])
        pt = map_pt(385, 0); p4.lineTo(pt[0], pt[1]); p4.close()
        c.setFillColor(COLOR_MED_GREEN); c.drawPath(p4, fill=1, stroke=0)

        # 5. Right outer dark green stripe
        p5 = c.beginPath()
        pt = map_pt(195, 600); p5.moveTo(pt[0], pt[1])
        pt = map_pt(210, 600); p5.lineTo(pt[0], pt[1])
        pt = map_pt(440, 0); p5.lineTo(pt[0], pt[1])
        pt = map_pt(425, 0); p5.lineTo(pt[0], pt[1]); p5.close()
        c.setFillColor(COLOR_PRIMARY_GREEN); c.drawPath(p5, fill=1, stroke=0)
        c.restoreState()

        # Outer border
        c.setStrokeColor(COLOR_PRIMARY_GREEN)
        c.setLineWidth(1.4)
        c.rect(x + 0.3 * mm, y + 0.3 * mm, width - 0.6 * mm, height - 0.6 * mm, fill=0, stroke=1)

        # Top Bilingual Header
        c.setFillColor(HexColor("#000000"))
        c.setFont(FONT_MEDIUM, 6.7)
        c.drawCentredString(x + width / 2.0, y + height - 4.2 * mm, "ШЖҚ «Теміртау қаласының көп бейінді ауруханасы» КМК")
        c.drawCentredString(x + width / 2.0, y + height - 7.2 * mm, "КГП на ПХВ «Многопрофильная больница г. Темиртау»")

        # Official Hospital Emblem
        logo_cx, logo_cy, logo_r = x + 19.5 * mm, y + 24.5 * mm, 14.0 * mm
        c.setFillColor(white)
        c.setStrokeColor(COLOR_PRIMARY_GREEN)
        c.setLineWidth(1.3)
        c.circle(logo_cx, logo_cy, logo_r, fill=1, stroke=1)

        c.setFillColor(COLOR_LIGHT_GREEN)
        c.circle(logo_cx, logo_cy, 6 * mm, fill=1, stroke=0)
        c.setFillColor(COLOR_PRIMARY_GREEN)
        c.setFont(FONT_BOLD, 8.8)
        c.drawCentredString(logo_cx, logo_cy - 5.4 * mm, "МБ")
        c.setFont(FONT_BOLD, 4.2)
        c.drawCentredString(logo_cx, logo_cy - 8.4 * mm, "ТЕМИРТАУ")

    # Read Layout Settings
    layout = data.get("layout_config") or {}
    name_off_x = float(layout.get("name_offset_x", 0.0)) * mm
    name_off_y = float(layout.get("name_offset_y", 0.0)) * mm
    name_fs = float(layout.get("name_font_size", 13.0))
    name_lh = float(layout.get("name_line_height", 4.8)) * mm
    name_align = layout.get("name_align", "center")

    pos_off_x = float(layout.get("pos_offset_x", 0.0)) * mm
    pos_off_y = float(layout.get("pos_offset_y", 0.0)) * mm
    pos_fs = float(layout.get("pos_font_size", 10.5))
    pos_lh = float(layout.get("pos_line_height", 4.0)) * mm
    pos_align = layout.get("pos_align", "center")

    dept_off_x = float(layout.get("dept_offset_x", 0.0)) * mm
    dept_off_y = float(layout.get("dept_offset_y", 0.0)) * mm
    dept_fs = float(layout.get("dept_font_size", 7.2))
    show_dept = bool(layout.get("show_department", True))
    show_divider = bool(layout.get("show_divider", False))

    # Baseline anchor points (matching detected divider position)
    center_x = x + 64.2 * mm
    divider_y = y + 24.1 * mm

    # Optional divider line (if custom background doesn't already have one)
    if show_divider:
        c.setStrokeColor(COLOR_PRIMARY_GREEN)
        c.setLineWidth(1.3)
        c.line(center_x - 18 * mm, divider_y, center_x + 18 * mm, divider_y)

    # 1. Overlay Employee Name (Above divider line)
    name_lines = data.get("name_lines") or [data.get("full_name", "")]
    c.setFillColor(HexColor("#000000"))
    c.setFont(FONT_BOLD, name_fs)

    name_start_y = divider_y + 4.2 * mm + name_off_y + (len(name_lines) - 1) * name_lh
    for i, line in enumerate(name_lines):
        line_y = name_start_y - i * name_lh
        line_x = center_x + name_off_x
        if name_align == "left":
            c.drawString(line_x - 18 * mm, line_y, line)
        elif name_align == "right":
            c.drawRightString(line_x + 18 * mm, line_y, line)
        else:
            c.drawCentredString(line_x, line_y, line)

    # 2. Overlay Position (Below divider line)
    pos_lines = data.get("pos_lines") or [data.get("position", "").lower()]
    c.setFillColor(HexColor("#000000"))
    c.setFont(FONT_REGULAR, pos_fs)

    pos_start_y = divider_y - 4.6 * mm + pos_off_y
    for j, pline in enumerate(pos_lines):
        pline_y = pos_start_y - j * pos_lh
        pline_x = center_x + pos_off_x
        if pos_align == "left":
            c.drawString(pline_x - 18 * mm, pline_y, pline)
        elif pos_align == "right":
            c.drawRightString(pline_x + 18 * mm, pline_y, pline)
        else:
            c.drawCentredString(pline_x, pline_y, pline)

    # 3. Overlay Department (Below position)
    if show_dept and data.get("department_name"):
        dept_y = pos_start_y - len(pos_lines) * pos_lh - 1.2 * mm + dept_off_y
        dept_x = center_x + dept_off_x
        c.setFillColor(COLOR_TEXT_MUTED)
        c.setFont(FONT_MEDIUM, dept_fs)
        c.drawCentredString(dept_x, dept_y, str(data.get("department_name")))

    c.restoreState()

def draw_back_canvas(c: canvas.Canvas, x: float, y: float, width: float = 90 * mm, height: float = 60 * mm, safety_codes: dict | None = None):
    """Draws high-fidelity vector Back Side (Safety Codes) at (x, y) with dynamic phone numbers."""
    c.saveState()

    codes = dict(DEFAULT_SAFETY_CODES)
    if safety_codes:
        codes.update({k: v for k, v in safety_codes.items() if v})

    # Background
    c.setFillColor(white)
    c.rect(x, y, width, height, fill=1, stroke=0)

    # Outer border
    c.setStrokeColor(COLOR_PRIMARY_GREEN)
    c.setLineWidth(1.4)
    c.rect(x + 0.3 * mm, y + 0.3 * mm, width - 0.6 * mm, height - 0.6 * mm, fill=0, stroke=1)

    # Title
    c.setFillColor(COLOR_TEXT_DARK)
    c.setFont(FONT_BOLD, 8.5)
    c.drawCentredString(x + width / 2.0, y + height - 4.2 * mm, "КОДЫ ПО БЕЗОПАСНОСТИ")

    # Table layout: 5 rows (compacted to prevent any overlap with the title)
    row_h = 8.6 * mm
    pad_y = 0.9 * mm
    base_y = y + 2.5 * mm
    badge_w = 26 * mm
    start_x = x + 2 * mm

    rows = [
        # (name, desc, main_bg, badge_bg, text_color, l1, l2, l3)
        ("ЧЕРНЫЙ", "УГРОЗА ТЕРРОРИСТИЧЕСКОГО АКТА", COLOR_BLACK, COLOR_BLACK_DARK, white,
         codes["black_extra"][:55], codes["black_phone"], None),
        ("ЖЕЛТЫЙ", "РАЗЛИТИЕ ХИМИЧЕСКИХ ВЕЩЕСТВ", COLOR_YELLOW, COLOR_YELLOW_DARK, COLOR_TEXT_DARK,
         codes["yellow_extra"][:55], f"ВН. ТЕЛ. {codes['yellow_phone']}", None),
        ("СИНИЙ", "ОКАЗАНИЕ НЕОТЛОЖНОЙ МЕД. ПОМОЩИ", COLOR_BLUE, COLOR_BLUE_DARK, white,
         codes["blue_extra"][:55], f"РЕАНИМАЦИЯ, ВН. ТЕЛ. {codes['blue_phone']}", None),
        ("КРАСНЫЙ", "ПОЖАР", COLOR_RED, COLOR_RED_DARK, white,
         f"НАЧАЛЬНИК АХЧ: {codes['red_phone']}", codes["red_extra"].split("\n")[-1] if "\n" in codes["red_extra"] else "ТУШИТЬ - ЭВАКУИРОВАТЬ", None),
        ("БЕЛЫЙ", "АГРЕССИВНЫЙ ПАЦИЕНТ ИЛИ ПОСЕТИТЕЛЬ", white, HexColor("#f8fafc"), COLOR_TEXT_DARK,
         "ОХРАННАЯ СЛУЖБА ВН. СВЯЗЬ - РАЦИЯ", f"ДИСПЕТЧЕР: {codes['white_phones']}", None)
    ]

    for i, (name, desc, bg_color, badge_bg, text_color, l1, l2, l3) in enumerate(rows):
        cur_y = base_y + i * (row_h + pad_y)

        # Draw row container
        c.setFillColor(bg_color)
        c.rect(start_x, cur_y, width - 4 * mm, row_h, fill=1, stroke=0)

        # White row border
        if bg_color == white:
            c.setStrokeColor(COLOR_BORDER)
            c.setLineWidth(0.6)
            c.rect(start_x, cur_y, width - 4 * mm, row_h, fill=0, stroke=1)

        # Left badge indicator
        c.setFillColor(badge_bg)
        c.rect(start_x, cur_y, badge_w, row_h, fill=1, stroke=0)
        if bg_color == white:
            c.setStrokeColor(COLOR_BORDER)
            c.line(start_x + badge_w, cur_y, start_x + badge_w, cur_y + row_h)

        # Badge text
        c.setFillColor(text_color if bg_color != COLOR_YELLOW else (white if badge_bg == COLOR_YELLOW_DARK else COLOR_TEXT_DARK))
        c.setFont(FONT_BOLD, 6.8)
        c.drawCentredString(start_x + badge_w / 2.0, cur_y + row_h / 2.0 + 1 * mm, name)

        c.setFont(FONT_BOLD, 3.8)
        c.drawCentredString(start_x + badge_w / 2.0, cur_y + row_h / 2.0 - 2.5 * mm, desc[:22])
        if len(desc) > 22:
            c.drawCentredString(start_x + badge_w / 2.0, cur_y + row_h / 2.0 - 4.1 * mm, desc[22:45])

        # Right instruction text
        c.setFillColor(text_color)
        c.setFont(FONT_BOLD, 4.8)
        text_x = start_x + badge_w + 2 * mm

        if l3:
            c.drawString(text_x, cur_y + row_h - 2.8 * mm, l1)
            c.drawString(text_x, cur_y + row_h - 5.4 * mm, l2)
            c.drawString(text_x, cur_y + row_h - 8.0 * mm, l3)
        else:
            c.drawString(text_x, cur_y + row_h - 3.8 * mm, l1)
            c.drawString(text_x, cur_y + row_h - 7.0 * mm, l2)

    c.restoreState()

def render_folded_pdf_reportlab(data: dict, output_path: str):
    """
    Renders folded vector badge on an A4 Portrait page (210mm x 297mm)
    with accurate crop marks and dashed fold line for standard portrait printing.
    """
    render_a4_sheet_reportlab([data], output_path, include_crop_marks=True)

def render_single_side_pdf_reportlab(data: dict, output_path: str, side: str = "front"):
    """Renders single 90mm x 60mm card vector PDF."""
    w, h = 90 * mm, 60 * mm
    c = canvas.Canvas(output_path, pagesize=(w, h))
    if side == "front":
        draw_face_canvas(c, 0, 0, data, width=w, height=h)
    else:
        draw_back_canvas(c, 0, 0, width=w, height=h, safety_codes=data.get("safety_codes"))
    c.setStrokeColor(COLOR_BORDER)
    c.setLineWidth(0.5)
    c.rect(0, 0, w, h, fill=0, stroke=1)
    c.showPage()
    c.save()

def render_a4_sheet_reportlab(badges_list: list[dict], output_path: str, include_crop_marks: bool = True):
    """Renders A4 Portrait Sheet (210mm x 297mm) with 4 folded pairs per page."""
    c = canvas.Canvas(output_path, pagesize=A4)
    page_w, page_h = A4
    badge_w, badge_h = 180 * mm, 60 * mm

    margin_x = (page_w - badge_w) / 2.0  # 15mm
    start_y = 265 * mm
    row_pitch = 63 * mm

    chunk_size = 4
    pages = [badges_list[i:i + chunk_size] for i in range(0, len(badges_list), chunk_size)]
    if not pages:
        pages = [[]]

    for p_idx, page_badges in enumerate(pages):
        c.setFillColor(COLOR_TEXT_MUTED)
        c.setFont(FONT_REGULAR, 5.5)
        c.drawString(margin_x, page_h - 10 * mm, "КГП на ПХВ «Многопрофильная больница г. Темиртау» — Лист печати служебных бейджей")
        c.drawRightString(page_w - margin_x, page_h - 10 * mm, f"Стр. {p_idx + 1} из {len(pages)}")

        for b_idx, b_data in enumerate(page_badges):
            cur_y = start_y - (b_idx + 1) * row_pitch + 3 * mm

            if include_crop_marks:
                c.setStrokeColor(HexColor("#64748b"))
                c.setLineWidth(0.5)
                mark_len = 4 * mm
                c.line(margin_x - mark_len, cur_y + badge_h, margin_x, cur_y + badge_h)
                c.line(margin_x, cur_y + badge_h, margin_x, cur_y + badge_h + mark_len)
                c.line(margin_x + badge_w, cur_y + badge_h, margin_x + badge_w + mark_len, cur_y + badge_h)
                c.line(margin_x + badge_w, cur_y + badge_h, margin_x + badge_w, cur_y + badge_h + mark_len)
                c.line(margin_x - mark_len, cur_y, margin_x, cur_y)
                c.line(margin_x, cur_y, margin_x, cur_y - mark_len)
                c.line(margin_x + badge_w, cur_y, margin_x + badge_w + mark_len, cur_y)
                c.line(margin_x + badge_w, cur_y, margin_x + badge_w, cur_y - mark_len)

            # Left: Face
            draw_face_canvas(c, margin_x, cur_y, b_data, width=90 * mm, height=60 * mm)
            # Right: Back
            draw_back_canvas(c, margin_x + 90 * mm, cur_y, width=90 * mm, height=60 * mm, safety_codes=b_data.get("safety_codes"))

            # Center fold line
            c.setStrokeColor(HexColor("#94a3b8"))
            c.setLineWidth(0.8)
            c.setDash(2, 2)
            c.line(margin_x + 90 * mm, cur_y, margin_x + 90 * mm, cur_y + badge_h)
            c.setDash()

            # Outer box border
            c.setStrokeColor(COLOR_BORDER)
            c.setLineWidth(0.5)
            c.rect(margin_x, cur_y, badge_w, badge_h, fill=0, stroke=1)

        c.showPage()

    c.save()

PDF_ENGINE = os.getenv("PDF_ENGINE", "reportlab").lower()

def fast_url_fetcher(url):
    return {"string": b"", "mime_type": "text/plain"}

def generate_badge_pdf(data: dict, output_path: str, mode: str = "folded") -> str:
    """Main entry point for generating single badge PDF (folded or single side)."""
    render_data = prepare_employee_render_data(
        full_name=data.get("full_name", ""),
        position=data.get("position", ""),
        department_name=data.get("department_name"),
        layout_config=data.get("layout_config"),
        safety_codes=data.get("safety_codes"),
        background_image=data.get("background_image")
    )

    if PDF_ENGINE == "weasyprint" and HAS_WEASYPRINT:
        try:
            if mode == "front":
                html = render_html_template("badge_face.html", render_data)
            elif mode == "back":
                html = render_html_template("badge_back.html", render_data)
            else:
                html = render_html_template("badge_folded.html", render_data)
            HTML(string=html, url_fetcher=fast_url_fetcher).write_pdf(output_path)
            return output_path
        except Exception as e:
            print(f"[Warning] WeasyPrint failed, falling back to ReportLab: {e}")

    # Native Vector / Image Generator
    if mode == "folded":
        render_folded_pdf_reportlab(render_data, output_path)
    else:
        render_single_side_pdf_reportlab(render_data, output_path, side=mode)

    return output_path

def generate_sheet_a4_pdf(badges: list[dict], output_path: str, include_crop_marks: bool = True) -> str:
    """Main entry point for generating multi-badge A4 Sheet PDF."""
    prepared_badges = []
    for b in badges:
        prep = prepare_employee_render_data(
            full_name=b.get("full_name", ""),
            position=b.get("position", ""),
            department_name=b.get("department_name"),
            layout_config=b.get("layout_config"),
            safety_codes=b.get("safety_codes"),
            background_image=b.get("background_image")
        )
        prep["id"] = b.get("id", "0")
        prepared_badges.append(prep)

    if PDF_ENGINE == "weasyprint" and HAS_WEASYPRINT:
        try:
            chunk_size = 4
            pages = [prepared_badges[i:i + chunk_size] for i in range(0, len(prepared_badges), chunk_size)]
            html = render_html_template("sheet_a4.html", {
                "pages": pages,
                "include_crop_marks": include_crop_marks
            })
            HTML(string=html, url_fetcher=fast_url_fetcher).write_pdf(output_path)
            return output_path
        except Exception as e:
            print(f"[Warning] WeasyPrint sheet failed, falling back to ReportLab: {e}")

    render_a4_sheet_reportlab(prepared_badges, output_path, include_crop_marks=include_crop_marks)
    return output_path
