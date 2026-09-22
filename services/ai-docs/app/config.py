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

_WEAK_SECRETS = {"", "change-me-in-production", "changeme", "secret"}


def assert_service_secret_safe() -> None:
    """Refuse weak shared secrets outside local development."""
    import os

    env = os.getenv("ENVIRONMENT") or os.getenv("NODE_ENV") or "development"
    if env.lower() in {"development", "dev", "test"}:
        return
    secret = (settings.service_secret or "").strip()
    if secret.lower() in _WEAK_SECRETS or len(secret) < 16:
        raise RuntimeError(
            "AI_DOCS / SERVICE_SECRET must be a strong random value in production "
            "(not empty or 'change-me-in-production')."
        )


assert_service_secret_safe()
