from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    database_url: str
    secret_key: str
    fernet_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480  # 8 hours
    cert_storage_path: str = "/app/certs"
    debug: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
