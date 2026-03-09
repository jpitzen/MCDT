"""
AD Configuration Service.
Manages AD/LDAP configuration, service credentials, role mappings, and group sync.
"""
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from cryptography.fernet import Fernet
from passlib.context import CryptContext
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ldap3 import Server, Connection, ALL, NTLM, SUBTREE, Tls
from ldap3.core.exceptions import LDAPBindError, LDAPSocketOpenError, LDAPException
import ssl

from app.models.ad_config import ADConfiguration, ADRoleMapping, ADGroupCache, ADUserSync
from app.models.user import User, UserRole
from app.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class ADConfigService:
    """Service for managing AD configuration and operations."""
    
    # Use the secret key as the encryption key (first 32 bytes, URL-safe base64)
    # In production, use a separate encryption key
    _fernet_key = None
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    @classmethod
    def _get_fernet(cls) -> Fernet:
        """Get Fernet instance for password encryption."""
        if cls._fernet_key is None:
            # Generate a proper Fernet key from the secret key
            import hashlib
            import base64
            key = hashlib.sha256(settings.secret_key.encode()).digest()
            cls._fernet_key = base64.urlsafe_b64encode(key)
        return Fernet(cls._fernet_key)
    
    def _encrypt_password(self, password: str) -> str:
        """Encrypt a password for storage."""
        fernet = self._get_fernet()
        return fernet.encrypt(password.encode()).decode()
    
    def _decrypt_password(self, encrypted: str) -> str:
        """Decrypt a stored password."""
        fernet = self._get_fernet()
        return fernet.decrypt(encrypted.encode()).decode()
    
    # ============ Configuration Management ============
    
    async def get_config(self) -> Optional[ADConfiguration]:
        """Get the active AD configuration."""
        try:
            result = await self.db.execute(
                select(ADConfiguration)
                .where(ADConfiguration.is_active == True)
                .options(selectinload(ADConfiguration.role_mappings))
            )
            return result.scalar_one_or_none()
        except Exception as e:
            # Table might not exist yet (pre-migration)
            logger.debug(f"Could not query AD config (table may not exist): {e}")
            return None
    
    async def get_or_create_config(self) -> ADConfiguration:
        """Get active config or create a new one."""
        config = await self.get_config()
        if not config:
            config = ADConfiguration(
                is_active=True,
                local_admin_enabled=True,
                local_admin_username="admin"
            )
            self.db.add(config)
            await self.db.commit()
            await self.db.refresh(config)
        return config
    
    async def update_config(
        self,
        ldap_enabled: Optional[bool] = None,
        ldap_server: Optional[str] = None,
        ldap_port: Optional[int] = None,
        ldap_use_ssl: Optional[bool] = None,
        ldap_base_dn: Optional[str] = None,
        ldap_domain: Optional[str] = None,
        ldap_auth_method: Optional[str] = None,
        ldap_skip_tls_verify: Optional[bool] = None,
        require_group_membership: Optional[bool] = None,
        required_groups: Optional[List[str]] = None,
        updated_by: Optional[str] = None
    ) -> ADConfiguration:
        """Update AD configuration."""
        config = await self.get_or_create_config()
        
        if ldap_enabled is not None:
            config.ldap_enabled = ldap_enabled
        if ldap_server is not None:
            config.ldap_server = ldap_server
        if ldap_port is not None:
            config.ldap_port = ldap_port
        if ldap_use_ssl is not None:
            config.ldap_use_ssl = ldap_use_ssl
        if ldap_base_dn is not None:
            config.ldap_base_dn = ldap_base_dn
        if ldap_domain is not None:
            config.ldap_domain = ldap_domain
        if ldap_auth_method is not None:
            config.ldap_auth_method = ldap_auth_method
        if ldap_skip_tls_verify is not None:
            config.ldap_skip_tls_verify = ldap_skip_tls_verify
        if require_group_membership is not None:
            config.require_group_membership = require_group_membership
        if required_groups is not None:
            config.required_groups = required_groups
        if updated_by:
            config.updated_by = updated_by
        
        config.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(config)
        return config
    
    # ============ Service Account Management ============
    
    async def set_service_account(
        self,
        username: str,
        password: str,
        updated_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Set and validate service account credentials."""
        config = await self.get_or_create_config()
        
        # Test the credentials first
        test_result = await self.test_service_credentials(username, password)
        
        if not test_result["success"]:
            return {
                "success": False,
                "error": test_result.get("error", "Invalid credentials")
            }
        
        # Encrypt and store
        config.service_account_username = username
        config.service_account_password_encrypted = self._encrypt_password(password)
        config.service_account_valid = True
        config.service_account_last_validated = datetime.utcnow()
        config.updated_by = updated_by
        config.updated_at = datetime.utcnow()
        
        # Auto-populate LDAP settings from the connection if not already set
        if test_result.get("server_info"):
            if not config.ldap_server:
                config.ldap_server = test_result["server_info"].get("server")
            if not config.ldap_base_dn:
                config.ldap_base_dn = test_result["server_info"].get("base_dn")
        
        await self.db.commit()
        await self.db.refresh(config)
        
        return {
            "success": True,
            "message": "Service account credentials saved and validated",
            "server_info": test_result.get("server_info")
        }
    
    async def get_service_credentials(self) -> Optional[Dict[str, str]]:
        """Get decrypted service account credentials."""
        config = await self.get_config()
        if not config or not config.service_account_username:
            return None
        
        try:
            password = self._decrypt_password(config.service_account_password_encrypted)
            return {
                "username": config.service_account_username,
                "password": password
            }
        except Exception as e:
            logger.error(f"Failed to decrypt service account password: {e}")
            return None
    
    async def clear_service_account(self, updated_by: Optional[str] = None) -> bool:
        """Clear service account credentials."""
        config = await self.get_config()
        if config:
            config.service_account_username = None
            config.service_account_password_encrypted = None
            config.service_account_valid = False
            config.service_account_last_validated = None
            config.updated_by = updated_by
            await self.db.commit()
            return True
        return False
    
    async def test_service_credentials(
        self,
        username: str,
        password: str
    ) -> Dict[str, Any]:
        """Test service account credentials against AD."""
        config = await self.get_config()
        ldap_server = config.ldap_server if config else settings.ldap_server
        ldap_base_dn = config.ldap_base_dn if config else settings.ldap_base_dn
        ldap_domain = config.ldap_domain if config else settings.ldap_domain
        use_ssl = config.ldap_use_ssl if config else False
        skip_tls = config.ldap_skip_tls_verify if config else settings.ldap_skip_tls_verify
        
        if not ldap_server:
            return {"success": False, "error": "LDAP server not configured"}
        
        try:
            # Configure TLS
            tls_config = None
            if use_ssl or ldap_server.startswith("ldaps://"):
                tls_config = Tls(
                    validate=ssl.CERT_NONE if skip_tls else ssl.CERT_REQUIRED
                )
            
            server = Server(
                ldap_server,
                get_info=ALL,
                use_ssl=use_ssl or ldap_server.startswith("ldaps://"),
                tls=tls_config,
                connect_timeout=10
            )
            
            # Format bind user
            bind_user = username
            if ldap_domain and "\\" not in username and "@" not in username:
                bind_user = f"{ldap_domain}\\{username}"
            
            conn = Connection(
                server,
                user=bind_user,
                password=password,
                auto_bind=True,
                auto_referrals=False
            )
            
            # Get server info
            server_info = {
                "server": ldap_server,
                "base_dn": ldap_base_dn
            }
            
            # Try to detect base DN from server if not set
            if not ldap_base_dn and server.info:
                naming_contexts = server.info.naming_contexts
                if naming_contexts:
                    server_info["base_dn"] = naming_contexts[0]
            
            conn.unbind()
            
            return {
                "success": True,
                "message": "Credentials validated successfully",
                "server_info": server_info
            }
            
        except LDAPSocketOpenError as e:
            return {"success": False, "error": f"Cannot connect to server: {str(e)}"}
        except LDAPBindError as e:
            return {"success": False, "error": "Invalid username or password"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    # ============ Local Admin Management ============
    
    async def set_local_admin_enabled(self, enabled: bool, updated_by: Optional[str] = None) -> bool:
        """Enable or disable local admin login."""
        config = await self.get_or_create_config()
        config.local_admin_enabled = enabled
        config.updated_by = updated_by
        await self.db.commit()
        return enabled
    
    async def is_local_admin_enabled(self) -> bool:
        """Check if local admin is enabled."""
        config = await self.get_config()
        if config:
            return config.local_admin_enabled
        return settings.local_admin_enabled
    
    async def set_local_admin_password(
        self,
        new_password: str,
        updated_by: Optional[str] = None
    ) -> bool:
        """Set a new local admin password."""
        config = await self.get_or_create_config()
        config.local_admin_password_hash = pwd_context.hash(new_password)
        config.updated_by = updated_by
        await self.db.commit()
        return True
    
    async def verify_local_admin(self, username: str, password: str) -> bool:
        """Verify local admin credentials."""
        config = await self.get_config()
        
        # Debug logging
        logger.info(f"Local admin login attempt - username: {username}, config_exists: {config is not None}")
        if config:
            logger.info(f"Config: enabled={config.local_admin_enabled}, username={config.local_admin_username}, has_hash={config.local_admin_password_hash is not None}")
        
        # Check if local admin is enabled
        if config and not config.local_admin_enabled:
            logger.info("Local admin is disabled in config")
            return False
        
        # Check username (case-insensitive)
        local_username = config.local_admin_username if config else settings.local_admin_username
        if username.lower() != local_username.lower():
            logger.info(f"Username mismatch: got '{username}', expected '{local_username}'")
            return False
        
        # Check password (from DB hash or config)
        if config and config.local_admin_password_hash:
            result = pwd_context.verify(password, config.local_admin_password_hash)
            logger.info(f"Verifying against hash: {result}")
            return result
        else:
            result = password == settings.local_admin_password
            logger.info(f"Verifying against settings password: {result}")
            return result
    
    # ============ Role Mapping Management ============
    
    async def get_role_mappings(self) -> List[ADRoleMapping]:
        """Get all role mappings."""
        config = await self.get_config()
        if not config:
            return []
        
        result = await self.db.execute(
            select(ADRoleMapping)
            .where(ADRoleMapping.ad_config_id == config.id)
            .order_by(ADRoleMapping.priority, ADRoleMapping.ad_group_name)
        )
        return list(result.scalars().all())
    
    async def add_role_mapping(
        self,
        ad_group_name: str,
        application_role: str,
        ad_group_dn: Optional[str] = None,
        priority: int = 100,
        created_by: Optional[str] = None
    ) -> ADRoleMapping:
        """Add a new role mapping."""
        config = await self.get_or_create_config()
        
        mapping = ADRoleMapping(
            ad_config_id=config.id,
            ad_group_name=ad_group_name,
            ad_group_dn=ad_group_dn,
            application_role=application_role.lower(),  # Always store roles in lowercase
            priority=priority,
            created_by=created_by
        )
        self.db.add(mapping)
        await self.db.commit()
        await self.db.refresh(mapping)
        return mapping
    
    async def update_role_mapping(
        self,
        mapping_id: int,
        ad_group_name: Optional[str] = None,
        application_role: Optional[str] = None,
        priority: Optional[int] = None
    ) -> Optional[ADRoleMapping]:
        """Update an existing role mapping."""
        result = await self.db.execute(
            select(ADRoleMapping).where(ADRoleMapping.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        
        if not mapping:
            return None
        
        if ad_group_name is not None:
            mapping.ad_group_name = ad_group_name
        if application_role is not None:
            mapping.application_role = application_role.lower()  # Always store roles in lowercase
        if priority is not None:
            mapping.priority = priority
        
        await self.db.commit()
        await self.db.refresh(mapping)
        return mapping
    
    async def delete_role_mapping(self, mapping_id: int) -> bool:
        """Delete a role mapping."""
        result = await self.db.execute(
            select(ADRoleMapping).where(ADRoleMapping.id == mapping_id)
        )
        mapping = result.scalar_one_or_none()
        
        if mapping:
            await self.db.delete(mapping)
            await self.db.commit()
            return True
        return False
    
    # Role hierarchy - higher index = more privileges
    ROLE_HIERARCHY = [
        'viewer',
        'auditor', 
        'reviewer',
        'professional_services',
        'approver',
        'sales',
        'admin'
    ]
    
    def _get_role_level(self, role: str) -> int:
        """Get the privilege level of a role (higher = more privileges)."""
        try:
            return self.ROLE_HIERARCHY.index(role.lower())
        except ValueError:
            return 0  # Unknown roles default to lowest level
    
    async def get_all_roles_for_groups(self, groups: List[str]) -> List[str]:
        """
        Get ALL matched roles for a user's AD group memberships.
        Used for additive permissions (e.g., admin + sales gets both sets of permissions).
        """
        mappings = await self.get_role_mappings()
        
        if not mappings:
            # Fallback to default - just return the single default role
            return [self._default_role_mapping(groups)]
        
        groups_lower = [g.lower() for g in groups]
        matched_roles = set()
        
        # Collect all matching roles from user's group memberships
        for mapping in mappings:
            if mapping.ad_group_name.lower() in groups_lower:
                matched_roles.add(mapping.application_role.lower())
        
        if not matched_roles:
            return ["viewer"]  # Default role if no matches
        
        return list(matched_roles)
    
    async def get_role_for_groups(self, groups: List[str]) -> str:
        """
        Determine primary application role from AD group memberships.
        Returns the HIGHEST privilege role for general access control.
        For additive permissions, use get_all_roles_for_groups().
        """
        all_roles = await self.get_all_roles_for_groups(groups)
        
        if not all_roles:
            return "viewer"
        
        # Return the highest privilege role (ensure lowercase)
        highest_role = max(all_roles, key=lambda r: self._get_role_level(r))
        return highest_role.lower()
    
    def _default_role_mapping(self, groups: List[str]) -> str:
        """Default role mapping when no custom mappings exist."""
        admin_groups = settings.ldap_admin_groups_list
        
        if any(group in groups for group in admin_groups):
            return "admin"
        elif any("sales" in group.lower() for group in groups):
            return "sales"
        elif any("approver" in group.lower() for group in groups):
            return "approver"
        elif any("professional" in group.lower() or "ps" in group.lower() for group in groups):
            return "professional_services"
        elif any("reviewer" in group.lower() for group in groups):
            return "reviewer"
        elif any("auditor" in group.lower() for group in groups):
            return "auditor"
        else:
            return "viewer"
    
    # ============ AD Group Querying ============
    
    async def query_ad_groups(
        self,
        search_filter: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Query AD groups using service account."""
        creds = await self.get_service_credentials()
        if not creds:
            raise ValueError("Service account not configured")
        
        config = await self.get_config()
        if not config or not config.ldap_server:
            raise ValueError("LDAP server not configured")
        
        try:
            tls_config = None
            if config.ldap_use_ssl or config.ldap_server.startswith("ldaps://"):
                tls_config = Tls(
                    validate=ssl.CERT_NONE if config.ldap_skip_tls_verify else ssl.CERT_REQUIRED
                )
            
            server = Server(
                config.ldap_server,
                get_info=ALL,
                use_ssl=config.ldap_use_ssl or config.ldap_server.startswith("ldaps://"),
                tls=tls_config
            )
            
            bind_user = creds["username"]
            if config.ldap_domain and "\\" not in bind_user and "@" not in bind_user:
                bind_user = f"{config.ldap_domain}\\{bind_user}"
            
            conn = Connection(
                server,
                user=bind_user,
                password=creds["password"],
                auto_bind=True,
                auto_referrals=False
            )
            
            # Build search filter
            if search_filter:
                ldap_filter = f"(&(objectClass=group)(cn=*{search_filter}*))"
            else:
                ldap_filter = "(objectClass=group)"
            
            conn.search(
                search_base=config.ldap_base_dn,
                search_filter=ldap_filter,
                search_scope=SUBTREE,
                attributes=["cn", "distinguishedName", "description", "member"],
                size_limit=limit
            )
            
            groups = []
            for entry in conn.entries:
                member_list = list(entry.member) if hasattr(entry, "member") else []
                groups.append({
                    "cn": str(entry.cn) if hasattr(entry, "cn") else "",
                    "dn": str(entry.distinguishedName) if hasattr(entry, "distinguishedName") else "",
                    "description": str(entry.description) if hasattr(entry, "description") else "",
                    "member_count": len(member_list)
                })
            
            conn.unbind()
            return groups
            
        except Exception as e:
            logger.error(f"Failed to query AD groups: {e}")
            raise
    
    async def sync_group_cache(self, search_filter: Optional[str] = None) -> int:
        """Sync AD groups to local cache."""
        try:
            groups = await self.query_ad_groups(search_filter, limit=1000)
            
            # Clear existing cache (optionally filtered)
            if search_filter:
                # Partial sync - just update matching groups
                pass
            else:
                # Full sync - clear all
                await self.db.execute(delete(ADGroupCache))
            
            # Insert new groups
            for group in groups:
                cache_entry = ADGroupCache(
                    group_cn=group["cn"],
                    group_dn=group["dn"],
                    group_description=group.get("description"),
                    member_count=group.get("member_count"),
                    last_synced=datetime.utcnow()
                )
                self.db.add(cache_entry)
            
            await self.db.commit()
            return len(groups)
            
        except Exception as e:
            logger.error(f"Failed to sync group cache: {e}")
            raise
    
    async def get_cached_groups(self, search: Optional[str] = None) -> List[ADGroupCache]:
        """Get groups from cache."""
        query = select(ADGroupCache)
        if search:
            query = query.where(ADGroupCache.group_cn.ilike(f"%{search}%"))
        query = query.order_by(ADGroupCache.group_cn).limit(100)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    # ============ User Sync ============
    
    async def sync_user_groups(self, user_id: int, username: str) -> Optional[ADUserSync]:
        """Sync a user's AD group memberships."""
        creds = await self.get_service_credentials()
        if not creds:
            return None
        
        config = await self.get_config()
        if not config:
            return None
        
        try:
            tls_config = None
            if config.ldap_use_ssl or config.ldap_server.startswith("ldaps://"):
                tls_config = Tls(
                    validate=ssl.CERT_NONE if config.ldap_skip_tls_verify else ssl.CERT_REQUIRED
                )
            
            server = Server(
                config.ldap_server,
                get_info=ALL,
                use_ssl=config.ldap_use_ssl or config.ldap_server.startswith("ldaps://"),
                tls=tls_config
            )
            
            bind_user = creds["username"]
            if config.ldap_domain and "\\" not in bind_user and "@" not in bind_user:
                bind_user = f"{config.ldap_domain}\\{bind_user}"
            
            conn = Connection(
                server,
                user=bind_user,
                password=creds["password"],
                auto_bind=True,
                auto_referrals=False
            )
            
            # Search for user
            conn.search(
                search_base=config.ldap_base_dn,
                search_filter=f"(sAMAccountName={username})",
                search_scope=SUBTREE,
                attributes=["distinguishedName", "memberOf"]
            )
            
            if not conn.entries:
                conn.unbind()
                return None
            
            entry = conn.entries[0]
            dn = str(entry.distinguishedName) if hasattr(entry, "distinguishedName") else ""
            groups_raw = list(entry.memberOf) if hasattr(entry, "memberOf") else []
            
            # Extract group CNs
            groups = []
            for group_dn in groups_raw:
                parts = group_dn.split(",")
                for part in parts:
                    if part.upper().startswith("CN="):
                        groups.append(part[3:])
                        break
            
            conn.unbind()
            
            # Update or create sync record
            result = await self.db.execute(
                select(ADUserSync).where(ADUserSync.user_id == user_id)
            )
            sync = result.scalar_one_or_none()
            
            if sync:
                sync.ad_distinguished_name = dn
                sync.ad_groups = groups
                sync.last_synced = datetime.utcnow()
                sync.sync_status = "synced"
                sync.sync_error = None
            else:
                sync = ADUserSync(
                    user_id=user_id,
                    ad_username=username,
                    ad_distinguished_name=dn,
                    ad_groups=groups,
                    last_synced=datetime.utcnow(),
                    sync_status="synced"
                )
                self.db.add(sync)
            
            # Also update user's role based on new groups
            user_result = await self.db.execute(select(User).where(User.id == user_id))
            user = user_result.scalar_one_or_none()
            if user:
                new_role = await self.get_role_for_groups(groups)
                user.role = UserRole(new_role)
                user.ad_groups = groups
            
            await self.db.commit()
            await self.db.refresh(sync)
            return sync
            
        except Exception as e:
            logger.error(f"Failed to sync user groups: {e}")
            # Record the error
            result = await self.db.execute(
                select(ADUserSync).where(ADUserSync.user_id == user_id)
            )
            sync = result.scalar_one_or_none()
            if sync:
                sync.sync_status = "error"
                sync.sync_error = str(e)
                await self.db.commit()
            return None
    
    async def sync_all_users(self) -> Dict[str, int]:
        """Sync all AD users' group memberships."""
        result = await self.db.execute(
            select(User).where(User.is_ad_user == True, User.is_active == True)
        )
        users = list(result.scalars().all())
        
        synced = 0
        errors = 0
        
        for user in users:
            sync_result = await self.sync_user_groups(user.id, user.username)
            if sync_result and sync_result.sync_status == "synced":
                synced += 1
            else:
                errors += 1
        
        return {"synced": synced, "errors": errors, "total": len(users)}
    
    async def import_users_from_groups(self) -> Dict[str, int]:
        """
        Import users from AD groups that have role mappings.
        Queries each mapped group and creates user records for members.
        """
        config = await self.get_config()
        if not config or not config.ldap_enabled:
            raise ValueError("LDAP not enabled")
        
        creds = await self.get_service_credentials()
        if not creds:
            raise ValueError("Service account not configured")
        
        mappings = await self.get_role_mappings()
        if not mappings:
            raise ValueError("No role mappings configured")
        
        imported = 0
        updated = 0
        errors = 0
        skipped = 0
        
        try:
            tls_config = None
            if config.ldap_use_ssl or config.ldap_server.startswith("ldaps://"):
                tls_config = Tls(
                    validate=ssl.CERT_NONE if config.ldap_skip_tls_verify else ssl.CERT_REQUIRED
                )
            
            server = Server(
                config.ldap_server,
                get_info=ALL,
                use_ssl=config.ldap_use_ssl or config.ldap_server.startswith("ldaps://"),
                tls=tls_config
            )
            
            bind_user = creds["username"]
            if config.ldap_domain and "\\" not in bind_user and "@" not in bind_user:
                bind_user = f"{config.ldap_domain}\\{bind_user}"
            
            conn = Connection(
                server,
                user=bind_user,
                password=creds["password"],
                auto_bind=True,
                auto_referrals=False
            )
            
            # Track all users and their highest-priority group membership
            user_groups: Dict[str, list] = {}  # username -> list of groups
            
            for mapping in mappings:
                group_name = mapping.ad_group_name
                
                # Search for the group and get its members
                group_filter = f"(&(objectClass=group)(cn={group_name}))"
                conn.search(
                    search_base=config.ldap_base_dn,
                    search_filter=group_filter,
                    search_scope=SUBTREE,
                    attributes=["member", "distinguishedName"]
                )
                
                if not conn.entries:
                    logger.warning(f"Group not found: {group_name}")
                    continue
                
                group_entry = conn.entries[0]
                members = list(group_entry.member) if hasattr(group_entry, "member") else []
                
                # For each member DN, get user info
                for member_dn in members:
                    try:
                        # Query the user
                        conn.search(
                            search_base=member_dn,
                            search_filter="(objectClass=user)",
                            search_scope=SUBTREE,
                            attributes=["sAMAccountName", "displayName", "mail", "distinguishedName", "memberOf", "userPrincipalName"]
                        )
                        
                        if not conn.entries:
                            continue
                        
                        user_entry = conn.entries[0]
                        username = str(user_entry.sAMAccountName) if hasattr(user_entry, "sAMAccountName") else None
                        
                        if not username:
                            continue
                        
                        # Track this user's group membership
                        if username not in user_groups:
                            user_groups[username] = {
                                "display_name": str(user_entry.displayName) if hasattr(user_entry, "displayName") else username,
                                "email": str(user_entry.mail) if hasattr(user_entry, "mail") else None,
                                "dn": str(user_entry.distinguishedName) if hasattr(user_entry, "distinguishedName") else member_dn,
                                "groups": []
                            }
                        
                        # Add this group to the user's list
                        if group_name not in user_groups[username]["groups"]:
                            user_groups[username]["groups"].append(group_name)
                        
                        # Also extract all group memberships from memberOf
                        member_of = list(user_entry.memberOf) if hasattr(user_entry, "memberOf") else []
                        for group_dn in member_of:
                            parts = group_dn.split(",")
                            for part in parts:
                                if part.upper().startswith("CN="):
                                    gn = part[3:]
                                    if gn not in user_groups[username]["groups"]:
                                        user_groups[username]["groups"].append(gn)
                                    break
                                    
                    except Exception as e:
                        logger.error(f"Error processing member {member_dn}: {e}")
                        errors += 1
                        continue
            
            conn.unbind()
            
            # Now create/update users in the database
            for username, user_info in user_groups.items():
                try:
                    # Check if user already exists
                    result = await self.db.execute(
                        select(User).where(User.username == username)
                    )
                    existing_user = result.scalar_one_or_none()
                    
                    # Determine role from groups
                    role = await self.get_role_for_groups(user_info["groups"])
                    
                    if existing_user:
                        # Update existing user
                        existing_user.email = user_info["email"] if user_info["email"] else existing_user.email
                        existing_user.full_name = user_info["display_name"]
                        existing_user.role = UserRole(role)
                        existing_user.ad_groups = user_info["groups"]
                        existing_user.ad_distinguished_name = user_info["dn"]
                        existing_user.is_ad_user = True
                        existing_user.is_active = True
                        updated += 1
                    else:
                        # Create new user
                        new_user = User(
                            username=username,
                            email=user_info["email"],
                            full_name=user_info["display_name"],
                            role=UserRole(role),
                            is_ad_user=True,
                            ad_distinguished_name=user_info["dn"],
                            ad_groups=user_info["groups"],
                            is_active=True
                        )
                        self.db.add(new_user)
                        imported += 1
                        
                except Exception as e:
                    logger.error(f"Error creating/updating user {username}: {e}")
                    errors += 1
            
            await self.db.commit()
            
        except Exception as e:
            logger.error(f"Failed to import users from groups: {e}")
            raise
        
        return {
            "imported": imported,
            "updated": updated,
            "errors": errors,
            "total": imported + updated
        }
