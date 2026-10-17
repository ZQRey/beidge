from datetime import timedelta
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Header, Response, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_password, hash_password, create_access_token, decode_access_token
from app.models.admin import AdminUser

admin_auth_router = APIRouter(prefix="/admin", tags=["admin_auth"])

class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

async def get_current_admin(
    request: Request,
    authorization: str = Header(None),
    db: AsyncSession = Depends(get_db)
) -> AdminUser:
    """Dependency that verifies admin JWT token from header or cookie."""
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    elif "admin_token" in request.cookies:
        token = request.cookies.get("admin_token")

    if not token:
        raise HTTPException(status_code=401, detail="Требуется авторизация администратора.")

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Недействительный токен сессии.")

    username = payload["sub"]
    res = await db.execute(select(AdminUser).where(AdminUser.username == username))
    admin = res.scalar_one_or_none()
    if not admin:
        raise HTTPException(status_code=401, detail="Учётная запись администратора не найдена.")

    return admin

@admin_auth_router.post("/login")
async def login(
    req: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Authenticates local admin by username and password."""
    username = req.username.strip()
    res = await db.execute(select(AdminUser).where(AdminUser.username == username))
    admin = res.scalar_one_or_none()

    if not admin or not verify_password(req.password, admin.password_hash):
        raise HTTPException(status_code=401, detail="Неверное имя пользователя или пароль.")

    token = create_access_token({"sub": admin.username})
    response.set_cookie(
        key="admin_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=True,
        max_age=60 * 60 * 12
    )

    return {
        "success": True,
        "token": token,
        "username": admin.username,
        "message": "Авторизация успешна"
    }

@admin_auth_router.post("/logout")
async def logout(response: Response):
    """Logs out local admin and removes session cookie."""
    response.delete_cookie("admin_token")
    return {"success": True, "message": "Сессия завершена"}

@admin_auth_router.get("/me")
async def me(admin: AdminUser = Depends(get_current_admin)):
    """Returns information about the current authenticated admin."""
    return {
        "authenticated": True,
        "username": admin.username
    }

@admin_auth_router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Changes password for the current local administrator."""
    if not verify_password(req.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Текущий пароль указан неверно.")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Новый пароль должен содержать не менее 6 символов.")

    admin.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"success": True, "message": "Пароль администратора успешно изменён."}
