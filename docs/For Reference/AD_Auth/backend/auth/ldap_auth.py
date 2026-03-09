"""
LDAP/Active Directory Authentication Module.
Reference: AD-Integration.md

Provides authentication against on-premises Active Directory using LDAP bind
and group membership verification.
"""
import logging
import ssl
from typing import Optional, List, Tuple, TYPE_CHECKING
from dataclasses import dataclass

from ldap3 import Server, Connection, ALL, NTLM, SUBTREE, Tls
from ldap3.core.exceptions import LDAPBindError, LDAPSocketOpenError, LDAPException

from app.config import get_settings

if TYPE_CHECKING:
    from app.services.settings_service import SettingsService
    from app.models.ad_config import ADConfiguration

settings = get_settings()
logger = logging.getLogger(__name__)


@dataclass
class ADUser:
    """Represents an authenticated Active Directory user."""
    username: str
    display_name: str
    email: Optional[str]
    distinguished_name: str
    groups: List[str]
    raw_groups: List[str]


class LDAPAuthError(Exception):
    """Base exception for LDAP authentication errors."""
    pass


class LDAPConnectionError(LDAPAuthError):
    """Could not connect to LDAP server."""
    pass


class LDAPInvalidCredentials(LDAPAuthError):
    """Invalid username or password."""
    pass


class LDAPUserNotInGroup(LDAPAuthError):
    """User authenticated but not in required group."""
    pass


def _get_runtime_ldap_settings(
    settings_service: Optional["SettingsService"] = None,
    ad_config: Optional["ADConfiguration"] = None
) -> dict:
    """Get LDAP settings from ADConfiguration object, settings service, or fall back to env vars."""
    # Prefer ADConfiguration object if provided
    if ad_config:
        # Build server URL from config
        protocol = "ldaps://" if ad_config.ldap_use_ssl else "ldap://"
        server_url = ad_config.ldap_server or ""
        if server_url and not server_url.startswith(("ldap://", "ldaps://")):
            server_url = f"{protocol}{server_url}:{ad_config.ldap_port or 389}"
        
        return {
            'ldap_server': server_url or settings.ldap_server,
            'ldap_base_dn': ad_config.ldap_base_dn or settings.ldap_base_dn,
            'ldap_domain': ad_config.ldap_domain or settings.ldap_domain,
            'ldap_auth_method': ad_config.ldap_auth_method or settings.ldap_auth_method,
            'ldap_skip_tls_verify': ad_config.ldap_skip_tls_verify if ad_config.ldap_skip_tls_verify is not None else settings.ldap_skip_tls_verify,
            'ldap_required_group': '',  # Group membership handled via role mappings
        }
    
    if settings_service:
        return {
            'ldap_server': settings_service.get_setting('ldap_server') or settings.ldap_server,
            'ldap_base_dn': settings_service.get_setting('ldap_base_dn') or settings.ldap_base_dn,
            'ldap_domain': settings_service.get_setting('ldap_domain') or settings.ldap_domain,
            'ldap_auth_method': settings_service.get_setting('ldap_auth_method') or settings.ldap_auth_method,
            'ldap_skip_tls_verify': str(settings_service.get_setting('ldap_skip_tls_verify') or 'false').lower() == 'true',
            'ldap_required_group': settings_service.get_setting('ldap_required_group') or settings.ldap_required_group,
        }
    return {
        'ldap_server': settings.ldap_server,
        'ldap_base_dn': settings.ldap_base_dn,
        'ldap_domain': settings.ldap_domain,
        'ldap_auth_method': settings.ldap_auth_method,
        'ldap_skip_tls_verify': settings.ldap_skip_tls_verify,
        'ldap_required_group': settings.ldap_required_group,
    }


