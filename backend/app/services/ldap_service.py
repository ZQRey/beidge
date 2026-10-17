import logging
import socket
import ssl
from typing import Optional, Dict, Any
from ldap3 import Server, Connection, ALL, Tls

logger = logging.getLogger(__name__)

class LdapService:
    def test_connection(self, ldap_config: Dict[str, Any]) -> Dict[str, Any]:
        """Tests connection and credentials against LDAP / Active Directory."""
        host = ldap_config.get("host", "").strip()
        port = int(ldap_config.get("port", 636 if ldap_config.get("use_ssl", True) else 389))
        use_ssl = bool(ldap_config.get("use_ssl", True))
        bind_user = ldap_config.get("bind_user", "").strip()
        bind_password = ldap_config.get("bind_password", "")
        base_dn = ldap_config.get("base_dn", "").strip()

        if not host:
            return {"success": False, "error": "Не указан адрес хоста LDAP."}

        try:
            tls = None
            if use_ssl:
                tls = Tls(validate=ssl.CERT_NONE)

            server = Server(host, port=port, use_ssl=use_ssl, tls=tls, get_info=ALL, connect_timeout=5)
            
            if bind_user:
                conn = Connection(server, user=bind_user, password=bind_password, auto_bind=True, raise_exceptions=True)
            else:
                conn = Connection(server, auto_bind=True, raise_exceptions=True)

            # Test a quick search in base_dn if provided
            search_ok = False
            entries_count = 0
            if base_dn and conn.bound:
                search_ok = conn.search(
                    search_base=base_dn,
                    search_filter="(objectClass=*)",
                    attributes=["distinguishedName"],
                    size_limit=1
                )
                entries_count = len(conn.entries)

            conn.unbind()
            msg = f"Успешное подключение к LDAP ({host}:{port})."
            if search_ok:
                msg += f" Каталог Base DN доступен."

            return {
                "success": True,
                "message": msg,
                "server_info": f"{server.info.naming_contexts if server.info else ''}"
            }
        except Exception as e:
            logger.error(f"LDAP test connection failed: {e}")
            return {"success": False, "error": f"Ошибка подключения к LDAP: {str(e)}"}

    def search_user(self, username: str, ldap_config: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Searches for a domain user in Active Directory and returns their profile."""
        if not username:
            return None

        # Clean username
        clean_user = username.split("@")[0].split("\\")[-1].strip()
        host = ldap_config.get("host", "").strip()
        port = int(ldap_config.get("port", 636 if ldap_config.get("use_ssl", True) else 389))
        use_ssl = bool(ldap_config.get("use_ssl", True))
        bind_user = ldap_config.get("bind_user", "").strip()
        bind_password = ldap_config.get("bind_password", "")
        base_dn = ldap_config.get("base_dn", "DC=gp1,DC=loc").strip()

        if not host:
            return None

        try:
            tls = None
            if use_ssl:
                tls = Tls(validate=ssl.CERT_NONE)

            server = Server(host, port=port, use_ssl=use_ssl, tls=tls, connect_timeout=4)
            conn = Connection(server, user=bind_user, password=bind_password, auto_bind=True, raise_exceptions=True)

            search_filter = f"(&(objectClass=user)(sAMAccountName={clean_user}))"
            attributes = [
                "displayName", "title", "department", "mail", "sAMAccountName",
                "telephoneNumber", "physicalDeliveryOfficeName", "memberOf", "primaryGroupID"
            ]
            
            conn.search(search_base=base_dn, search_filter=search_filter, attributes=attributes)
            if conn.entries:
                entry = conn.entries[0]
                full_name = str(entry.displayName.value) if "displayName" in entry and entry.displayName.value else clean_user
                position = str(entry.title.value) if "title" in entry and entry.title.value else ""
                department = str(entry.department.value) if "department" in entry and entry.department.value else ""
                room = str(entry.physicalDeliveryOfficeName.value) if "physicalDeliveryOfficeName" in entry and entry.physicalDeliveryOfficeName.value else ""
                mail = str(entry.mail.value) if "mail" in entry and entry.mail.value else ""

                groups = list(entry.memberOf.values) if "memberOf" in entry and entry.memberOf else []
                primary_gid = entry.primaryGroupID.value if "primaryGroupID" in entry else None
                
                is_domain_admin = False
                if primary_gid == 512:
                    is_domain_admin = True
                else:
                    admin_markers = [
                        "администраторы домена",
                        "domain admins",
                        "администраторы предприятия",
                        "enterprise admins",
                        "cn=администраторы,",
                        "cn=administrators,",
                    ]
                    for g in groups:
                        g_low = str(g).lower()
                        if any(marker in g_low for marker in admin_markers):
                            is_domain_admin = True
                            break

                conn.unbind()
                return {
                    "username": clean_user,
                    "full_name": full_name,
                    "position": position,
                    "department": department,
                    "room": room,
                    "mail": mail,
                    "is_domain_admin": is_domain_admin,
                    "groups": [str(g) for g in groups]
                }

            conn.unbind()
        except Exception as e:
            logger.warning(f"Error searching user '{clean_user}' in LDAP: {e}")

        return None

    def resolve_workstation(self, client_ip: str) -> str:
        """Resolves client computer name using DNS PTR lookup."""
        if not client_ip or client_ip in ("127.0.0.1", "::1", "localhost"):
            return "localhost"

        try:
            host_info = socket.gethostbyaddr(client_ip)
            full_host = host_info[0]
            # Strip domain parts, e.g. N2415600816.gp1.loc -> N2415600816
            short_name = full_host.split(".")[0].strip().upper()
            if short_name:
                return short_name
        except Exception as e:
            logger.debug(f"Reverse DNS lookup for IP {client_ip} failed: {e}")

        return "Не определено"

ldap_service = LdapService()
