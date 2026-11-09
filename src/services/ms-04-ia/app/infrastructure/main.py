from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient

from app.infrastructure.config import Settings
from app.infrastructure.health import check_health
from app.infrastructure.internal_auth import (
    UNAUTHENTICATED_BODY,
    USER_CONTEXT_HEADER,
    authenticate_internal_request,
)


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

    # Toda ruta salvo GET /health exige autenticación interna (spec 002).
    # Los manejadores leen la identidad verificada en request.state.identity.
    @app.middleware("http")
    async def authenticate(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request.state.identity = None
        if request.url.path == "/health" and request.method == "GET":
            return await call_next(request)
        authenticated, identity = authenticate_internal_request(
            request.headers.get("authorization"),
            request.headers.get(USER_CONTEXT_HEADER),
            settings.internal_api_token.get_secret_value(),
            settings.user_context_signing_key.get_secret_value(),
        )
        if not authenticated:
            return JSONResponse(status_code=401, content=UNAUTHENTICATED_BODY)
        request.state.identity = identity
        return await call_next(request)

    @app.get("/health")
    async def health(request: Request) -> JSONResponse:
        status_code, body = await check_health(request.app.state.mongo_client, settings.mongo_db)
        return JSONResponse(status_code=status_code, content=body)

    return app


app = create_app()
