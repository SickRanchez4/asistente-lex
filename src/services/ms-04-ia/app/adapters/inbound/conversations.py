import asyncio
from collections.abc import Awaitable, Callable
import logging
from time import monotonic
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from app.adapters.inbound.agents import actor, service as agent_service
from app.adapters.outbound.chat_sources import HttpChatSources
from app.adapters.outbound.mongo_conversations import MongoConversations
from app.adapters.outbound.openai_legal import OpenAILegal
from app.application.conversations import ConversationService
from app.domain.agents import AgentFailure
from app.domain.conversations import ChatFailure


router = APIRouter()


class StartInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    agentId: Literal["penalista", "civilista"] | None = None


class ChangeInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    agentId: Literal["penalista", "civilista"]
    expectedVersion: int = Field(ge=1)


class QuestionInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    question: str = Field(min_length=1, max_length=8000)
    expectedVersion: int = Field(ge=1)
    scope: Literal["CASE", "PDF"]
    documentId: str | None = Field(default=None, max_length=36)


class DeleteInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    archiveAttemptId: str = Field(min_length=36, max_length=36)


async def bounded(request: Request, action: Callable[[ConversationService], Awaitable[dict]]) -> dict:
    settings = request.app.state.settings
    try:
        budget = min(int(request.headers.get("x-lex-deadline-ms", str(settings.ai_budget_ms))), settings.ai_budget_ms)
        if budget < 1:
            raise ValueError()
    except ValueError:
        raise ChatFailure("VALIDATION", "El presupuesto de la solicitud no es valido.") from None
    deadline = request.state.started_at + budget / 1000

    async def active():
        if monotonic() >= deadline or await request.is_disconnected():
            raise ChatFailure("SERVICE_UNAVAILABLE", "Plazo agotado o conexion interrumpida. Consulta el historial antes de continuar.")

    try:
        async with asyncio.timeout(max(0, deadline - monotonic())):
            service = ConversationService(MongoConversations(request.app.state.mongo_client[settings.mongo_db]), agent_service(request),
                HttpChatSources(request.app.state.http_client, settings, deadline, str(uuid4())),
                OpenAILegal(request.app.state.http_client, settings.openai_api_key.get_secret_value(), deadline),
                request.app.state.chat_coordination, active)
            return await action(service)
    except AgentFailure:
        raise
    except TimeoutError:
        raise ChatFailure("SERVICE_UNAVAILABLE", "La consulta excedio el plazo. No se recibio respuesta completa; consulta el historial antes de continuar.") from None
    except Exception:
        logging.getLogger(__name__).warning("chat_operation_not_confirmed")
        raise ChatFailure("SERVICE_UNAVAILABLE", "No se pudo confirmar la operacion del chat. Consulta el estado antes de continuar.") from None


@router.get("/cases/{case_id}/conversations")
async def conversations(case_id: str, request: Request, first: int = Query(default=25, ge=1, le=100),
                        after: str | None = Query(default=None, max_length=36)) -> dict:
    return await bounded(request, lambda service: service.list(actor(request), case_id, first, after))


@router.post("/cases/{case_id}/conversations")
async def start(case_id: str, body: StartInput, request: Request) -> dict:
    return await bounded(request, lambda service: service.start(actor(request), case_id, body.agentId))


@router.get("/cases/{case_id}/conversations/{conversation_id}")
async def conversation(case_id: str, conversation_id: str, request: Request) -> dict:
    return await bounded(request, lambda service: service.get(actor(request), case_id, conversation_id))


@router.put("/cases/{case_id}/conversations/{conversation_id}/agent")
async def change_agent(case_id: str, conversation_id: str, body: ChangeInput, request: Request) -> dict:
    return await bounded(request, lambda service: service.change_agent(actor(request), case_id, conversation_id, body.expectedVersion, body.agentId))


@router.post("/cases/{case_id}/conversations/{conversation_id}/questions")
async def question(case_id: str, conversation_id: str, body: QuestionInput, request: Request) -> dict:
    return await bounded(request, lambda service: service.ask(actor(request), case_id, conversation_id, body.expectedVersion,
                                                             body.question, body.scope, body.documentId))


@router.post("/cases/{case_id}/conversations/delete")
async def erase(case_id: str, body: DeleteInput, request: Request) -> dict:
    return await bounded(request, lambda service: service.erase(actor(request), case_id, body.archiveAttemptId))