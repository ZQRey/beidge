import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

class GlpiClient:
    def __init__(self):
        self.base_url = settings.GLPI_BASE_URL.rstrip("/")
        self.app_token = settings.GLPI_APP_TOKEN
        self.user_token = settings.GLPI_USER_TOKEN
        self.service_user_id = settings.GLPI_SERVICE_USER_ID

    async def _init_session(self, client: httpx.AsyncClient, base_url: str = None, app_token: str = None, user_token: str = None) -> Optional[str]:
        """Initializes a session with GLPI REST API."""
        b_url = (base_url or self.base_url).rstrip("/")
        a_token = app_token or self.app_token
        u_token = user_token or self.user_token

        try:
            resp = await client.get(
                f"{b_url}/initSession",
                headers={
                    "App-Token": a_token,
                    "Authorization": f"user_token {u_token}"
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("session_token")
            else:
                logger.error(f"GLPI initSession failed ({resp.status_code}): {resp.text}")
                return None
        except Exception as e:
            logger.error(f"Error during GLPI initSession: {e}")
            return None

    async def test_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Tests connection and credentials against GLPI REST API."""
        base_url = config.get("base_url", self.base_url).rstrip("/")
        app_token = config.get("app_token", self.app_token)
        user_token = config.get("user_token", self.user_token)

        if not base_url or not app_token or not user_token:
            return {"success": False, "error": "Не все обязательные поля (URL, App-Token, User-Token) заполнены."}

        async with httpx.AsyncClient(verify=False, timeout=10.0) as client:
            try:
                resp = await client.get(
                    f"{base_url}/initSession",
                    headers={
                        "App-Token": app_token,
                        "Authorization": f"user_token {user_token}"
                    }
                )
                if resp.status_code == 200:
                    session_token = resp.json().get("session_token")
                    if session_token:
                        try:
                            await client.get(
                                f"{base_url}/killSession",
                                headers={"App-Token": app_token, "Session-Token": session_token}
                            )
                        except Exception:
                            pass
                    return {"success": True, "message": "Подключение к GLPI API успешно установлено. Авторизация пройдена."}
                else:
                    return {"success": False, "error": f"GLPI API вернул HTTP {resp.status_code}: {resp.text}"}
            except Exception as e:
                return {"success": False, "error": f"Ошибка соединения с GLPI: {str(e)}"}

    async def _find_user_id(self, client: httpx.AsyncClient, session_token: str, username: str) -> Optional[int]:
        """Finds GLPI user ID by domain username/login."""
        if not username:
            return None

        clean_user = username.split("@")[0].split("\\")[-1].strip().lower()
        try:
            url = f"{self.base_url}/search/User"
            params = {
                "criteria[0][field]": "1",  # 1: login/name
                "criteria[0][searchtype]": "contains",
                "criteria[0][value]": clean_user,
                "forcedisplay[0]": "1",    # 1: name
                "forcedisplay[1]": "2"     # 2: id
            }
            resp = await client.get(
                url,
                params=params,
                headers={
                    "App-Token": self.app_token,
                    "Session-Token": session_token
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                items = data.get("data", [])
                # First attempt: exact match
                for item in items:
                    login_val = str(item.get("1", "")).lower()
                    if login_val == clean_user:
                        raw_id = item.get("2")
                        if raw_id is not None:
                            return int(raw_id)
                # Fallback: first match
                if items:
                    raw_id = items[0].get("2")
                    if raw_id is not None:
                        return int(raw_id)
        except Exception as e:
            logger.warning(f"Could not find GLPI user for '{clean_user}': {e}")

        return None

    async def create_badge_ticket(
        self,
        full_name: str,
        position: str,
        department_name: Optional[str],
        pdf_path: str,
        client_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Creates a ticket in GLPI and attaches the generated badge PDF.
        """
        async with httpx.AsyncClient(verify=False, timeout=15.0) as client:
            session_token = await self._init_session(client)
            if not session_token:
                return {
                    "success": False,
                    "error": "Не удалось авторизоваться в GLPI API."
                }

            auth_headers = {
                "App-Token": self.app_token,
                "Session-Token": session_token
            }

            try:
                # 1. Resolve requester ID
                username = client_info.get("username", "")
                requester_id = await self._find_user_id(client, session_token, username)
                if not requester_id:
                    requester_id = self.service_user_id

                # 2. Build ticket title and description
                user_desc = client_info.get("full_name") or client_info.get("username") or "Доменный пользователь"
                machine = client_info.get("machine_name") or ""
                room = client_info.get("room") or "Не указан"
                dept = department_name.strip() if department_name else "Не указано"

                # If machine name is known, prefix title with [MachineName] so Helper & Telegram recognize it
                if machine and machine != "Не определено":
                    ticket_title = f"[{machine}] Нужен бейдж для сотрудника {full_name.strip()}"
                else:
                    ticket_title = f"Нужен бейдж для сотрудника {full_name.strip()}"

                # Clean description without redundant 'Информация о заявке'
                ticket_content = (
                    f"Нужен бейдж для сотрудника {full_name.strip()}.\n\n"
                    f"Сотрудник: {full_name.strip()}\n"
                    f"Должность: {position.strip()}\n"
                    f"Отделение: {dept}"
                )

                ticket_payload = {
                    "input": {
                        "name": ticket_title,
                        "content": ticket_content,
                        "_users_id_requester": requester_id
                    }
                }

                # 3. Create Ticket
                t_resp = await client.post(
                    f"{self.base_url}/Ticket/",
                    headers={**auth_headers, "Content-Type": "application/json"},
                    json=ticket_payload
                )

                if t_resp.status_code not in (200, 201):
                    logger.error(f"Failed to create GLPI ticket ({t_resp.status_code}): {t_resp.text}")
                    return {
                        "success": False,
                        "error": f"Ошибка создания заявки в GLPI ({t_resp.status_code}): {t_resp.text}"
                    }

                ticket_id = t_resp.json().get("id")

                # 4. Attach PDF document
                pdf_file = Path(pdf_path)
                if pdf_file.exists():
                    safe_doc_name = f"Бейдж - {full_name.strip()}.pdf"
                    manifest = {
                        "input": {
                            "name": safe_doc_name,
                            "_filename": [pdf_file.name],
                            "items_id": ticket_id,
                            "itemtype": "Ticket"
                        }
                    }
                    
                    with open(pdf_file, "rb") as pf:
                        pdf_bytes = pf.read()

                    files = {
                        "uploadManifest": (None, json.dumps(manifest), "application/json"),
                        "filename[0]": (pdf_file.name, pdf_bytes, "application/pdf")
                    }

                    doc_resp = await client.post(
                        f"{self.base_url}/Document/",
                        headers=auth_headers,
                        files=files
                    )
                    if doc_resp.status_code not in (200, 201):
                        logger.warning(f"Document upload returned {doc_resp.status_code}: {doc_resp.text}")

                ticket_url = f"{settings.GLPI_WEB_URL}/front/ticket.form.php?id={ticket_id}"

                return {
                    "success": True,
                    "ticket_id": ticket_id,
                    "ticket_url": ticket_url,
                    "requester": user_desc,
                    "machine": machine or "Не определено",
                    "room": room,
                    "message": f"Заявка #{ticket_id} успешно создана в GLPI"
                }

            finally:
                # 5. Clean up session
                try:
                    await client.get(f"{self.base_url}/killSession", headers=auth_headers)
                except Exception:
                    pass

    async def create_batch_badge_ticket(
        self,
        items: list[Dict[str, Any]],
        primary_department: Optional[str],
        pdf_path: str,
        client_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Creates a consolidated ticket in GLPI for multiple employee badges and attaches the merged PDF.
        """
        async with httpx.AsyncClient(verify=False, timeout=20.0) as client:
            session_token = await self._init_session(client)
            if not session_token:
                return {
                    "success": False,
                    "error": "Не удалось авторизоваться в GLPI API."
                }

            auth_headers = {
                "App-Token": self.app_token,
                "Session-Token": session_token
            }

            try:
                # 1. Resolve requester ID
                username = client_info.get("username", "")
                requester_id = await self._find_user_id(client, session_token, username)
                if not requester_id:
                    requester_id = self.service_user_id

                # 2. Build ticket title and description
                user_desc = client_info.get("full_name") or client_info.get("username") or "Доменный пользователь"
                machine = client_info.get("machine_name") or ""
                room = client_info.get("room") or "Не указан"
                count = len(items)

                dept_summary = (primary_department or "").strip()
                if not dept_summary:
                    for it in items:
                        if it.get("department_name"):
                            dept_summary = it["department_name"].strip()
                            break
                if not dept_summary:
                    dept_summary = "Не указано"

                if machine and machine != "Не определено":
                    ticket_title = f"[{machine}] Заказ бейджей ({count} чел.): {dept_summary}"
                else:
                    ticket_title = f"Заказ бейджей ({count} чел.): {dept_summary}"

                lines = [
                    f"Заказ служебных бейджей для сотрудников отделения: {dept_summary}",
                    f"Количество сотрудников: {count} чел.",
                    "",
                    "Список сотрудников:"
                ]
                for idx, emp in enumerate(items, 1):
                    fn = emp.get("full_name", "").strip()
                    pos = emp.get("position", "").strip()
                    dept = (emp.get("department_name") or dept_summary).strip()
                    lines.append(f"{idx}. {fn} — {pos} ({dept})")

                ticket_content = "\n".join(lines)

                ticket_payload = {
                    "input": {
                        "name": ticket_title,
                        "content": ticket_content,
                        "_users_id_requester": requester_id
                    }
                }

                # 3. Create Ticket
                t_resp = await client.post(
                    f"{self.base_url}/Ticket/",
                    headers={**auth_headers, "Content-Type": "application/json"},
                    json=ticket_payload
                )

                if t_resp.status_code not in (200, 201):
                    logger.error(f"Failed to create batch GLPI ticket ({t_resp.status_code}): {t_resp.text}")
                    return {
                        "success": False,
                        "error": f"Ошибка создания заявки в GLPI ({t_resp.status_code}): {t_resp.text}"
                    }

                ticket_id = t_resp.json().get("id")

                # 4. Attach PDF document
                pdf_file = Path(pdf_path)
                if pdf_file.exists():
                    safe_doc_name = f"Бейджи ({count} чел) - {dept_summary}.pdf"
                    manifest = {
                        "input": {
                            "name": safe_doc_name,
                            "_filename": [pdf_file.name],
                            "items_id": ticket_id,
                            "itemtype": "Ticket"
                        }
                    }

                    with open(pdf_file, "rb") as pf:
                        pdf_bytes = pf.read()

                    files = {
                        "uploadManifest": (None, json.dumps(manifest), "application/json"),
                        "filename[0]": (pdf_file.name, pdf_bytes, "application/pdf")
                    }

                    doc_resp = await client.post(
                        f"{self.base_url}/Document/",
                        headers=auth_headers,
                        files=files
                    )
                    if doc_resp.status_code not in (200, 201):
                        logger.warning(f"Batch Document upload returned {doc_resp.status_code}: {doc_resp.text}")

                ticket_url = f"{settings.GLPI_WEB_URL}/front/ticket.form.php?id={ticket_id}"

                return {
                    "success": True,
                    "ticket_id": ticket_id,
                    "ticket_url": ticket_url,
                    "requester": user_desc,
                    "machine": machine or "Не определено",
                    "room": room,
                    "count": count,
                    "message": f"Заявка #{ticket_id} на {count} бейджей успешно создана в GLPI"
                }

            finally:
                # 5. Clean up session
                try:
                    await client.get(f"{self.base_url}/killSession", headers=auth_headers)
                except Exception:
                    pass

glpi_client = GlpiClient()

