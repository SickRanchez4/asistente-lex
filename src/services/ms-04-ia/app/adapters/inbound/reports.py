import asyncio
import logging
from time import monotonic
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Request
from pydantic import BaseModel, ConfigDict, Field
from app.adapters.inbound.agents import actor, service as agent_service
from app.adapters.outbound.openai_legal import OpenAILegal
from app.adapters.outbound.openai_reports import OpenAIReports
from app.adapters.outbound.report_sources import HttpReportSources
from app.application.reports import ReportService
from app.domain.agents import AgentFailure
from app.domain.conversations import ChatFailure


router = APIRouter()


class ReportInput(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    kind: Literal["EXECUTIVE", "CLIENT", "NATURAL"]
    agentId: Literal["civilista", "penalista"] | None = None
    question: str = Field(default="", max_length=8000)
    context: dict
    filter: dict = Field(default_factory=dict)


@router.post("/cases/{case_id}/report-proposal")
async def propose(case_id: str, body: ReportInput, request: Request) -> dict:
    settings = request.app.state.settings
    try:
        budget = min(int(request.headers.get("x-lex-deadline-ms", str(settings.ai_budget_ms))), settings.ai_budget_ms)
        if budget < 1:
            raise ValueError()
    except ValueError:
        raise ChatFailure("VALIDATION", "Presupuesto invalido.") from None
    deadline = request.state.started_at + budget / 1000

    async def active():
        if monotonic() >= deadline or await request.is_disconnected():
            raise ChatFailure("SERVICE_UNAVAILABLE", "Plazo agotado o conexion interrumpida.")

    try:
        async with asyncio.timeout(max(0, deadline - monotonic())):
            sources = HttpReportSources(request.app.state.http_client, settings, deadline, str(uuid4()))
            provider = OpenAIReports(OpenAILegal(request.app.state.http_client, settings.openai_api_key.get_secret_value(), deadline))
            return await ReportService(agent_service(request), sources, provider, active).propose(actor(request), case_id,
                body.kind, body.agentId, body.question, body.context, body.filter)
    except AgentFailure:
        raise
    except TimeoutError:
        raise ChatFailure("SERVICE_UNAVAILABLE", "La propuesta excedio el plazo; no se recibio un informe completo.") from None
    except Exception:
        logging.getLogger(__name__).warning("report_proposal_not_confirmed")
        raise ChatFailure("SERVICE_UNAVAILABLE", "No se pudo completar la propuesta del informe.") from None