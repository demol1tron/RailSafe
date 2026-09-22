from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "RailSafe"
    database_url: str = "postgresql+asyncpg://railsafe:railsafe@db:5432/railsafe"

    jwt_secret: str = "change-me-access"
    jwt_refresh_secret: str = "change-me-refresh"
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    admin_initial_email: str = "admin@railsafe.local"
    admin_initial_password: str = "Admin12345!"

    cookie_secure: bool = False
    cors_origins: str = "http://localhost,http://127.0.0.1"

    # Email-based 2FA. Keep disabled until SMTP is configured.
    two_factor_enabled: bool = False
    two_factor_secret: str = "change-me-two-factor-secret"
    two_factor_ttl_seconds: int = 300
    two_factor_max_attempts: int = 5

    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from: str = ""
    smtp_starttls: bool = True
    smtp_ssl: bool = False

    @property
    def cors_list(self) -> list[str]:
        return [x.strip() for x in self.cors_origins.split(",") if x.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
