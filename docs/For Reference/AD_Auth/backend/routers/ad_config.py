"""
AD Configuration API Router.
Endpoints for managing AD/LDAP configuration, service accounts, and role mappings.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth import get_current_user, require_admin, CurrentUser
from app.models.user import User
from app.services.ad_config_service import ADConfigService
from app.services.audit_service import AuditService, AuditAction

router = APIRouter(prefix="/config/ad", tags=["AD Configuration"])


# ============ Request/Response Schemas ============

class ADConfigResponse(BaseModel):
    """AD configuration response."""
    ldap_enabled: bool = False
    ldap_server: Optional[str] = None
    ldap_port: int = 389
    ldap_use_ssl: bool = False
    ldap_base_dn: Optional[str] = None
    ldap_domain: Optional[str] = None
    ldap_auth_method: str = "NTLM"
    ldap_skip_tls_verify: bool = False
    require_group_membership: bool = False
    required_groups: List[str] = []
    service_account_username: Optional[str] = None
    service_account_configured: bool = False
    service_account_valid: bool = False
    local_admin_enabled: bool = True
    local_admin_username: str = "admin"
    
    class Config:
        from_attributes = True


class ADConfigUpdateRequest(BaseModel):
    """Request to update AD configuration."""
    ldap_enabled: Optional[bool] = None
    ldap_server: Optional[str] = None
    ldap_port: Optional[int] = None
    ldap_use_ssl: Optional[bool] = None
    ldap_base_dn: Optional[str] = None
    ldap_domain: Optional[str] = None
    ldap_auth_method: Optional[str] = None
    ldap_skip_tls_verify: Optional[bool] = None
    require_group_membership: Optional[bool] = None
    required_groups: Optional[List[str]] = None


class ServiceAccountRequest(BaseModel):
    """Request to set service account credentials."""
    username: str = Field(..., description="Service account username")
    password: str = Field(..., description="Service account password")


class ServiceAccountTestRequest(BaseModel):
    """Request to test service account credentials."""
    username: str
    password: str


class ServiceAccountResponse(BaseModel):
    """Service account operation response."""
    success: bool
    message: Optional[str] = None
    error: Optional[str] = None
    server_info: Optional[dict] = None


class LocalAdminRequest(BaseModel):
    """Request to update local admin settings."""
    enabled: Optional[bool] = None
    new_password: Optional[str] = None


class RoleMappingRequest(BaseModel):
    """Request to create/update role mapping."""
    ad_group_name: str = Field(..., description="AD group name (CN)")
    application_role: str = Field(..., description="Application role (admin, reviewer, auditor, user)")
    priority: int = Field(100, description="Priority (lower = higher priority)")
    ad_group_dn: Optional[str] = None


class RoleMappingResponse(BaseModel):
    """Role mapping response."""
    id: int
    ad_group_name: str
    ad_group_dn: Optional[str] = None
    application_role: str
    priority: int
    is_active: bool = True
    
    class Config:
        from_attributes = True


class ADGroupResponse(BaseModel):
    """AD group response."""
    cn: str
    dn: str
    description: Optional[str] = None
    member_count: int = 0


class UserSyncResponse(BaseModel):
    """User sync response."""
    synced: int
    errors: int
    total: int


class UserImportResponse(BaseModel):
    """User import response."""
    imported: int
    updated: int
    errors: int
    total: int


# ============ Configuration Endpoints ============

@router.get("", response_model=ADConfigResponse)
async def get_ad_config(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get current AD configuration (admin only)."""
    service = ADConfigService(db)
    config = await service.get_or_create_config()
    
    return ADConfigResponse(
        ldap_enabled=config.ldap_enabled,
        ldap_server=config.ldap_server,
        ldap_port=config.ldap_port,
        ldap_use_ssl=config.ldap_use_ssl,
        ldap_base_dn=config.ldap_base_dn,
        ldap_domain=config.ldap_domain,
        ldap_auth_method=config.ldap_auth_method,
        ldap_skip_tls_verify=config.ldap_skip_tls_verify,
        require_group_membership=config.require_group_membership,
        required_groups=config.required_groups or [],
        service_account_username=config.service_account_username,
        service_account_configured=config.service_account_username is not None,
        service_account_valid=config.service_account_valid,
        local_admin_enabled=config.local_admin_enabled,
        local_admin_username=config.local_admin_username or "admin"
    )


