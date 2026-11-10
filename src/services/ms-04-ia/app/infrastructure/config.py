from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración leída del entorno o, en ejecución directa, del archivo .env."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: SecretStr
    mongo_db: str = "ia"
    health_check_timeout_ms: int = 2000
    # Vacíos: el servicio rechaza toda llamada interna.
    internal_api_token: SecretStr = SecretStr("")
    user_context_signing_key: SecretStr = SecretStr("")
    ms01_url: str = "http://ms-01-juridico:8081"
    ms04_audit_api_token: SecretStr = SecretStr("")
    agent_initial_model: str = ""
    agents_prepare: bool = False
    openai_api_key: SecretStr = SecretStr("")