def get_ldap_connection(
    username: str, 
    password: str, 
    settings_service: Optional["SettingsService"] = None,
    ad_config: Optional["ADConfiguration"] = None
) -> Tuple[Connection, str]:
    """
    Establish LDAP connection using user credentials.
    
    Supports:
    - NTLM authentication (DOMAIN\\username)
    - Simple bind (username@domain.com UPN format)
    - LDAPS with TLS
    """
    ldap_settings = _get_runtime_ldap_settings(settings_service, ad_config)
    ldap_server = ldap_settings['ldap_server']
    ldap_domain = ldap_settings['ldap_domain']
    ldap_base_dn = ldap_settings['ldap_base_dn']
    ldap_auth_method = ldap_settings['ldap_auth_method']
    ldap_skip_tls_verify = ldap_settings['ldap_skip_tls_verify']
    
    # Parse username - handle DOMAIN\user format
    if "\\" in username:
        _, username = username.split("\\", 1)
    elif "/" in username:
        _, username = username.split("/", 1)
    
    try:
        # Configure TLS if using LDAPS
        tls_config = None
        if ldap_server.startswith("ldaps://"):
            tls_config = Tls(
                validate=ssl.CERT_NONE if ldap_skip_tls_verify else ssl.CERT_REQUIRED
            )
        
        server = Server(
            ldap_server,
            get_info=ALL,
            use_ssl=ldap_server.startswith("ldaps://"),
            tls=tls_config
        )
        
        # Format username for bind
        if ldap_auth_method.upper() == "NTLM":
            bind_user = f"{ldap_domain}\\{username}"
            conn = Connection(
                server,
                user=bind_user,
                password=password,
                authentication=NTLM,
                auto_bind=True,
                auto_referrals=False
            )
        else:
            # Simple bind with UPN format
            if "@" in username:
                bind_user = username  # Already UPN format
            else:
                # Derive UPN domain from base_dn (DC=CASTLE,DC=IN -> CASTLE.IN)
                upn_domain = ldap_base_dn.replace("DC=", "").replace(",", ".")
                bind_user = f"{username}@{upn_domain}"
            
            logger.info(f"Attempting simple bind with UPN: {bind_user}")
            
            conn = Connection(
                server,
                user=bind_user,
                password=password,
                auto_bind=True,
                auto_referrals=False
            )
        
        logger.info(f"LDAP bind successful for user: {username}")
        return conn, bind_user
        
    except LDAPSocketOpenError as e:
        logger.error(f"LDAP connection failed: {e}")
        raise LDAPConnectionError(f"Cannot connect to LDAP server: {ldap_server}")
    except LDAPBindError as e:
        logger.warning(f"LDAP bind failed for user {username}: {e}")
        raise LDAPInvalidCredentials("Invalid username or password")
    except LDAPException as e:
        logger.error(f"LDAP error: {e}")
        raise LDAPAuthError(f"LDAP error: {str(e)}")


def search_user(
    conn: Connection, 
    username: str, 
    settings_service: Optional["SettingsService"] = None,
    ad_config: Optional["ADConfiguration"] = None
) -> Optional[dict]:
    """Search for user in AD and retrieve attributes."""
    ldap_settings = _get_runtime_ldap_settings(settings_service, ad_config)
    ldap_base_dn = ldap_settings['ldap_base_dn']
    
    # Strip domain prefix if present (handle DOMAIN\user or DOMAIN/user format)
    search_name = username
    if "\\" in search_name:
        _, search_name = search_name.split("\\", 1)
    elif "/" in search_name:
        _, search_name = search_name.split("/", 1)
    
    # Also strip UPN suffix if present (user@domain.com)
    search_name = search_name.split("@")[0]
    
    search_filter = f"(sAMAccountName={search_name})"
    attributes = ["cn", "displayName", "mail", "distinguishedName", "memberOf", "sAMAccountName"]
    
    conn.search(
        search_base=ldap_base_dn,
        search_filter=search_filter,
        search_scope=SUBTREE,
        attributes=attributes
    )
    
    if not conn.entries:
        logger.warning(f"User not found in AD: {username}")
        return None
    
    entry = conn.entries[0]
    return {
        "cn": str(entry.cn) if hasattr(entry, "cn") else username,
        "displayName": str(entry.displayName) if hasattr(entry, "displayName") else username,
        "mail": str(entry.mail) if hasattr(entry, "mail") else None,
        "distinguishedName": str(entry.distinguishedName) if hasattr(entry, "distinguishedName") else "",
        "memberOf": list(entry.memberOf) if hasattr(entry, "memberOf") else [],
        "sAMAccountName": str(entry.sAMAccountName) if hasattr(entry, "sAMAccountName") else username
    }


