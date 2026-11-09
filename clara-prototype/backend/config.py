"""Production and environment-specific configuration."""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_url: str = "sqlite:///./clara.db"
    
    # JWT / Auth
    jwt_secret_key: str = "dev-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]
    cors_allow_credentials: bool = True
    cors_allow_methods: list[str] = ["*"]
    cors_allow_headers: list[str] = ["*"]
    
    # LLM Provider
    llm_provider: str = "mock"  # "mock", "gemini", "openai"
    openai_api_key: Optional[str] = None
    openai_model: str = "gpt-4-turbo"
    openai_temperature: float = 0.7
    openai_max_tokens: int = 1000
    openai_timeout_seconds: int = 30
    
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-pro"
    gemini_temperature: float = 0.7
    gemini_max_tokens: int = 1000
    gemini_timeout_seconds: int = 30
    
    llm_enable_intent_validation: bool = True
    
    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_requests: int = 100
    rate_limit_window_seconds: int = 60
    
    # Security
    environment: str = "development"  # "development", "staging", "production"
    debug: bool = False
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        # Allow extra fields from .env (for forward compatibility)
        extra = "ignore"

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.environment == "production"

    @property
    def is_staging(self) -> bool:
        """Check if running in staging."""
        return self.environment == "staging"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.environment == "development"

    def get_database_engine_args(self) -> dict:
        """Get database engine arguments based on database type."""
        if self.database_url.startswith("postgresql"):
            return {
                "pool_size": 20,
                "max_overflow": 10,
                "pool_recycle": 3600,
                "echo": False,
            }
        elif self.database_url.startswith("sqlite"):
            return {
                "connect_args": {"check_same_thread": False},
                "echo": False,
            }
        else:
            raise ValueError(f"Unsupported database URL: {self.database_url}")


# Load settings from environment
settings = Settings()
