import asyncio

from pymongo import AsyncMongoClient

from app.adapters.outbound.mongo_agents import MongoAgents
from app.adapters.outbound.mongo_conversations import MongoConversations
from app.domain.agents import AgentFailure
from app.infrastructure.config import Settings


async def prepare() -> None:
    settings = Settings()
    if not settings.agents_prepare:
        raise AgentFailure("VALIDATION", "La preparacion requiere AGENTS_PREPARE=true explicito.")
    client = AsyncMongoClient(settings.mongo_uri.get_secret_value(), serverSelectionTimeoutMS=10000, tz_aware=True)
    try:
        repository = MongoAgents(client[settings.mongo_db], settings.user_context_signing_key.get_secret_value())
        await repository.provision(settings.agent_initial_model)
        await MongoConversations(client[settings.mongo_db]).provision()
        print("Catalogo v1 preparado: Penalista y Civilista. Revisiones existentes conservadas.")
    finally:
        await client.close()


if __name__ == "__main__":
    try:
        asyncio.run(prepare())
    except Exception:
        raise SystemExit("No se pudo preparar el catalogo. Revisa AGENTS_PREPARE, AGENT_INITIAL_MODEL y MongoDB; sin cambios destructivos.") from None