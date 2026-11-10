from dataclasses import replace
from uuid import UUID, uuid4

from app.application.ports.outbound.agents import AgentAudit, AgentRepository
from app.domain.agents import AGENTS, Actor, AgentFailure, ExecutionConfiguration, Revision, law_document, revision_time, validate_configuration


class AgentService:
    def __init__(self, repository: AgentRepository, audit: AgentAudit):
        self.repository = repository
        self.audit = audit

    async def available(self) -> list[dict]:
        return [(await self.repository.current(agent_id)).available() for agent_id in AGENTS]

    async def configurations(self, actor: Actor | None) -> list[dict]:
        self.require_admin(actor)
        return [(await self.repository.current(agent_id)).configuration() for agent_id in AGENTS]

    async def capture_for_question(self, agent_id: str) -> ExecutionConfiguration:
        self.valid_agent(agent_id)
        revision = await self.repository.current(agent_id)
        if not revision.enabled:
            raise AgentFailure("CONFLICT", "Agente deshabilitado. Selecciona explicitamente otro agente habilitado.")
        return ExecutionConfiguration(revision)

    async def availability(self, agent_id: str) -> dict:
        return (await self.capture_for_question(agent_id)).revision.available()

    async def history(self, actor: Actor | None, agent_id: str, first: int, after: str | None) -> dict:
        self.require_admin(actor)
        self.valid_agent(agent_id)
        if not 1 <= first <= 100:
            raise AgentFailure("VALIDATION", "El tamano de pagina debe estar entre 1 y 100.")
        return await self.repository.history(agent_id, first, after)

    async def configure(self, actor: Actor | None, agent_id: str, expected: str,
                        instructions: str, model: str, tools: tuple[str, ...]) -> dict:
        admin = self.require_admin(actor)
        current = await self.before_change(agent_id, expected)
        validate_configuration(instructions, model, tools)
        revision = replace(current, revision=str(uuid4()), previous_revision=current.revision,
                           instructions=instructions, model=model, tools=tools, author_id=admin.user_id,
                           occurred_at=revision_time())
        return await self.apply(admin, revision, "AGENT_CONFIGURATION_CHANGED")

    async def set_enabled(self, actor: Actor | None, agent_id: str, expected: str, enabled: bool) -> dict:
        admin = self.require_admin(actor)
        current = await self.before_change(agent_id, expected)
        if type(enabled) is not bool:
            raise AgentFailure("VALIDATION", "La disponibilidad debe ser booleana.")
        if current.enabled == enabled:
            raise AgentFailure("CONFLICT", "El agente ya tiene esa disponibilidad. Recarga el catalogo.")
        revision = replace(current, revision=str(uuid4()), previous_revision=current.revision,
                           enabled=enabled, author_id=admin.user_id, occurred_at=revision_time())
        return await self.apply(admin, revision, "AGENT_ENABLED" if enabled else "AGENT_DISABLED")

    async def law(self, actor: Actor | None, agent_id: str, law_id: str) -> dict:
        self.require_admin(actor)
        self.valid_agent(agent_id)
        current = await self.repository.current(agent_id)
        for document in current.laws:
            if document.id == law_id:
                return {**document.metadata(), "text": document.text}
        raise AgentFailure("NOT_FOUND", "La ley no existe en la biblioteca de este agente.")

    async def upload_law(self, actor: Actor | None, agent_id: str, expected: str, name: str, encoded: str) -> dict:
        admin = self.require_admin(actor)
        current = await self.before_change(agent_id, expected)
        document = law_document(name, encoded, admin.user_id)
        if any(law.name.casefold() == document.name.casefold() or law.sha256 == document.sha256 for law in current.laws):
            raise AgentFailure("CONFLICT", "Ya existe una ley con ese nombre o contenido en este agente.")
        if len(current.laws) >= 10 or sum(len(law.text.encode("utf-8")) for law in current.laws) + len(document.text.encode("utf-8")) > 262144:
            raise AgentFailure("VALIDATION", "La biblioteca admite hasta 10 archivos y 256 KiB de texto total por agente.")
        revision = replace(current, revision=str(uuid4()), previous_revision=current.revision,
                           laws=(*current.laws, document), author_id=admin.user_id, occurred_at=revision_time())
        return await self.apply(admin, revision, "AGENT_CONFIGURATION_CHANGED")

    async def remove_law(self, actor: Actor | None, agent_id: str, expected: str, law_id: str) -> dict:
        admin = self.require_admin(actor)
        current = await self.before_change(agent_id, expected)
        laws = tuple(law for law in current.laws if law.id != law_id)
        if len(laws) == len(current.laws):
            raise AgentFailure("NOT_FOUND", "La ley no existe en la biblioteca de este agente.")
        revision = replace(current, revision=str(uuid4()), previous_revision=current.revision,
                           laws=laws, author_id=admin.user_id, occurred_at=revision_time())
        return await self.apply(admin, revision, "AGENT_CONFIGURATION_CHANGED")

    async def before_change(self, agent_id: str, expected: str) -> Revision:
        self.valid_agent(agent_id)
        try:
            if str(UUID(expected)) != expected:
                raise ValueError()
        except (ValueError, TypeError, AttributeError):
            raise AgentFailure("VALIDATION", "La revision esperada no es valida.") from None
        current = await self.repository.current(agent_id)
        if current.revision != expected:
            raise AgentFailure("CONFLICT", "El agente cambio durante la edicion. Recarga antes de confirmar.")
        return current

    async def apply(self, actor: Actor, revision: Revision, operation: str) -> dict:
        if revision.previous_revision is None:
            raise AgentFailure("VALIDATION", "El cambio necesita una revision anterior.")
        await self.repository.publish(revision, revision.previous_revision)
        try:
            recorded = await self.audit.record(actor, revision, operation)
        except Exception:
            recorded = False
        return {"applied": True, "auditRecorded": recorded, "category": None if recorded else "PARTIAL_FAILURE",
                "message": "Cambio aplicado." if recorded else "Cambio aplicado; auditoria no confirmada. No repitas el cambio.",
                "agent": revision.configuration()}

    @staticmethod
    def require_admin(actor: Actor | None) -> Actor:
        if actor is None:
            raise AgentFailure("UNAUTHENTICATED", "Debes iniciar sesion.")
        if actor.role != "ADMINISTRADOR":
            raise AgentFailure("FORBIDDEN", "No autorizado para configurar agentes.")
        return actor

    @staticmethod
    def valid_agent(agent_id: str) -> None:
        if agent_id not in AGENTS:
            raise AgentFailure("NOT_FOUND", "El agente no existe.")