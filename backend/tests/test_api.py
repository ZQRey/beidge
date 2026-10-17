import os
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import init_db

@pytest.mark.asyncio
async def test_full_badge_workflow():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Departments list
        res = await client.get("/api/departments")
        assert res.status_code == 200
        depts = res.json()
        assert len(depts) > 0

        # 3. Badge Preview (Front, Back, Folded)
        for side in ["front", "back", "folded"]:
            res = await client.post("/api/badges/preview", json={
                "full_name": "Токтыбаева Аида Салходдиновна",
                "position": "врач акушер-гинеколог",
                "department_name": "Акушерское отделение",
                "side": side
            })
            assert res.status_code == 200
            data = res.json()
            assert data["side"] == side
            assert len(data["html"]) > 100

        # 4. Create Badge
        res = await client.post("/api/badges/create", json={
            "full_name": "Әбдірахманов Ербол Серікұлы",
            "position": "врач-реаниматолог",
            "department_name": "Отделение анестезиологии и реанимации"
        })
        assert res.status_code == 200
        badge = res.json()
        assert badge["id"] is not None
        assert badge["employee"]["full_name"] == "Әбдірахманов Ербол Серікұлы"
        assert badge["file_pdf_path"] is not None
        assert os.path.exists(badge["file_pdf_path"])

        # 5. Download Badge PDF
        res = await client.get(f"/api/badges/{badge['id']}/download")
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert len(res.content) > 1000

        # 6. Print Sheet A4 (Batch generation)
        res = await client.post("/api/badges/print-sheet", json={
            "badge_ids": [badge["id"]],
            "layout": "folded",
            "include_crop_marks": True
        })
        assert res.status_code == 200
        assert res.headers["content-type"] == "application/pdf"
        assert len(res.content) > 1000

        # 7. Import CSV
        csv_payload = (
            "ФИО;Должность;Отделение\n"
            "Серікова Айгерім Мұратқызы;врач-кардиолог;Кардиологическое отделение\n"
        ).encode("utf-8-sig")

        res = await client.post(
            "/api/employees/import-csv",
            files={"file": ("test_import.csv", csv_payload, "text/csv")}
        )
        assert res.status_code == 200
        import_res = res.json()
        assert import_res["imported_count"] >= 1
