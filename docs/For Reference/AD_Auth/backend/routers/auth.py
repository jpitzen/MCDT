"""
Authentication Router - Handles AD login, tokens, and user info.
Reference: AD-Integration.md
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from passlib.context import CryptContext

from app.database import get_db
from app.config import get_settings
from app.models.user import User, UserRole
from app.auth.ldap_auth import (
    authenticate_ad_user, test_ldap_connection,
    LDAPInvalidCredentials, LDAPUserNotInGroup, LDAPConnectionError, ADUser
)
from app.auth.jwt_utils import (
    create_access_token, create_refresh_token, decode_token,
    get_current_user, CurrentUser
)
from app.services.settings_service import SettingsService
from app.services.ad_config_service import ADConfigService
from app.services.ad_config_service import ADConfigService
from app.services.audit_service import AuditService, AuditAction

router = APIRouter()
settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int
    is_local_admin: bool = False


class UserInfoResponse(BaseModel):
    username: str
    display_name: str
    email: Optional[str]
    groups: list
    role: str
    all_roles: List[str] = []  # All matched roles for additive permissions
    is_admin: bool


class RefreshTokenRequest(BaseModel):
    refresh_token: str


async def authenticate_local_admin(username: str, password: str, db: AsyncSession) -> Optional[dict]:
    """Authenticate local admin account using AD config service."""
    ad_service = ADConfigService(db)
    
    # Check via AD config service (checks database first, then env vars)
    if await ad_service.verify_local_admin(username, password):
        return {
            "username": username,
            "display_name": "Local Administrator",
            "email": None,
            "groups": ["Administrators"],
            "role": "admin"
        }
    
    return None


async def map_role_from_groups(groups: list, db: AsyncSession) -> str:
    """Map AD groups to application role using database mappings."""
    ad_service = ADConfigService(db)
    return await ad_service.get_role_for_groups(groups)


async def get_all_roles_from_groups(groups: list, db: AsyncSession) -> List[str]:
    """Get ALL matched roles for additive permissions."""
    ad_service = ADConfigService(db)
    return await ad_service.get_all_roles_for_groups(groups)


async def get_or_create_ad_user(db: AsyncSession, ad_user: ADUser) -> User:
    """Sync AD user to database."""
    result = await db.execute(select(User).where(User.username == ad_user.username))
    user = result.scalar_one_or_none()
    
    role = await map_role_from_groups(ad_user.groups, db)
    role_enum = UserRole(role)
    
    if user:
        # Update existing user
        user.email = ad_user.email
        user.full_name = ad_user.display_name
        user.role = role_enum
        user.ad_groups = ad_user.groups
        user.ad_distinguished_name = ad_user.distinguished_name
        user.is_active = True
        user.last_login = datetime.utcnow()
    else:
        # Create new user
        user = User(
            username=ad_user.username,
            email=ad_user.email,
            full_name=ad_user.display_name,
            role=role_enum,
            ad_groups=ad_user.groups,
            ad_distinguished_name=ad_user.distinguished_name,
            is_ad_user=True,
            is_active=True,
            last_login=datetime.utcnow()
        )
        db.add(user)
    
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """
    Primary login endpoint.
    
    Flow:
    1. Check local admin credentials (for initial setup)
    2. If LDAP enabled, authenticate against AD
    3. Create/update user record in database
    4. Generate JWT with user info and group memberships
    """
    # Try local admin first
    local_user = await authenticate_local_admin(form_data.username, form_data.password, db)
    if local_user:
        # Check if local admin has a user record in database (for additional roles)
        result = await db.execute(select(User).where(func.lower(User.username) == form_data.username.lower()))
        db_user = result.scalar_one_or_none()
        
        # Create user record if it doesn't exist (for local admin)
        if not db_user:
            db_user = User(
                username=form_data.username,
                email=local_user["email"],
                full_name=local_user["display_name"],
                role=UserRole.ADMIN,
                is_ad_user=False,
                ad_groups=[],  # Will be used for additional roles
                is_active=True,
                last_login=datetime.utcnow()
            )
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
        else:
            # Update last login
            db_user.last_login = datetime.utcnow()
            await db.commit()
        
        # Determine all_roles: use ad_groups from DB as additional roles
        all_roles = ["admin"]  # Always include admin for local admin
        if db_user.ad_groups:
            for group in db_user.ad_groups:
                group_lower = group.lower()
                if group_lower in ["sales", "professional_services", "approver", "reviewer", "auditor", "viewer"]:
                    if group_lower not in all_roles:
                        all_roles.append(group_lower)
        
        access_token = create_access_token(
            username=local_user["username"],
            display_name=local_user["display_name"],
            email=local_user["email"],
            groups=local_user["groups"],
            role=local_user["role"],
            all_roles=all_roles,
            user_id=db_user.id
        )
        refresh_token = create_refresh_token(
            username=local_user["username"],
            user_id=db_user.id
        )
        
        # Audit log: successful local admin login
        audit_service = AuditService(db)
        await audit_service.log_login_success(
            username=local_user["username"],
            role=local_user["role"],
            auth_method="local_admin",
            groups=local_user["groups"],
            request=request
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            is_local_admin=True
        )
    
    # Check if LDAP is enabled (from ad_configurations table, fallback to env)
    ad_config_service = ADConfigService(db)
    ad_config = await ad_config_service.get_config()
    ldap_enabled = (ad_config and ad_config.ldap_enabled) or settings.ldap_enabled
    
    if not ldap_enabled:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # LDAP authentication - pass AD config for runtime settings
    try:
        ad_user = authenticate_ad_user(
            username=form_data.username,
            password=form_data.password,
            require_group=True,
            ad_config=ad_config
        )
        
        # Sync user to database
        db_user = await get_or_create_ad_user(db, ad_user)
        
        # Create JWT with all matched roles for additive permissions
        role = await map_role_from_groups(ad_user.groups, db)
        all_roles = await get_all_roles_from_groups(ad_user.groups, db)
        access_token = create_access_token(
            username=ad_user.username,
            display_name=ad_user.display_name,
            email=ad_user.email,
            groups=ad_user.groups,
            role=role,
            all_roles=all_roles,
            user_id=db_user.id
        )
        refresh_token = create_refresh_token(
            username=ad_user.username,
            user_id=db_user.id
        )
        
        # Audit log: successful LDAP login
        audit_service = AuditService(db)
        await audit_service.log_login_success(
            username=ad_user.username,
            user_id=db_user.id,
            role=role,
            auth_method="ldap",
            groups=ad_user.groups,
            request=request
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60
        )
        
    except LDAPInvalidCredentials:
        # Audit log: failed login - invalid credentials
        audit_service = AuditService(db)
        await audit_service.log_login_failure(
            username=form_data.username,
            reason="Invalid credentials",
            auth_method="ldap",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    except LDAPUserNotInGroup:
        # Audit log: failed login - not in required group
        audit_service = AuditService(db)
        await audit_service.log_login_failure(
            username=form_data.username,
            reason="User not in required AD group",
            auth_method="ldap",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. User not in required group."
        )
    except LDAPConnectionError as e:
        # Audit log: failed login - LDAP unavailable
        audit_service = AuditService(db)
        await audit_service.log_login_failure(
            username=form_data.username,
            reason=f"LDAP connection error: {str(e)}",
            auth_method="ldap",
            request=request
        )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Authentication service unavailable: {str(e)}"
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token using refresh token."""
    try:
        payload = decode_token(request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        username = payload.get("sub")
        user_id = payload.get("user_id")
        
        # For local admin, just regenerate tokens
        if username == settings.local_admin_username and settings.local_admin_enabled:
            access_token = create_access_token(
                username=username,
                display_name="Local Administrator",
                email=None,
                groups=["Administrators"],
                role="admin",
                all_roles=["admin"]  # Local admin only has admin role
            )
            new_refresh_token = create_refresh_token(username=username)
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                expires_in=settings.access_token_expire_minutes * 60,
                is_local_admin=True
            )
        
        # Get user from database
        if user_id:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            if not user or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive"
                )
            
            # Get all roles from user's AD groups for additive permissions
            user_groups = user.ad_groups or []
            all_roles = await get_all_roles_from_groups(user_groups, db)
            
            # Create new tokens
            access_token = create_access_token(
                username=user.username,
                display_name=user.full_name or user.username,
                email=user.email,
                groups=user_groups,
                role=user.role.value if user.role else "viewer",
                all_roles=all_roles,
                user_id=user.id
            )
            new_refresh_token = create_refresh_token(
                username=user.username,
                user_id=user.id
            )
            
            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                expires_in=settings.access_token_expire_minutes * 60
            )
        
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )


@router.get("/me", response_model=UserInfoResponse)
async def get_current_user_info(current_user: CurrentUser = Depends(get_current_user)):
    """Get current user information from JWT."""
    return UserInfoResponse(
        username=current_user.username,
        display_name=current_user.display_name,
        email=current_user.email,
        groups=current_user.groups,
        role=current_user.role,
        all_roles=current_user.all_roles,
        is_admin=current_user.is_admin()
    )


@router.get("/ldap/status")
async def get_ldap_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Test LDAP connection status (admin only)."""
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    settings_service = SettingsService(db)
    return test_ldap_connection(settings_service)


@router.post("/logout")
async def logout(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    request: Request = None
):
    """Logout current user (client should discard tokens)."""
    # Audit log: logout
    audit_service = AuditService(db)
    await audit_service.log_logout(
        username=current_user.username,
        user_id=current_user.user_id,
        role=current_user.role,
        request=request
    )
    
    return {"message": "Logged out successfully", "username": current_user.username}
