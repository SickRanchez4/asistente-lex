from pymongo import AsyncMongoClient

SERVICE_NAME = "ms-04-ia"


async def is_mongodb_available(client: AsyncMongoClient, db_name: str) -> bool:
    try:
        await client[db_name].command("ping")
        return True
    except Exception:
        return False


async def check_health(client: AsyncMongoClient, db_name: str) -> tuple[int, dict]:
    """Comprobación técnica de disponibilidad según el contrato común de la spec 000."""
    dependencies = {
        "mongodb": "UP" if await is_mongodb_available(client, db_name) else "DOWN",
    }
    all_up = all(status == "UP" for status in dependencies.values())
    body = {
        "service": SERVICE_NAME,
        "status": "UP" if all_up else "DOWN",
        "dependencies": dependencies,
    }
    return (200 if all_up else 503), body
