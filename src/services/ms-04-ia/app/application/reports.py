import json
from collections.abc import Awaitable, Callable
from app.application.agents import AgentService
from app.application.ports.outbound.reports import ReportProvider, ReportSources
from app.domain.agents import Actor
from app.domain.conversations import ChatFailure, agent_identity, identifier, owner


class ReportService:
    def __init__(self, agents: AgentService, sources: ReportSources, provider: ReportProvider, active: Callable[[], Awaitable[None]]):
        self.agents, self.sources, self.provider, self.active = agents, sources, provider, active

    async def propose(self, actor: Actor | None, case_id: str, kind: str, agent_id: str | None, question: str, context: dict, filters: dict) -> dict:
        actor = owner(actor)
        identifier(case_id)
        if kind not in ("EXECUTIVE", "CLIENT", "NATURAL") or (kind == "NATURAL" and not question.strip()) or len(json.dumps(context).encode()) > 1000000:
            raise ChatFailure("VALIDATION", "Solicitud de informe invalida o contexto excesivo.")
        eligibility = await self.sources.eligible(actor, case_id)
        initial = eligibility["initialAgentId"]
        catalog = await self.agents.available()
        enabled = next(item["enabled"] for item in catalog if item["id"] == initial)
        if enabled and agent_id not in (None, initial):
            raise ChatFailure("CONFLICT", "Usa el agente inicial habilitado del expediente.")
        if not enabled and agent_id is None:
            raise ChatFailure("CONFLICT", "El agente inicial esta deshabilitado. Elige explicitamente otro habilitado.")
        configuration = await self.agents.capture_for_question(agent_id or initial)
        if "CASE_LEGAL_DATA" not in configuration.revision.tools or (context.get("pdfs") and "CASE_PDF_TEXT" not in configuration.revision.tools):
            raise ChatFailure("CONFLICT", "El agente no tiene habilitadas las herramientas requeridas por las fuentes elegidas.")
        sources = await self.sources.verify_context(actor, case_id, kind, context, filters)
        laws = [law.context() for law in configuration.revision.laws]
        law_sources = [law["source"] for law in laws]
        sources = [*sources, *law_sources]
        context = {**context, "laws": laws}
        await self.active()
        result = await self.provider.propose(configuration, kind, question, context, sources)
        if not isinstance(result, dict) or set(result) != {"title", "sections", "table", "sourceIds"} or not isinstance(result["sourceIds"], list) or not result["sourceIds"]:
            raise ChatFailure("SERVICE_UNAVAILABLE", "La propuesta no contiene un informe completo y verificable.")
        known = {source["id"] for source in sources}
        if any(not isinstance(reference, str) or reference not in known for reference in result["sourceIds"]):
            raise ChatFailure("SERVICE_UNAVAILABLE", "La propuesta cito una fuente no autorizada.")
        await self.active()
        return {**result, "agent": agent_identity(configuration.revision.agent_id), "lawSources": law_sources}