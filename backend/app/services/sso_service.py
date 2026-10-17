import json
import logging
from typing import Optional, Dict, Any
from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.admin import SystemSetting
from app.services.ldap_service import ldap_service
from app.services.user_resolver import extract_client_ip

logger = logging.getLogger(__name__)

async def get_system_setting(db: AsyncSession, key: str, default: Any = None) -> Any:
    """Retrieves a system setting from the database or returns default."""
    try:
        res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
        setting = res.scalar_one_or_none()
        if setting and setting.value:
            try:
                return json.loads(setting.value)
            except Exception:
                return setting.value
    except Exception as e:
        logger.warning(f"Error fetching system setting '{key}': {e}")
    return default

async def set_system_setting(db: AsyncSession, key: str, value: Any) -> None:
    """Saves or updates a system setting in the database."""
    res = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = res.scalar_one_or_none()
    str_val = json.dumps(value) if not isinstance(value, str) else value
    if setting:
        setting.value = str_val
    else:
        setting = SystemSetting(key=key, value=str_val)
        db.add(setting)
    await db.commit()

def check_is_local_admin(request: Request) -> bool:
    """Verifies whether request contains valid local admin JWT token."""
    token = None
    auth_header = request.headers.get("authorization", "")
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    elif "admin_token" in request.cookies:
        token = request.cookies.get("admin_token")
    if not token:
        return False
    try:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        return bool(payload and "sub" in payload)
    except Exception:
        return False

async def resolve_current_user_context(request: Request, db: AsyncSession) -> Dict[str, Any]:
    """
    Resolves the current client user context using SSO / Kerberos / LDAP and reverse DNS.
    Respects the sso_enabled toggle and checks permissions (Domain Admin and Local Admin).
    """
    client_ip = extract_client_ip(request)
    sso_enabled = await get_system_setting(db, "sso_enabled", True)
    is_local_admin = check_is_local_admin(request)
    is_domain_admin = False

    ldap_config = await get_system_setting(db, "ldap_settings", {
        "host": "dc01.gp1.loc",
        "port": 636,
        "use_ssl": True,
        "domain": "gp1.loc",
        "base_dn": "DC=gp1,DC=loc",
        "bind_user": "svc_beidge@gp1.loc",
        "bind_password": ""
    })

    # Always resolve workstation name via DNS PTR
    workstation = ldap_service.resolve_workstation(client_ip)

    if not sso_enabled:
        return {
            "sso_enabled": False,
            "authenticated": bool(is_local_admin),
            "username": "admin" if is_local_admin else "",
            "full_name": "Локальный администратор" if is_local_admin else "Гостевой режим",
            "machine_name": workstation if workstation != "Не определено" else "",
            "ip": client_ip,
            "department": "",
            "position": "",
            "is_domain_admin": False,
            "is_local_admin": is_local_admin,
            "can_edit_design": is_local_admin
        }

    # 1. Check Remote-User from Nginx or proxy headers
    remote_user = request.headers.get("remote-user") or request.headers.get("x-remote-user") or ""
    if not remote_user:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("negotiate "):
            # Browser sent Negotiate token
            remote_user = ""

    # Clean username if domain prefix/suffix present
    clean_username = remote_user.split("@")[0].split("\\")[-1].strip() if remote_user else ""

    # 2. If no direct header, try resolving by workstation through Helper internal directory
    full_name = ""
    department = ""
    position = ""
    room = ""

    if clean_username:
        # Search details in LDAP
        ad_user = ldap_service.search_user(clean_username, ldap_config)
        if ad_user:
            full_name = ad_user.get("full_name") or clean_username
            department = ad_user.get("department") or ""
            position = ad_user.get("position") or ""
            is_domain_admin = ad_user.get("is_domain_admin", False)
        else:
            full_name = clean_username
    else:
        # Fallback: query Helper internal resolver using both IP and workstation from PTR DNS
        try:
            from app.services.user_resolver import resolve_client_info
            helper_info = await resolve_client_info(client_ip=client_ip, machine_name=workstation)
            if helper_info.get("resolved") and helper_info.get("username"):
                clean_username = helper_info.get("username", "")
                full_name = helper_info.get("full_name", "") or clean_username
                if helper_info.get("room"):
                    room = helper_info["room"]
                if helper_info.get("machine_name") and (not workstation or workstation == "Не определено"):
                    workstation = helper_info["machine_name"]

                # Enrich with LDAP if available
                ad_user = ldap_service.search_user(clean_username, ldap_config)
                if ad_user:
                    full_name = ad_user.get("full_name") or full_name
                    department = ad_user.get("department") or department
                    position = ad_user.get("position") or position
                    is_domain_admin = ad_user.get("is_domain_admin", False)
        except Exception:
            pass

    can_edit_design = bool(is_domain_admin or is_local_admin)

    return {
        "sso_enabled": True,
        "authenticated": bool(clean_username or is_local_admin),
        "username": clean_username or ("admin" if is_local_admin else ""),
        "full_name": full_name or ("Локальный администратор" if is_local_admin else ("Доменный пользователь" if workstation != "Не определено" else "")),
        "machine_name": workstation,
        "room": room,
        "ip": client_ip,
        "department": department,
        "position": position,
        "is_domain_admin": is_domain_admin,
        "is_local_admin": is_local_admin,
        "can_edit_design": can_edit_design
    }