@router.put("", response_model=ADConfigResponse)
async def update_ad_config(
    request: ADConfigUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    http_request: Request = None
):
    """Update AD configuration (admin only)."""
    service = ADConfigService(db)
    
    config = await service.update_config(
        ldap_enabled=request.ldap_enabled,
        ldap_server=request.ldap_server,
        ldap_port=request.ldap_port,
        ldap_use_ssl=request.ldap_use_ssl,
        ldap_base_dn=request.ldap_base_dn,
        ldap_domain=request.ldap_domain,
        ldap_auth_method=request.ldap_auth_method,
        ldap_skip_tls_verify=request.ldap_skip_tls_verify,
        require_group_membership=request.require_group_membership,
        required_groups=request.required_groups,
        updated_by=current_user.username
    )
    
    # Audit log: AD configuration updated (CRITICAL)
    audit_service = AuditService(db)
    await audit_service.log(
        action=AuditAction.AD_CONFIG_UPDATE,
        username=current_user.username,
        user_id=current_user.id if hasattr(current_user, 'id') else None,
        details={
            "role": "admin",
            "changes": {
                "ldap_enabled": request.ldap_enabled,
                "ldap_server": request.ldap_server,
                "require_group_membership": request.require_group_membership
            }
        },
        request=http_request
    )
    
    return ADConfigResponse(
        ldap_enabled=config.ldap_enabled,
        ldap_server=config.ldap_server,
        ldap_port=config.ldap_port,
        ldap_use_ssl=config.ldap_use_ssl,
        ldap_base_dn=config.ldap_base_dn,
        ldap_domain=config.ldap_domain,
        ldap_auth_method=config.ldap_auth_method,
        ldap_skip_tls_verify=config.ldap_skip_tls_verify,
        require_group_membership=config.require_group_membership,
        required_groups=config.required_groups or [],
        service_account_username=config.service_account_username,
        service_account_configured=config.service_account_username is not None,
        service_account_valid=config.service_account_valid,
        local_admin_enabled=config.local_admin_enabled,
        local_admin_username=config.local_admin_username or "admin"
    )


# ============ Service Account Endpoints ============

@router.post("/service-account", response_model=ServiceAccountResponse)
async def set_service_account(
    request: ServiceAccountRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    http_request: Request = None
):
    """Set and validate service account credentials (admin only)."""
    service = ADConfigService(db)
    result = await service.set_service_account(
        username=request.username,
        password=request.password,
        updated_by=current_user.username
    )
    
    # Audit log: Service account configured (CRITICAL)
    audit_service = AuditService(db)
    await audit_service.log(
        action=AuditAction.AD_CONFIG_UPDATE,
        username=current_user.username,
        user_id=current_user.id if hasattr(current_user, 'id') else None,
        details={
            "role": "admin",
            "operation": "set_service_account",
            "service_account_username": request.username,
            "success": result.get("success", False)
        },
        request=http_request
    )
    
    return ServiceAccountResponse(**result)


