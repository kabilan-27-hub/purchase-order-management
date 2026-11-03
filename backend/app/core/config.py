from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parents[2]

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./supplier_management.db"
    SECRET_KEY: str = "replace-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    APP_TIMEZONE: str = "Asia/Kolkata"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = BASE_DIR / ".env"
        extra = "ignore"

settings = Settings()
