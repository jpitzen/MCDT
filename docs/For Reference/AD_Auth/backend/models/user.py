"""
User model for authentication and authorization.
Supports both AD and local users.
"""
from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
import enum

from app.database import Base


class UserRole(str, enum.Enum):
    """
    Application roles with hierarchical permissions:
    - ADMIN: Full system access
    - PROFESSIONAL_SERVICES: Edit configurations and existing quotes
    - SALES: Full access to ZL Licensing modal
    - APPROVER: View ZL Licensing, approve/deny quotes with feedback
    - REVIEWER: Review quotes and configurations
    - AUDITOR: View-only audit access
    - VIEWER: Basic read-only access
    """
    ADMIN = "admin"
    PROFESSIONAL_SERVICES = "professional_services"
    SALES = "sales"
    APPROVER = "approver"
    REVIEWER = "reviewer"
    AUDITOR = "auditor"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    email = Column(String(255), nullable=True)
    full_name = Column(String(255), nullable=True)
    
    # Role-based access (stored as varchar, validated by Python enum)
    role = Column(String(50), default=UserRole.VIEWER.value, nullable=False)
    
    # AD Integration fields
    is_ad_user = Column(Boolean, default=True)
    ad_distinguished_name = Column(Text, nullable=True)
    ad_groups = Column(ARRAY(String), default=[])
    
    # Account status
    is_active = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)
    
    # Relationships
    audit_logs = relationship("AuditLog", back_populates="user")

    def __repr__(self):
        return f"<User(username='{self.username}', role='{self.role}')>"
