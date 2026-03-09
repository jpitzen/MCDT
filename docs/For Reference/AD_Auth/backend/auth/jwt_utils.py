"""
JWT Token Utilities for AD-authenticated users.
Reference: AD-Integration.md
"""
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from app.config import get_settings

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_v1_prefix}/auth/login")


class CurrentUser(BaseModel):
    """Current authenticated user from JWT."""
    user_id: Optional[int] = None
    username: str
    display_name: str
    email: Optional[str] = None
    groups: List[str] = []
    role: str = "viewer"  # Primary role (highest privilege for general access)
    all_roles: List[str] = []  # All matched roles for additive permissions
    
    def has_group(self, group_name: str) -> bool:
        """Check if user is member of a group (case-insensitive)."""
        return group_name.lower() in [g.lower() for g in self.groups]
    
    def has_any_group(self, group_names: List[str]) -> bool:
        """Check if user is member of any of the specified groups."""
        user_groups_lower = [g.lower() for g in self.groups]
        return any(g.lower() in user_groups_lower for g in group_names)
    
    def has_role(self, role_name: str) -> bool:
        """Check if user has a specific role (checks all_roles for additive permissions)."""
        if self.role == role_name:
            return True
        return role_name.lower() in [r.lower() for r in self.all_roles]
    
    def has_any_role(self, role_names: List[str]) -> bool:
        """Check if user has any of the specified roles."""
        for role_name in role_names:
            if self.has_role(role_name):
                return True
        return False
    
    def is_admin(self) -> bool:
        """Check if user has admin role."""
        return self.role == "admin" or self.has_any_group(settings.ldap_admin_groups_list)
    
    def is_professional_services(self) -> bool:
        """Check if user has professional services role."""
        return self.has_role("professional_services") or self.is_admin()
    
    def is_sales(self) -> bool:
        """Check if user has sales role (full ZL Licensing access)."""
        # Sales is a SPECIFIC role - admin does NOT automatically get it
        return self.has_role("sales")
    
    def is_approver(self) -> bool:
        """Check if user has approver role."""
        # Approver is a SPECIFIC role - admin does NOT automatically get it
        return self.has_role("approver")
    
    def can_edit_config(self) -> bool:
        """Check if user can edit configuration cards."""
        return self.has_any_role(["admin", "professional_services"])
    
    def can_edit_quotes(self) -> bool:
        """Check if user can edit existing quotes."""
        return self.has_any_role(["admin", "professional_services", "sales"])
    
    def can_access_zl_licensing(self) -> bool:
        """
        Check if user has any access to ZL Licensing modal.
        NOTE: Admin does NOT get access unless also in sales/approver group.
        ZL Licensing is a sales-specific feature.
        """
        return self.has_any_role(["sales", "approver"])
    
    def can_edit_zl_licensing(self) -> bool:
        """
        Check if user has full edit access to ZL Licensing.
        Only sales role can edit - approver is view-only.
        """
        return self.has_role("sales")
    
    def can_approve_quotes(self) -> bool:
        """Check if user can approve/deny quotes."""
        return self.has_any_role(["admin", "approver"])


class TokenData(BaseModel):
    username: str
    user_id: Optional[int] = None
    display_name: str
    email: Optional[str] = None
    groups: List[str] = []
    role: str = "viewer"  # Primary role (highest privilege)
    all_roles: List[str] = []  # All matched roles for additive permissions
    exp: datetime
    type: str = "access"


def create_access_token(
    username: str,
    display_name: str,
    email: Optional[str],
    groups: List[str],
    role: str = "viewer",
    all_roles: List[str] = None,
    user_id: Optional[int] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token with user info and AD groups.
    
    Args:
        role: Primary role (highest privilege level for general access)
        all_roles: All matched roles for additive permissions (e.g., admin + sales)
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    
    # Ensure all_roles includes at least the primary role
    if all_roles is None:
        all_roles = [role]
    elif role not in all_roles:
        all_roles = [role] + all_roles
    
    payload = {
        "sub": username,
        "user_id": user_id,
        "display_name": display_name,
        "email": email,
        "groups": groups,
        "role": role,
        "all_roles": all_roles,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    
    encoded_jwt = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(
    username: str,
    user_id: Optional[int] = None,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT refresh token."""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    
    payload = {
        "sub": username,
        "user_id": user_id,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    
    encoded_jwt = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and validate JWT token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        return payload
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> CurrentUser:
    """Dependency to extract and validate current user from JWT."""
    payload = decode_token(token)
    
    username = payload.get("sub")
    if not username:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    role = payload.get("role", "viewer")
    all_roles = payload.get("all_roles", [role])
    
    return CurrentUser(
        user_id=payload.get("user_id"),
        username=username,
        display_name=payload.get("display_name", username),
        email=payload.get("email"),
        groups=payload.get("groups", []),
        role=role,
        all_roles=all_roles
    )


async def get_current_active_user(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to ensure user is active."""
    # Could add additional checks here (e.g., check database for is_active)
    return current_user


def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require admin role."""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_professional_services(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require professional services or admin role."""
    if not current_user.can_edit_config():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Professional Services access required"
        )
    return current_user


def require_sales(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require sales or admin role."""
    if not current_user.is_sales():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sales access required"
        )
    return current_user


def require_approver(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require approver or admin role."""
    if not current_user.can_approve_quotes():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Approver access required"
        )
    return current_user


def require_zl_licensing_access(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require ZL Licensing access (view or edit)."""
    if not current_user.can_access_zl_licensing():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ZL Licensing access required"
        )
    return current_user


def require_zl_licensing_edit(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require ZL Licensing edit access (sales or admin)."""
    if not current_user.can_edit_zl_licensing():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ZL Licensing edit access required (Sales role)"
        )
    return current_user


def require_quote_edit(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Dependency to require quote edit access."""
    if not current_user.can_edit_quotes():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Quote edit access required"
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """Dependency factory for role-based authorization."""
    async def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles and not current_user.is_admin():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {allowed_roles}"
            )
        return current_user
    return role_checker


def require_groups(required_groups: List[str], require_all: bool = False):
    """Dependency factory for group-based authorization."""
    async def group_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        user_groups_lower = [g.lower() for g in current_user.groups]
        required_lower = [g.lower() for g in required_groups]
        
        if require_all:
            has_access = all(g in user_groups_lower for g in required_lower)
        else:
            has_access = any(g in user_groups_lower for g in required_lower)
        
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required group membership: {required_groups}"
            )
        
        return current_user
    
    return group_checker
