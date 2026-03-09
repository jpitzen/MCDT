"""
Active Directory Configuration Models.
Stores AD/LDAP configuration including service credentials and role mappings.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

from app.database import Base


class ADConfiguration(Base):
    """
    Main AD/LDAP configuration.
    Only one active configuration at a time.
    """
    __tablename__ = "ad_configurations"

    id = Column(Integer, primary_key=True, index=True)
    
    # Basic LDAP Settings
    ldap_enabled = Column(Boolean, default=False)
    ldap_server = Column(String(500), nullable=True)  # ldap://server:389 or ldaps://server:636
    ldap_port = Column(Integer, default=389)
    ldap_use_ssl = Column(Boolean, default=False)
    ldap_base_dn = Column(String(500), nullable=True)  # DC=company,DC=local
    ldap_domain = Column(String(200), nullable=True)  # COMPANY (NetBIOS name)
    ldap_auth_method = Column(String(20), default="SIMPLE")  # SIMPLE or NTLM
    ldap_skip_tls_verify = Column(Boolean, default=False)
    
    # Service Account Credentials (encrypted at rest)
    service_account_username = Column(String(200), nullable=True)  # svc-ldap@company.local
    service_account_password_encrypted = Column(Text, nullable=True)  # Fernet encrypted
    service_account_last_validated = Column(DateTime, nullable=True)
    service_account_valid = Column(Boolean, default=False)
    
    # Local Admin Settings
    local_admin_enabled = Column(Boolean, default=True)
    local_admin_username = Column(String(100), default="admin")
    local_admin_password_hash = Column(Text, nullable=True)  # bcrypt hashed
    
    # Login Requirements
    require_group_membership = Column(Boolean, default=False)  # If False, any AD user can login
    required_groups = Column(ARRAY(String), default=[])  # Groups allowed to login
    
    # Metadata
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by = Column(String(100), nullable=True)
    
    # Relationships
    role_mappings = relationship("ADRoleMapping", back_populates="ad_config", cascade="all, delete-orphan")


class ADRoleMapping(Base):
    """
    Maps AD groups to application roles.
    Multiple groups can map to the same role.
    """
    __tablename__ = "ad_role_mappings"

    id = Column(Integer, primary_key=True, index=True)
    ad_config_id = Column(Integer, ForeignKey("ad_configurations.id", ondelete="CASCADE"), nullable=False)
    
    # Role mapping
    ad_group_name = Column(String(200), nullable=False)  # CN of the AD group
    ad_group_dn = Column(String(500), nullable=True)  # Full DN if known
    application_role = Column(String(50), nullable=False)  # admin, reviewer, auditor, user
    
    # Priority (lower = higher priority for multiple group memberships)
    priority = Column(Integer, default=100)
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100), nullable=True)
    
    # Relationships
    ad_config = relationship("ADConfiguration", back_populates="role_mappings")


class ADGroupCache(Base):
    """
    Cache of AD groups for autocomplete and validation.
    Populated by querying the AD using service account.
    """
    __tablename__ = "ad_group_cache"

    id = Column(Integer, primary_key=True, index=True)
    
    group_cn = Column(String(200), nullable=False, index=True)  # Common Name
    group_dn = Column(String(500), nullable=False)  # Full Distinguished Name
    group_description = Column(Text, nullable=True)
    member_count = Column(Integer, nullable=True)
    
    # Cache metadata
    last_synced = Column(DateTime, default=datetime.utcnow)
    
    class Config:
        orm_mode = True


class ADUserSync(Base):
    """
    Tracks AD user sync status for group membership management.
    """
    __tablename__ = "ad_user_syncs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Sync status
    ad_username = Column(String(200), nullable=False)
    ad_distinguished_name = Column(String(500), nullable=True)
    ad_groups = Column(ARRAY(String), default=[])
    
    # Sync tracking
    last_synced = Column(DateTime, default=datetime.utcnow)
    sync_status = Column(String(50), default="pending")  # pending, synced, error
    sync_error = Column(Text, nullable=True)
    
    # User relationship
    user = relationship("User", backref="ad_sync")
