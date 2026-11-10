from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from time import monotonic

import httpx
from fastapi import FastAPI, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pymongo import AsyncMongoClient
from pymongo.errors import PyMongoError

from app.adapters.inbound.agents import router as agents_router
from app.adapters.inbound.conversations import router as conversations_router
from app.application.conversations import ChatCoordination
from app.domain.agents import AgentFailure
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
            timeoutMS=10000,
            tz_aware=True,
        )
        app.state.mongo_client = client
        app.state.settings = settings
        app.state.http_client = httpx.AsyncClient(follow_redirects=False)
        app.state.chat_coordination = ChatCoordination()
        try:
            yield
        finally:
            await app.state.http_client.aclose()
            await client.close()

    app = FastAPI(title="ms-04-ia", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)

    # Toda ruta salvo GET /health exige autenticación interna (spec 002).
    # Los manejadores leen la identidad verificada en request.state.identity.
    @app.middleware("http")
    async def authenticate(request: Request, call_next: Callable[[Request], Awaitable[Response]]) -> Response:
        request.state.started_at = monotonic()
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
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        return response

    @app.exception_handler(AgentFailure)
    async def agent_failure(_request: Request, error: AgentFailure) -> JSONResponse:
        statuses = {"VALIDATION": 400, "UNAUTHENTICATED": 401, "FORBIDDEN": 403, "NOT_FOUND": 404, "CONFLICT": 409}
        return JSONResponse(status_code=statuses.get(error.category, 503), content={"category": error.category, "message": error.message})

    @app.exception_handler(RequestValidationError)
    async def validation_failure(_request: Request, _error: RequestValidationError) -> JSONResponse:
        return JSONResponse(status_code=400, content={"category": "VALIDATION", "message": "Datos de solicitud no validos."})

    @app.exception_handler(PyMongoError)
    async def persistence_failure(_request: Request, _error: PyMongoError) -> JSONResponse:
        return JSONResponse(status_code=503, content={"category": "SERVICE_UNAVAILABLE", "message": "No se pudo confirmar la operacion. Consulta su estado antes de continuar."})

    app.include_router(agents_router)
    app.include_router(conversations_router)

    @app.get("/health")
    async def health(request: Request) -> JSONResponse:
        status_code, body = await check_health(request.app.state.mongo_client, settings.mongo_db)
        return JSONResponse(status_code=status_code, content=body)

    return app


app = create_app()