@router.post("/service-account/test", response_model=ServiceAccountResponse)
async def test_service_account(
    request: ServiceAccountTestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Test service account credentials without saving (admin only)."""
    service = ADConfigService(db)
    result = await service.test_service_credentials(
        username=request.username,
        password=request.password
    )
    return ServiceAccountResponse(**result)


@router.delete("/service-account")
async def clear_service_account(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Clear service account credentials (admin only)."""
    service = ADConfigService(db)
    await service.clear_service_account(updated_by=current_user.username)
    return {"message": "Service account cleared"}


# ============ Local Admin Endpoints ============

@router.put("/local-admin")
async def update_local_admin(
    request: LocalAdminRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update local admin settings (admin only)."""
    service = ADConfigService(db)
    result = {}
    
    if request.enabled is not None:
        enabled = await service.set_local_admin_enabled(
            request.enabled, 
            updated_by=current_user.username
        )
        result["enabled"] = enabled
    
    if request.new_password:
        await service.set_local_admin_password(
            request.new_password,
            updated_by=current_user.username
        )
        result["password_updated"] = True
    
    return result


@router.get("/local-admin/status")
async def get_local_admin_status(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get local admin status (admin only)."""
    service = ADConfigService(db)
    enabled = await service.is_local_admin_enabled()
    return {"enabled": enabled}


# ============ Role Mapping Endpoints ============

@router.get("/role-mappings", response_model=List[RoleMappingResponse])
async def list_role_mappings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """List all role mappings (admin only)."""
    service = ADConfigService(db)
    mappings = await service.get_role_mappings()
    return [RoleMappingResponse.model_validate(m) for m in mappings]


@router.post("/role-mappings", response_model=RoleMappingResponse, status_code=status.HTTP_201_CREATED)
async def create_role_mapping(
    request: RoleMappingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    http_request: Request = None
):
    """Create a new role mapping (admin only)."""
    # Validate role - must match UserRole enum values
    valid_roles = ["admin", "professional_services", "sales", "approver", "reviewer", "auditor", "viewer"]
    if request.application_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    service = ADConfigService(db)
    mapping = await service.add_role_mapping(
        ad_group_name=request.ad_group_name,
        application_role=request.application_role,
        ad_group_dn=request.ad_group_dn,
        priority=request.priority,
        created_by=current_user.username
    )
    
    # Audit log: Role mapping created (WARNING)
    audit_service = AuditService(db)
    await audit_service.log(
        action=AuditAction.ROLE_MAPPING_CREATE,
        username=current_user.username,
        user_id=current_user.id if hasattr(current_user, 'id') else None,
        resource_id=str(mapping.id),
        details={
            "role": "admin",
            "ad_group_name": request.ad_group_name,
            "application_role": request.application_role,
            "priority": request.priority
        },
        request=http_request
    )
    
    return RoleMappingResponse.model_validate(mapping)


@router.put("/role-mappings/{mapping_id}", response_model=RoleMappingResponse)
async def update_role_mapping(
    mapping_id: int,
    request: RoleMappingRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Update a role mapping (admin only)."""
    # Validate role - must match UserRole enum values
    valid_roles = ["admin", "professional_services", "sales", "approver", "reviewer", "auditor", "viewer"]
    if request.application_role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )
    
    service = ADConfigService(db)
    mapping = await service.update_role_mapping(
        mapping_id=mapping_id,
        ad_group_name=request.ad_group_name,
        application_role=request.application_role,
        priority=request.priority
    )
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    return RoleMappingResponse.model_validate(mapping)


@router.delete("/role-mappings/{mapping_id}")
async def delete_role_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin),
    http_request: Request = None
):
    """Delete a role mapping (admin only)."""
    service = ADConfigService(db)
    deleted = await service.delete_role_mapping(mapping_id)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    # Audit log: Role mapping deleted (WARNING)
    audit_service = AuditService(db)
    await audit_service.log(
        action=AuditAction.ROLE_MAPPING_DELETE,
        username=current_user.username,
        user_id=current_user.id if hasattr(current_user, 'id') else None,
        resource_id=str(mapping_id),
        details={"role": "admin"},
        request=http_request
    )
    
    return {"message": "Mapping deleted"}


# ============ AD Group Endpoints ============

@router.get("/groups", response_model=List[ADGroupResponse])
async def query_ad_groups(
    search: Optional[str] = None,
    use_cache: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Query AD groups (admin only)."""
    service = ADConfigService(db)
    
    if use_cache:
        # Try cache first
        cached = await service.get_cached_groups(search)
        if cached:
            return [
                ADGroupResponse(
                    cn=g.group_cn,
                    dn=g.group_dn,
                    description=g.group_description,
                    member_count=g.member_count or 0
                )
                for g in cached
            ]
    
    # Query AD directly
    try:
        groups = await service.query_ad_groups(search)
        return [ADGroupResponse(**g) for g in groups]
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to query AD: {str(e)}")


@router.post("/groups/sync")
async def sync_ad_groups(
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Sync AD groups to local cache (admin only)."""
    service = ADConfigService(db)
    
    try:
        count = await service.sync_group_cache(search)
        return {"message": f"Synced {count} groups", "count": count}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to sync: {str(e)}")


# ============ User Sync Endpoints ============

@router.post("/users/sync", response_model=UserSyncResponse)
async def sync_all_ad_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Sync all AD users' group memberships (admin only)."""
    service = ADConfigService(db)
    
    try:
        result = await service.sync_all_users()
        return UserSyncResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")


@router.post("/users/import", response_model=UserImportResponse)
async def import_users_from_ad_groups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """
    Import users from AD groups that have role mappings (admin only).
    
    This queries AD for all users in groups that have been mapped to application roles,
    then creates or updates user records in the database with the appropriate roles.
    
    Prerequisites:
    - LDAP must be enabled and configured
    - Service account must be set and validated
    - Role mappings must be configured (AD group -> application role)
    """
    service = ADConfigService(db)
    
    try:
        result = await service.import_users_from_groups()
        return UserImportResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")


@router.post("/users/{user_id}/sync")
async def sync_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Sync a specific user's AD groups (admin only)."""
    from sqlalchemy import select
    from app.models.user import User as UserModel
    
    # Get user
    result = await db.execute(select(UserModel).where(UserModel.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.is_ad_user:
        raise HTTPException(status_code=400, detail="Not an AD user")
    
    service = ADConfigService(db)
    sync_result = await service.sync_user_groups(user_id, user.username)
    
    if not sync_result:
        raise HTTPException(status_code=500, detail="Sync failed")
    
    return {
        "user_id": user_id,
        "username": user.username,
        "groups": sync_result.ad_groups,
        "role": user.role.value,
        "synced_at": sync_result.last_synced.isoformat()
    }
