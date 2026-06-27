from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    openai_api_key: str = ""
    service_secret: str = "change-me-in-production"
    openai_model: str = "gpt-4o-mini"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
