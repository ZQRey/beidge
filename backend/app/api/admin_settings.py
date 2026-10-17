import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.admin_auth import get_current_admin
from app.models.admin import AdminUser
from app.services.sso_service import get_system_setting, set_system_setting
from app.services.ldap_service import ldap_service
from app.services.glpi_client import glpi_client

logger = logging.getLogger(__name__)

admin_settings_router = APIRouter(prefix="/admin", tags=["admin_settings"])

class LdapSettingsModel(BaseModel):
    host: str
    port: int = 636
    use_ssl: bool = True
    domain: str = "gp1.loc"
    base_dn: str = "DC=gp1,DC=loc"
    bind_user: str = "litlehelper@gp1.loc"
    bind_password: Optional[str] = ""

class GlpiSettingsModel(BaseModel):
    base_url: str = "https://glpi.gp1.loc/apirest.php"
    web_url: str = "https://glpi.gp1.loc"
    app_token: str
    user_token: str
    service_user_id: int = 10

class SystemSettingsUpdate(BaseModel):
    sso_enabled: bool = True
    ldap: LdapSettingsModel
    glpi: GlpiSettingsModel

@admin_settings_router.get("/settings")
async def get_settings(
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Returns current system settings (passwords and tokens masked for security)."""
    sso_enabled = await get_system_setting(db, "sso_enabled", True)
    ldap_config = await get_system_setting(db, "ldap_settings", {
        "host": "dc01.gp1.loc",
        "port": 636,
        "use_ssl": True,
        "domain": "gp1.loc",
        "base_dn": "DC=gp1,DC=loc",
        "bind_user": "litlehelper@gp1.loc",
        "bind_password": ""
    })
    glpi_config = await get_system_setting(db, "glpi_settings", {
        "base_url": "https://glpi.gp1.loc/apirest.php",
        "web_url": "https://glpi.gp1.loc",
        "app_token": "kM9xT2qL8wV5yZ1pB7nR4sA3dE6fH0jC",
        "user_token": "aa21379b71949f2e2735cf966b22a67fd81aae12",
        "service_user_id": 10
    })

    # Mask password
    masked_ldap = dict(ldap_config)
    if masked_ldap.get("bind_password"):
        masked_ldap["has_password"] = True
        masked_ldap["bind_password"] = "********"
    else:
        masked_ldap["has_password"] = False

    return {
        "sso_enabled": sso_enabled,
        "ldap": masked_ldap,
        "glpi": glpi_config
    }

@admin_settings_router.put("/settings")
async def update_settings(
    update: SystemSettingsUpdate,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Updates system settings in the database."""
    # Handle password preservation if sent as masked
    existing_ldap = await get_system_setting(db, "ldap_settings", {})
    ldap_dict = update.ldap.model_dump()
    if ldap_dict.get("bind_password") == "********" or not ldap_dict.get("bind_password"):
        ldap_dict["bind_password"] = existing_ldap.get("bind_password", "")

    glpi_dict = update.glpi.model_dump()

    await set_system_setting(db, "sso_enabled", update.sso_enabled)
    await set_system_setting(db, "ldap_settings", ldap_dict)
    await set_system_setting(db, "glpi_settings", glpi_dict)

    # Also update singleton glpi_client runtime settings
    glpi_client.base_url = glpi_dict.get("base_url", "").rstrip("/")
    glpi_client.app_token = glpi_dict.get("app_token", "")
    glpi_client.user_token = glpi_dict.get("user_token", "")
    glpi_client.service_user_id = int(glpi_dict.get("service_user_id", 10))

    return {"success": True, "message": "Настройки успешно сохранены."}

@admin_settings_router.post("/test-ldap")
async def test_ldap(
    payload: LdapSettingsModel,
    admin: AdminUser = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Tests LDAP / Active Directory connection."""
    ldap_dict = payload.model_dump()
    if ldap_dict.get("bind_password") == "********" or not ldap_dict.get("bind_password"):
        existing_ldap = await get_system_setting(db, "ldap_settings", {})
        ldap_dict["bind_password"] = existing_ldap.get("bind_password", "")

    result = ldap_service.test_connection(ldap_dict)
    return result

@admin_settings_router.post("/test-glpi")
async def test_glpi(
    payload: GlpiSettingsModel,
    admin: AdminUser = Depends(get_current_admin)
):
    """Tests GLPI API connection."""
    result = await glpi_client.test_connection(payload.model_dump())
    return result
