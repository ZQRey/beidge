import logging
from typing import Optional, Dict, Any
import httpx
from fastapi import Request

from app.core.config import settings

logger = logging.getLogger(__name__)

def extract_client_ip(request: Request) -> str:
    """Extracts client IP address from request headers or socket."""
    # 1. Check X-Forwarded-For (can be comma-separated list of IPs: client, proxy1, proxy2)
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        parts = [p.strip() for p in forwarded_for.split(",")]
        if parts and parts[0]:
            return parts[0]
    
    # 2. Check X-Real-IP
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
        
    # 3. Request client host
    if request.client and request.client.host:
        return request.client.host
        
    return "127.0.0.1"

async def resolve_client_info(client_ip: str = "", machine_name: str = "") -> Dict[str, Any]:
    """
    Queries Helper internal API to resolve domain user and workstation info by machine name or IP.
    """
    result = {
        "ip": client_ip,
        "machine_name": machine_name,
        "username": "",
        "full_name": "",
        "room": "",
        "domain": "",
        "resolved": False
    }

    if not client_ip and not machine_name:
        return result

    try:
        params = []
        if machine_name and machine_name != "Не определено":
            params.append(f"machine={machine_name.strip()}")
        if client_ip and client_ip not in ("127.0.0.1", "::1", "localhost"):
            params.append(f"ip={client_ip.strip()}")

        if not params:
            return result

        query_str = "&".join(params)
        url = f"{settings.HELPER_RESOLVER_URL}?{query_str}"
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                raw_user = data.get("username", "") or ""
                # Strip domain suffix like '@gp1.loc' or 'GP1\\'
                clean_user = raw_user.split("@")[0].split("\\")[-1].strip()

                result.update({
                    "machine_name": data.get("machineName", "") or machine_name,
                    "username": clean_user,
                    "raw_username": raw_user,
                    "full_name": data.get("fullName", "") or "",
                    "room": data.get("room", "") or "",
                    "domain": data.get("domain", "") or "",
                    "resolved": True
                })
            else:
                logger.warning(f"Helper resolve-client returned status {resp.status_code} for query {query_str}")
    except Exception as e:
        logger.error(f"Error querying Helper resolver for IP '{client_ip}', machine '{machine_name}': {e}")

    return result

