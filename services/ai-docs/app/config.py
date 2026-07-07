from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=(".env", ".env.local"), extra="ignore")

    openai_api_key: str = ""
    service_secret: str = "change-me-in-production"
    openai_model: str = "gpt-4o-mini"
    openai_whisper_model: str = "whisper-1"
    openai_vision_model: str = "gpt-4o-mini"
    openai_timeout_seconds: float = 180.0
    cors_origins: str = "http://localhost:3000"


settings = Settings()
