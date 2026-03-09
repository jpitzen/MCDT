"""
Application configuration using Pydantic Settings.
Loads from environment variables with sensible defaults.
"""
import warnings
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache


# Insecure defaults that trigger startup warnings
_INSECURE_SECRET_KEYS = {
    "your-super-secret-key-change-in-production",
    "cloudestimator-dev-secret-key-change-in-production",
    "CHANGE_ME_GENERATE_A_REAL_SECRET",
}
_INSECURE_PASSWORDS = {"ChangeMe123!", "CHANGE_ME_USE_A_STRONG_PASSWORD"}


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Application
    app_name: str = "CloudEstimator API"
    app_version: str = "1.0.0"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    
    # Database (using port 5435 to avoid conflicts with existing PostgreSQL instances)
    database_url: str = "postgresql://postgres:CloudEst2026!@localhost:5435/cloudestimator"
    
    # Security
    secret_key: str = "your-super-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    
    # CORS (frontend on 3000/3006, backend on 8000) - stored as string, parsed to list
    cors_origins: str = "http://localhost:3000,http://localhost:3006,http://localhost:8000,http://127.0.0.1:3000,http://127.0.0.1:3006"
    
    # Local Admin (for initial setup)
    local_admin_enabled: bool = True
    local_admin_username: str = "admin"
    local_admin_password: str = "ChangeMe123!"
    
    # LDAP/Active Directory (reference AD-Integration.md)
    ldap_enabled: bool = False
    ldap_server: str = ""
    ldap_base_dn: str = ""
    ldap_domain: str = ""
    ldap_required_group: str = ""
    ldap_admin_groups: str = "RFP-Admin,RFP-Admins"
    ldap_group_filter: str = "RFP"
    ldap_auth_method: str = "SIMPLE"
    ldap_skip_tls_verify: bool = False
    ldap_service_account: Optional[str] = None
    ldap_service_password: Optional[str] = None
    
    # Database Connection Pool
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 3600
    
    # Pricing
    pricing_staleness_days: int = 30
    pricing_cache_hours: int = 24
    
    # Export
    export_storage_path: str = "./exports"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]
    
    @property
    def ldap_admin_groups_list(self) -> List[str]:
        return [g.strip() for g in self.ldap_admin_groups.split(",") if g.strip()]
    
    def validate_security(self) -> None:
        """Emit warnings for insecure default values. Call during startup."""
        if self.secret_key in _INSECURE_SECRET_KEYS:
            warnings.warn(
                "⚠️  SECRET_KEY is using an insecure default. "
                "Set SECRET_KEY env var with: python -c \"import secrets; print(secrets.token_urlsafe(64))\"",
                stacklevel=2,
            )
        if self.local_admin_enabled and self.local_admin_password in _INSECURE_PASSWORDS:
            warnings.warn(
                "⚠️  LOCAL_ADMIN_PASSWORD is using an insecure default. "
                "Set LOCAL_ADMIN_PASSWORD env var to a strong password.",
                stacklevel=2,
            )
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"  # Ignore extra environment variables


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Singleton instance for easy importing
settings = get_settings()