def extract_group_names(group_dns: List[str]) -> List[str]:
    """Extract CN (common name) from group distinguished names."""
    names = []
    for dn in group_dns:
        parts = dn.split(",")
        for part in parts:
            if part.upper().startswith("CN="):
                names.append(part[3:])
                break
    return names


def check_group_membership(user_groups: List[str], required_group: str) -> bool:
    """Check if user is member of required group."""
    if not required_group:
        return True
    group_names = extract_group_names(user_groups)
    return required_group.lower() in [g.lower() for g in group_names]


def authenticate_ad_user(
    username: str, 
    password: str, 
    require_group: bool = True,
    settings_service: Optional["SettingsService"] = None,
    ad_config: Optional["ADConfiguration"] = None
) -> ADUser:
    """
    Main authentication function.
    
    Process:
    1. Bind with user credentials (validates password)
    2. Search user attributes and group memberships
    3. Verify required group membership (if configured)
    4. Return ADUser object with full details
    """
    conn, _ = get_ldap_connection(username, password, settings_service, ad_config)
    
    try:
        user_info = search_user(conn, username, settings_service, ad_config)
        
        if not user_info:
            raise LDAPInvalidCredentials("User not found in directory")
        
        user_groups = user_info.get("memberOf", [])
        group_names = extract_group_names(user_groups)
        
        # Check required group membership (legacy - now handled via role mappings)
        ldap_settings = _get_runtime_ldap_settings(settings_service, ad_config)
        required_group = ldap_settings.get('ldap_required_group', '')
        
        if require_group and required_group:
            if not check_group_membership(user_groups, required_group):
                raise LDAPUserNotInGroup("Access denied. User not member of required group.")
        
        return ADUser(
            username=user_info["sAMAccountName"],
            display_name=user_info["displayName"],
            email=user_info["mail"],
            distinguished_name=user_info["distinguishedName"],
            groups=group_names,
            raw_groups=user_groups
        )
        
    finally:
        conn.unbind()


def test_ldap_connection(settings_service: Optional["SettingsService"] = None) -> dict:
    """Test LDAP server connectivity for health checks."""
    ldap_settings = _get_runtime_ldap_settings(settings_service)
    server_url = ldap_settings['ldap_server']
    
    if not server_url:
        return {
            "status": "not_configured",
            "server": "",
            "error": "No LDAP server configured"
        }
    
    try:
        tls_config = None
        if server_url.startswith("ldaps://"):
            tls_config = Tls(validate=ssl.CERT_NONE)
        
        server = Server(
            server_url,
            get_info=ALL,
            use_ssl=server_url.startswith("ldaps://"),
            tls=tls_config,
            connect_timeout=5
        )
        
        conn = Connection(server, auto_referrals=False)
        if conn.bind():
            conn.unbind()
            return {
                "status": "connected",
                "server": server_url,
                "authenticated": False
            }
            
    except LDAPSocketOpenError as e:
        return {
            "status": "unreachable",
            "server": server_url,
            "error": str(e)
        }
    except Exception as e:
        return {
            "status": "error",
            "server": server_url,
            "error": str(e)
        }
    
    return {
        "status": "unknown",
        "server": server_url
    }
