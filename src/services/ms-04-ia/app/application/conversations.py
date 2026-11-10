import asyncio
from collections.abc import Awaitable, Callable
import json
from uuid import uuid4

from app.application.agents import AgentService
from app.application.ports.outbound.conversations import CaseSources, ConversationRepository, LegalProvider
from app.domain.agents import Actor, revision_time
from app.domain.conversations import (
    ChatFailure, agent_identity, analysis_scope, conversation_view, expected_version, identifier, owner, question_text,
)


class ChatCoordination:
    def __init__(self):
        self.locks: dict[tuple[str, str], asyncio.Lock] = {}
        self.pending: dict[tuple[str, str, str], tuple[str, int]] = {}

    def lock(self, account_id: str, case_id: str) -> asyncio.Lock:
        return self.locks.setdefault((account_id, case_id), asyncio.Lock())


class ConversationService:
    def __init__(self, repository: ConversationRepository, agents: AgentService, sources: CaseSources,
                 provider: LegalProvider, coordination: ChatCoordination, active: Callable[[], Awaitable[None]]):
        self.repository, self.agents, self.sources, self.provider = repository, agents, sources, provider
        self.coordination, self.active = coordination, active

    async def eligible(self, actor: Actor, case_id: str) -> dict:
        await self.active()
        eligibility = await self.sources.eligible(actor, case_id)
        if eligibility.get("state") not in ("OPEN", "CLOSED") or eligibility.get("archiving") is not False or eligibility.get("questionsAllowed") is not True:
            raise ChatFailure("CONFLICT", "El expediente esta Archivado o tiene un archivo pendiente. No admite conversaciones.")
        return eligibility

    async def list(self, actor: Actor | None, case_id: str, first: int, after: str | None) -> dict:
        actor = owner(actor)
        identifier(case_id)
        if type(first) is not int or not 1 <= first <= 100:
            raise ChatFailure("VALIDATION", "El tamano de pagina debe estar entre 1 y 100.")
        async with self.coordination.lock(actor.account_id, case_id):
            await self.eligible(actor, case_id)
            await self.repository.generation(actor.account_id, case_id)
            return await self.repository.list(actor.account_id, case_id, first, after)

    async def get(self, actor: Actor | None, case_id: str, conversation_id: str) -> dict:
        actor = owner(actor)
        identifier(case_id)
        identifier(conversation_id)
        async with self.coordination.lock(actor.account_id, case_id):
            await self.eligible(actor, case_id)
            await self.repository.generation(actor.account_id, case_id)
            return conversation_view(await self.repository.get(actor.account_id, case_id, conversation_id))

    async def start(self, actor: Actor | None, case_id: str, agent_id: str | None) -> dict:
        actor = owner(actor)
        identifier(case_id)
        async with self.coordination.lock(actor.account_id, case_id):
            eligibility = await self.eligible(actor, case_id)
            generation = await self.repository.generation(actor.account_id, case_id)
            initial = eligibility["initialAgentId"]
            catalog = await self.agents.available()
            initial_enabled = next(item["enabled"] for item in catalog if item["id"] == initial)
            if initial_enabled and agent_id not in (None, initial):
                raise ChatFailure("CONFLICT", "Inicia con el agente inicial; puedes cambiarlo dentro de la conversacion.")
            if not initial_enabled and agent_id is None:
                raise ChatFailure("CONFLICT", "Agente inicial deshabilitado. Elige explicitamente el otro agente habilitado.")
            selected = agent_id if agent_id is not None else initial
            await self.agents.capture_for_question(selected)
            await self.active()
            return await self.repository.create(actor.account_id, case_id, selected, generation)

    async def change_agent(self, actor: Actor | None, case_id: str, conversation_id: str, version: int, agent_id: str) -> dict:
        actor = owner(actor)
        identifier(case_id)
        identifier(conversation_id)
        expected_version(version)
        async with self.coordination.lock(actor.account_id, case_id):
            await self.eligible(actor, case_id)
            await self.repository.generation(actor.account_id, case_id)
            current = await self.repository.get(actor.account_id, case_id, conversation_id)
            self.writable(actor, case_id, conversation_id, current, version)
            await self.agents.capture_for_question(agent_id)
            await self.active()
            if current["activeAgent"] == agent_id:
                return conversation_view(current)
            return await self.repository.change_agent(actor.account_id, case_id, conversation_id, version, agent_id)

    def writable(self, actor: Actor, case_id: str, conversation_id: str, current: dict, version: int) -> None:
        if current["version"] != version or (actor.account_id, case_id, conversation_id) in self.coordination.pending:
            raise ChatFailure("CONFLICT", "La conversacion cambio o tiene una pregunta pendiente. Consulta el historial antes de continuar.")

    async def ask(self, actor: Actor | None, case_id: str, conversation_id: str, version: int,
                  question: str, mode: str, document_id: str | None) -> dict:
        actor = owner(actor)
        identifier(case_id)
        identifier(conversation_id)
        expected_version(version)
        question = question_text(question)
        analysis_scope(mode, document_id)
        key = (actor.account_id, case_id, conversation_id)
        token = str(uuid4())
        async with self.coordination.lock(actor.account_id, case_id):
            await self.eligible(actor, case_id)
            generation = await self.repository.generation(actor.account_id, case_id)
            current = await self.repository.get(actor.account_id, case_id, conversation_id)
            self.writable(actor, case_id, conversation_id, current, version)
            configuration = await self.agents.capture_for_question(current["activeAgent"])
            history = [{key: exchange[key] for key in ("question", "answer", "agent")} for exchange in current["exchanges"]]
            if len(json.dumps(history, ensure_ascii=False)) > 200000:
                raise ChatFailure("VALIDATION", "El historial excede el contexto seguro. Inicia otra conversacion; no se omite historial silenciosamente.")
            self.coordination.pending[key] = (token, generation)
        try:
            answer, sources = await self.provider.answer(configuration, history, question, mode, document_id, self.sources, actor, case_id)
            async with self.coordination.lock(actor.account_id, case_id):
                if await self.repository.generation(actor.account_id, case_id) != generation:
                    raise ChatFailure("CONFLICT", "El historial fue eliminado durante la pregunta. La respuesta se descarto.")
                await self.eligible(actor, case_id)
                await self.active()
                exchange = {"id": str(uuid4()), "question": question, "answer": answer,
                            "agent": agent_identity(configuration.revision.agent_id), "sources": sources,
                            "occurredAt": revision_time().isoformat().replace("+00:00", "Z"),
                            "configurationRevision": configuration.revision.revision, "model": configuration.revision.model}
                if len(json.dumps(current["exchanges"] + [exchange], ensure_ascii=False).encode()) > 1000000:
                    raise ChatFailure("VALIDATION", "La conversacion alcanzo su limite seguro. Inicia otra sin perder este historial.")
                return await self.repository.append(actor.account_id, case_id, conversation_id, version, exchange)
        finally:
            if self.coordination.pending.get(key) == (token, generation):
                self.coordination.pending.pop(key, None)

    async def erase(self, actor: Actor | None, case_id: str, attempt_id: str) -> dict:
        actor = owner(actor)
        identifier(case_id)
        identifier(attempt_id)
        async with self.coordination.lock(actor.account_id, case_id):
            await self.active()
            generation = await self.repository.erase(actor.account_id, case_id, attempt_id)
            for key, pending in list(self.coordination.pending.items()):
                if key[:2] == (actor.account_id, case_id) and pending[1] < generation:
                    self.coordination.pending.pop(key, None)
            return {"deleted": True, "caseId": case_id, "archiveAttemptId": attempt_id, "generation": generation}