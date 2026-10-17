from app.api.departments import router as departments_router
from app.api.employees import router as employees_router
from app.api.badges import router as badges_router
from app.api.auth import auth_router
from app.api.admin_auth import admin_auth_router
from app.api.admin_settings import admin_settings_router

__all__ = [
    "departments_router",
    "employees_router",
    "badges_router",
    "auth_router",
    "admin_auth_router",
    "admin_settings_router"
]
