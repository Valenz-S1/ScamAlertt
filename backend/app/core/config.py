from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    database_url: str = "postgresql://scamalert:scamalert@db:5432/scamalert"
    environment: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
