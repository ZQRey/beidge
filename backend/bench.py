import time
from app.services.pdf_renderer import generate_sheet_a4_pdf, generate_badge_pdf

print("Starting benchmark...")
t0 = time.time()
generate_badge_pdf({
    "full_name": "Токтыбаева Аида Салходдиновна",
    "position": "врач акушер-гинеколог"
}, "/tmp/bench_badge.pdf")
print("Badge PDF done in:", round(time.time() - t0, 3), "s")

t1 = time.time()
generate_sheet_a4_pdf([
    {"id": "1", "full_name": "Токтыбаева Аида Салходдиновна", "position": "врач акушер-гинеколог"},
    {"id": "2", "full_name": "Гоцадзе Маргарита Викторовна", "position": "врач акушер-гинеколог"}
], "/tmp/bench_sheet.pdf")
print("Sheet PDF done in:", round(time.time() - t1, 3), "s")
