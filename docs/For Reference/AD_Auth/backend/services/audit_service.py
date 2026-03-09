"""
Audit Service - Centralized audit logging for all security-relevant events.

Events Audited:
---------------
AUTHENTICATION:
  - LOGIN_SUCCESS (INFO): Successful user login
  - LOGIN_FAILURE (WARNING): Failed login attempt
  - LOGOUT (INFO): User logout
  - TOKEN_REFRESH (INFO): Token refreshed
  - SESSION_EXPIRED (INFO): Session expired

USER MANAGEMENT:
  - USER_CREATE (INFO): New user created
  - USER_UPDATE (INFO): User details modified
  - USER_DELETE (WARNING): User deleted
  - USER_ROLE_CHANGE (WARNING): User role changed
  - USER_ACTIVATE (INFO): User activated
  - USER_DEACTIVATE (WARNING): User deactivated

QUOTE OPERATIONS:
  - QUOTE_CREATE (INFO): New quote created
  - QUOTE_UPDATE (INFO): Quote modified
  - QUOTE_DELETE (WARNING): Quote deleted
  - QUOTE_DUPLICATE (INFO): Quote duplicated
  - QUOTE_CALCULATE (INFO): Quote calculation performed
  - QUOTE_EXPORT (INFO): Quote exported (Word/Excel)
  - QUOTE_STATUS_CHANGE (INFO): Quote status changed

SETTINGS:
  - SETTINGS_UPDATE (WARNING): Application settings changed
  - AD_CONFIG_UPDATE (CRITICAL): AD/LDAP configuration changed
  - BRANDING_UPDATE (INFO): Branding assets changed
  - ROLE_MAPPING_UPDATE (WARNING): AD role mappings changed

SYSTEM:
  - PRICING_REFRESH (INFO): Pricing data refreshed
  - DATA_EXPORT (WARNING): Bulk data export

Severity Levels:
----------------
  - INFO: Normal operations, for compliance tracking
  - WARNING: Security-sensitive operations, requires attention
  - CRITICAL: High-risk operations, immediate review recommended
"""

from enum import Enum
from datetime import datetime
from typing import Optional, Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Request

from app.models.config import AuditLog
from app.models.user import User


class AuditAction(str, Enum):
    """All auditable actions with their default severities."""
    # Authentication
    LOGIN_SUCCESS = "LOGIN_SUCCESS"
    LOGIN_FAILURE = "LOGIN_FAILURE"
    LOGOUT = "LOGOUT"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    SESSION_EXPIRED = "SESSION_EXPIRED"
    
    # User Management
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"
    USER_ROLE_CHANGE = "USER_ROLE_CHANGE"
    USER_ACTIVATE = "USER_ACTIVATE"
    USER_DEACTIVATE = "USER_DEACTIVATE"
    
    # Quote Operations
    QUOTE_CREATE = "QUOTE_CREATE"
    QUOTE_UPDATE = "QUOTE_UPDATE"
    QUOTE_DELETE = "QUOTE_DELETE"
    QUOTE_DUPLICATE = "QUOTE_DUPLICATE"
    QUOTE_CALCULATE = "QUOTE_CALCULATE"
    QUOTE_EXPORT = "QUOTE_EXPORT"
    QUOTE_STATUS_CHANGE = "QUOTE_STATUS_CHANGE"
    
    # Settings
    SETTINGS_UPDATE = "SETTINGS_UPDATE"
    AD_CONFIG_UPDATE = "AD_CONFIG_UPDATE"
    BRANDING_UPDATE = "BRANDING_UPDATE"
    ROLE_MAPPING_CREATE = "ROLE_MAPPING_CREATE"
    ROLE_MAPPING_UPDATE = "ROLE_MAPPING_UPDATE"
    ROLE_MAPPING_DELETE = "ROLE_MAPPING_DELETE"
    
    # System
    PRICING_REFRESH = "PRICING_REFRESH"
    DATA_EXPORT = "DATA_EXPORT"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AuditResourceType(str, Enum):
    """Resource types being audited."""
    AUTH = "auth"
    USER = "user"
    QUOTE = "quote"
    SETTINGS = "settings"
    AD_CONFIG = "ad_config"
    BRANDING = "branding"
    PRICING = "pricing"
    SYSTEM = "system"


