from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída del entorno o, en ejecución directa, del archivo .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: SecretStr
    mongo_db: str = "ia"
    health_check_timeout_ms: int = 2000
