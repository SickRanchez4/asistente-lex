from typing import Literal

from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, ConfigDict, Field

from app.adapters.outbound.agent_audit import HttpAgentAudit
from app.adapters.outbound.mongo_agents import MongoAgents
from app.application.agents import AgentService
from app.domain.agents import Actor, AgentFailure


router = APIRouter()


class ConfigurationInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    expectedRevision: str = Field(min_length=36, max_length=36)
    instructions: str = Field(min_length=1, max_length=20000)
    model: str = Field(min_length=1, max_length=200)
    tools: list[Literal["CASE_LEGAL_DATA", "CASE_PDF_LIST", "CASE_PDF_TEXT"]] = Field(max_length=3)


class EnabledInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    expectedRevision: str = Field(min_length=36, max_length=36)
    enabled: bool


class LawUploadInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    expectedRevision: str = Field(min_length=36, max_length=36)
    name: str = Field(min_length=1, max_length=180)
    base64: str = Field(min_length=1, max_length=349528)


class LawRemovalInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    expectedRevision: str = Field(min_length=36, max_length=36)


def actor(request: Request) -> Actor | None:
    identity = request.state.identity
    return Actor(identity.user_id, identity.account_id, identity.role) if identity else None


def service(request: Request) -> AgentService:
    settings = request.app.state.settings
    raw_budget = request.headers.get("x-lex-deadline-ms", "10000")
    try:
        budget = int(raw_budget)
        if budget < 1:
            raise ValueError()
    except ValueError:
        raise AgentFailure("VALIDATION", "El presupuesto de la solicitud no es valido.") from None
    audit = HttpAgentAudit(request.app.state.http_client, settings.ms01_url,
                          settings.ms04_audit_api_token.get_secret_value(),
                          request.headers.get("x-lex-user-context", ""),
                          request.headers.get("x-correlation-id"), request.state.started_at + min(budget, 10000) / 1000)
    repository = MongoAgents(request.app.state.mongo_client[settings.mongo_db], settings.user_context_signing_key.get_secret_value())
    return AgentService(repository, audit)


@router.get("/agents")
async def available(request: Request) -> list[dict]:
    return await service(request).available()


@router.get("/agents/{agent_id}/availability")
async def availability(agent_id: str, request: Request) -> dict:
    return await service(request).availability(agent_id)


@router.get("/admin/agents")
async def configurations(request: Request) -> list[dict]:
    return await service(request).configurations(actor(request))


@router.get("/admin/agents/{agent_id}/history")
async def history(agent_id: str, request: Request, first: int = Query(default=20, ge=1, le=100),
                  after: str | None = Query(default=None, max_length=1000)) -> dict:
    return await service(request).history(actor(request), agent_id, first, after)


@router.put("/admin/agents/{agent_id}/configuration")
async def configure(agent_id: str, body: ConfigurationInput, request: Request) -> dict:
    return await service(request).configure(actor(request), agent_id, body.expectedRevision,
                                            body.instructions, body.model, tuple(body.tools))


@router.put("/admin/agents/{agent_id}/enabled")
async def set_enabled(agent_id: str, body: EnabledInput, request: Request) -> dict:
    return await service(request).set_enabled(actor(request), agent_id, body.expectedRevision, body.enabled)


@router.get("/admin/agents/{agent_id}/laws/{law_id}")
async def law(agent_id: str, law_id: str, request: Request) -> dict:
    return await service(request).law(actor(request), agent_id, law_id)


@router.post("/admin/agents/{agent_id}/laws")
async def upload_law(agent_id: str, body: LawUploadInput, request: Request) -> dict:
    return await service(request).upload_law(actor(request), agent_id, body.expectedRevision, body.name, body.base64)


@router.delete("/admin/agents/{agent_id}/laws/{law_id}")
async def remove_law(agent_id: str, law_id: str, body: LawRemovalInput, request: Request) -> dict:
    return await service(request).remove_law(actor(request), agent_id, body.expectedRevision, law_id)