# Action to severity mapping
ACTION_SEVERITY: Dict[AuditAction, AuditSeverity] = {
    # Authentication
    AuditAction.LOGIN_SUCCESS: AuditSeverity.INFO,
    AuditAction.LOGIN_FAILURE: AuditSeverity.WARNING,
    AuditAction.LOGOUT: AuditSeverity.INFO,
    AuditAction.TOKEN_REFRESH: AuditSeverity.INFO,
    AuditAction.SESSION_EXPIRED: AuditSeverity.INFO,
    
    # User Management
    AuditAction.USER_CREATE: AuditSeverity.INFO,
    AuditAction.USER_UPDATE: AuditSeverity.INFO,
    AuditAction.USER_DELETE: AuditSeverity.WARNING,
    AuditAction.USER_ROLE_CHANGE: AuditSeverity.WARNING,
    AuditAction.USER_ACTIVATE: AuditSeverity.INFO,
    AuditAction.USER_DEACTIVATE: AuditSeverity.WARNING,
    
    # Quote Operations
    AuditAction.QUOTE_CREATE: AuditSeverity.INFO,
    AuditAction.QUOTE_UPDATE: AuditSeverity.INFO,
    AuditAction.QUOTE_DELETE: AuditSeverity.WARNING,
    AuditAction.QUOTE_DUPLICATE: AuditSeverity.INFO,
    AuditAction.QUOTE_CALCULATE: AuditSeverity.INFO,
    AuditAction.QUOTE_EXPORT: AuditSeverity.INFO,
    AuditAction.QUOTE_STATUS_CHANGE: AuditSeverity.INFO,
    
    # Settings
    AuditAction.SETTINGS_UPDATE: AuditSeverity.WARNING,
    AuditAction.AD_CONFIG_UPDATE: AuditSeverity.CRITICAL,
    AuditAction.BRANDING_UPDATE: AuditSeverity.INFO,
    AuditAction.ROLE_MAPPING_CREATE: AuditSeverity.WARNING,
    AuditAction.ROLE_MAPPING_UPDATE: AuditSeverity.WARNING,
    AuditAction.ROLE_MAPPING_DELETE: AuditSeverity.WARNING,
    
    # System
    AuditAction.PRICING_REFRESH: AuditSeverity.INFO,
    AuditAction.DATA_EXPORT: AuditSeverity.WARNING,
}

# Action to resource type mapping
ACTION_RESOURCE_TYPE: Dict[AuditAction, AuditResourceType] = {
    # Authentication
    AuditAction.LOGIN_SUCCESS: AuditResourceType.AUTH,
    AuditAction.LOGIN_FAILURE: AuditResourceType.AUTH,
    AuditAction.LOGOUT: AuditResourceType.AUTH,
    AuditAction.TOKEN_REFRESH: AuditResourceType.AUTH,
    AuditAction.SESSION_EXPIRED: AuditResourceType.AUTH,
    
    # User Management
    AuditAction.USER_CREATE: AuditResourceType.USER,
    AuditAction.USER_UPDATE: AuditResourceType.USER,
    AuditAction.USER_DELETE: AuditResourceType.USER,
    AuditAction.USER_ROLE_CHANGE: AuditResourceType.USER,
    AuditAction.USER_ACTIVATE: AuditResourceType.USER,
    AuditAction.USER_DEACTIVATE: AuditResourceType.USER,
    
    # Quote Operations
    AuditAction.QUOTE_CREATE: AuditResourceType.QUOTE,
    AuditAction.QUOTE_UPDATE: AuditResourceType.QUOTE,
    AuditAction.QUOTE_DELETE: AuditResourceType.QUOTE,
    AuditAction.QUOTE_DUPLICATE: AuditResourceType.QUOTE,
    AuditAction.QUOTE_CALCULATE: AuditResourceType.QUOTE,
    AuditAction.QUOTE_EXPORT: AuditResourceType.QUOTE,
    AuditAction.QUOTE_STATUS_CHANGE: AuditResourceType.QUOTE,
    
    # Settings
    AuditAction.SETTINGS_UPDATE: AuditResourceType.SETTINGS,
    AuditAction.AD_CONFIG_UPDATE: AuditResourceType.AD_CONFIG,
    AuditAction.BRANDING_UPDATE: AuditResourceType.BRANDING,
    AuditAction.ROLE_MAPPING_CREATE: AuditResourceType.AD_CONFIG,
    AuditAction.ROLE_MAPPING_UPDATE: AuditResourceType.AD_CONFIG,
    AuditAction.ROLE_MAPPING_DELETE: AuditResourceType.AD_CONFIG,
    
    # System
    AuditAction.PRICING_REFRESH: AuditResourceType.PRICING,
    AuditAction.DATA_EXPORT: AuditResourceType.SYSTEM,
}


