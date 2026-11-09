from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient

from app.infrastructure.config import Settings
from app.infrastructure.health import check_health


def create_app() -> FastAPI:
    settings = Settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        # El cliente conecta de forma diferida: el servicio arranca aunque MongoDB no esté disponible.
        client = AsyncMongoClient(
            host=settings.mongo_uri.get_secret_value(),
            serverSelectionTimeoutMS=settings.health_check_timeout_ms,
            connectTimeoutMS=settings.health_check_timeout_ms,
        )
        app.state.mongo_client = client
        try:
            yield
        finally:
            await client.close()

    app = FastAPI(title="ms-04-ia", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    @app.get("/health")
    async def health(request: Request) -> JSONResponse:
        status_code, body = await check_health(request.app.state.mongo_client, settings.mongo_db)
        return JSONResponse(status_code=status_code, content=body)

    return app


app = create_app()
