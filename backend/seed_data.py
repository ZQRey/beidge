import asyncio
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, init_db
from app.models.department import Department
from app.models.employee import Employee
from app.models.badge import Badge
from app.models.admin import AdminUser, SystemSetting
from app.core.security import hash_password
from app.services.pdf_renderer import generate_badge_pdf
from app.core.config import settings
import json
import os

SAMPLE_STAFF = [
    {
        "full_name": "Токтыбаева Аида Салходдиновна",
        "position": "врач акушер-гинеколог",
        "department": "Акушерское отделение"
    },
    {
        "full_name": "Гоцадзе Маргарита Викторовна",
        "position": "врач акушер-гинеколог",
        "department": "Гинекологическое отделение"
    },
    {
        "full_name": "Қасымов Нұрлан Бауыржанұлы",
        "position": "заведующий отделением",
        "department": "Хирургическое отделение"
    },
    {
        "full_name": "Әбдірахманов Ербол Серікұлы",
        "position": "врач-реаниматолог",
        "department": "Отделение анестезиологии и реанимации"
    },
    {
        "full_name": "Иванова Елена Сергеевна",
        "position": "старшая медицинская сестра",
        "department": "Терапевтическое отделение"
    },
    {
        "full_name": "Серікова Айгерім Мұратқызы",
        "position": "врач-кардиолог",
        "department": "Кардиологическое отделение"
    }
]

async def seed_initial_data():
    await init_db()
    async with AsyncSessionLocal() as session:
        # 1. Seed Local Admin User if missing
        admin_res = await session.execute(select(AdminUser).where(AdminUser.username == "admin"))
        if not admin_res.scalar_one_or_none():
            default_pass = os.getenv("ADMIN_PASSWORD", "AdminPassword123!")
            admin = AdminUser(
                username="admin",
                password_hash=hash_password(default_pass)
            )
            session.add(admin)
            print("Initial local admin user 'admin' created.")

        # 2. Seed Default System Settings if missing
        sso_res = await session.execute(select(SystemSetting).where(SystemSetting.key == "sso_enabled"))
        if not sso_res.scalar_one_or_none():
            session.add(SystemSetting(key="sso_enabled", value=json.dumps(True)))

        ldap_res = await session.execute(select(SystemSetting).where(SystemSetting.key == "ldap_settings"))
        if not ldap_res.scalar_one_or_none():
            session.add(SystemSetting(key="ldap_settings", value=json.dumps({
                "host": "dc01.gp1.loc",
                "port": 636,
                "use_ssl": True,
                "domain": "gp1.loc",
                "base_dn": "DC=gp1,DC=loc",
                "bind_user": "svc_beidge@gp1.loc",
                "bind_password": "B3idge#Ldap2026!Sec"
            })))

        glpi_res = await session.execute(select(SystemSetting).where(SystemSetting.key == "glpi_settings"))
        if not glpi_res.scalar_one_or_none():
            session.add(SystemSetting(key="glpi_settings", value=json.dumps({
                "base_url": settings.GLPI_BASE_URL,
                "web_url": settings.GLPI_WEB_URL,
                "app_token": settings.GLPI_APP_TOKEN,
                "user_token": settings.GLPI_USER_TOKEN,
                "service_user_id": settings.GLPI_SERVICE_USER_ID
            })))

        await session.commit()

        # 3. Seed initial staff if table empty
        res = await session.execute(select(Employee))
        if res.scalars().first():
            return

        print("Seeding initial hospital staff and badges...")
        dept_cache = {}

        for item in SAMPLE_STAFF:
            dept_name = item["department"]
            if dept_name not in dept_cache:
                d = Department(name=dept_name)
                session.add(d)
                await session.flush()
                dept_cache[dept_name] = d

            dept = dept_cache[dept_name]
            emp = Employee(
                full_name=item["full_name"],
                position=item["position"],
                department_id=dept.id
            )
            session.add(emp)
            await session.flush()

            # Generate badge
            badge_id = str(uuid.uuid4())
            pdf_path = settings.STORAGE_DIR / "pdfs" / f"badge_{badge_id}.pdf"
            generate_badge_pdf({
                "full_name": item["full_name"],
                "position": item["position"],
                "department_name": dept_name
            }, str(pdf_path), mode="folded")

            badge = Badge(
                id=badge_id,
                employee_id=emp.id,
                file_pdf_path=str(pdf_path),
                status="active"
            )
            session.add(badge)

        await session.commit()
        print("Initial staff seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_initial_data())

