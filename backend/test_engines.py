import time
from reportlab.pdfgen import canvas
from app.services.pdf_renderer import render_folded_pdf_reportlab, render_a4_sheet_reportlab

t0 = time.time()
render_folded_pdf_reportlab({
    "full_name": "Токтыбаева Аида Салходдиновна",
    "position": "врач акушер-гинеколог",
    "department_name": "Акушерское отделение"
}, "/tmp/rl_badge.pdf")
print("ReportLab folded badge done in:", round(time.time() - t0, 4), "s")

t1 = time.time()
render_a4_sheet_reportlab([
    {"id": "1", "full_name": "Токтыбаева Аида Салходдиновна", "position": "врач акушер-гинеколог"},
    {"id": "2", "full_name": "Гоцадзе Маргарита Викторовна", "position": "врач акушер-гинеколог"}
], "/tmp/rl_sheet.pdf")
print("ReportLab sheet A4 done in:", round(time.time() - t1, 4), "s")