class AuditService:
    """Service for creating audit log entries."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log(
        self,
        action: AuditAction,
        username: Optional[str] = None,
        user_id: Optional[int] = None,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        request: Optional[Request] = None,
        override_severity: Optional[AuditSeverity] = None
    ) -> AuditLog:
        """
        Create an audit log entry.
        
        Args:
            action: The action being audited
            username: Username of the user performing the action
            user_id: Database ID of the user (if available)
            resource_id: ID of the resource being acted upon
            details: Additional details about the action
            request: FastAPI request object for IP/user agent
            override_severity: Override the default severity for this action
        
        Returns:
            The created AuditLog entry
        """
        severity = override_severity or ACTION_SEVERITY.get(action, AuditSeverity.INFO)
        resource_type = ACTION_RESOURCE_TYPE.get(action, AuditResourceType.SYSTEM)
        
        # Build details dict with severity
        full_details = {
            "severity": severity.value,
            **(details or {})
        }
        
        # Extract request info
        ip_address = None
        user_agent = None
        if request:
            # Get real IP from X-Forwarded-For if behind proxy
            forwarded_for = request.headers.get("X-Forwarded-For")
            if forwarded_for:
                ip_address = forwarded_for.split(",")[0].strip()
            else:
                ip_address = request.client.host if request.client else None
            user_agent = request.headers.get("User-Agent", "")[:500]
        
        # Create audit log entry
        audit_log = AuditLog(
            user_id=user_id,
            username=username,
            action=action.value,
            resource_type=resource_type.value,
            resource_id=str(resource_id) if resource_id else None,
            details=full_details,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.utcnow()
        )
        
        self.db.add(audit_log)
        await self.db.commit()
        await self.db.refresh(audit_log)
        
        return audit_log
    
    async def log_login_success(
        self,
        username: str,
        user_id: Optional[int] = None,
        role: str = None,
        auth_method: str = "ldap",
        groups: list = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a successful login."""
        return await self.log(
            action=AuditAction.LOGIN_SUCCESS,
            username=username,
            user_id=user_id,
            details={
                "role": role,
                "auth_method": auth_method,
                "groups": groups or [],
                "login_time": datetime.utcnow().isoformat()
            },
            request=request
        )
    
    async def log_login_failure(
        self,
        username: str,
        reason: str = "Invalid credentials",
        auth_method: str = "ldap",
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a failed login attempt."""
        return await self.log(
            action=AuditAction.LOGIN_FAILURE,
            username=username,
            details={
                "reason": reason,
                "auth_method": auth_method,
                "attempt_time": datetime.utcnow().isoformat()
            },
            request=request
        )
    
    async def log_logout(
        self,
        username: str,
        user_id: Optional[int] = None,
        role: str = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a user logout."""
        return await self.log(
            action=AuditAction.LOGOUT,
            username=username,
            user_id=user_id,
            details={
                "role": role,
                "logout_time": datetime.utcnow().isoformat()
            },
            request=request
        )
    
    async def log_quote_action(
        self,
        action: AuditAction,
        username: str,
        user_id: Optional[int] = None,
        quote_id: str = None,
        quote_name: str = None,
        customer_name: str = None,
        additional_details: Dict[str, Any] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a quote-related action."""
        details = {
            "quote_name": quote_name,
            "customer_name": customer_name,
            **(additional_details or {})
        }
        return await self.log(
            action=action,
            username=username,
            user_id=user_id,
            resource_id=quote_id,
            details=details,
            request=request
        )
    
    async def log_user_action(
        self,
        action: AuditAction,
        actor_username: str,
        actor_id: Optional[int] = None,
        target_username: str = None,
        target_user_id: Optional[int] = None,
        old_role: str = None,
        new_role: str = None,
        additional_details: Dict[str, Any] = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a user management action."""
        details = {
            "target_username": target_username,
            "target_user_id": target_user_id,
            **(additional_details or {})
        }
        if old_role or new_role:
            details["old_role"] = old_role
            details["new_role"] = new_role
        
        return await self.log(
            action=action,
            username=actor_username,
            user_id=actor_id,
            resource_id=str(target_user_id) if target_user_id else target_username,
            details=details,
            request=request
        )
    
    async def log_settings_change(
        self,
        action: AuditAction,
        username: str,
        user_id: Optional[int] = None,
        setting_key: str = None,
        old_value: Any = None,
        new_value: Any = None,
        request: Optional[Request] = None
    ) -> AuditLog:
        """Log a settings change."""
        details = {
            "setting_key": setting_key,
            "change_time": datetime.utcnow().isoformat()
        }
        # Don't log sensitive values
        if old_value is not None and "password" not in (setting_key or "").lower():
            details["old_value"] = str(old_value)[:200]
        if new_value is not None and "password" not in (setting_key or "").lower():
            details["new_value"] = str(new_value)[:200]
        
        return await self.log(
            action=action,
            username=username,
            user_id=user_id,
            resource_id=setting_key,
            details=details,
            request=request
        )
