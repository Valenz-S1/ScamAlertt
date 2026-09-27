from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Proyecto
    PROJECT_NAME: str = "ScamAlert"
    VERSION: str = "1.0.0"

    # Base de datos
    DATABASE_URL: str = "postgresql://scamalert:scamalert123@localhost:5432/scamalert_db"

    # Seguridad
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Claude API (para después)
    CLAUDE_API_KEY: str = ""

    class Config:
        env_file = ".env"


settings = Settings()