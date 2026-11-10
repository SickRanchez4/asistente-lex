from typing import Protocol

from app.domain.agents import Actor, Revision


class AgentRepository(Protocol):
    async def current(self, agent_id: str) -> Revision: ...

    async def publish(self, revision: Revision, expected: str) -> None: ...

    async def history(self, agent_id: str, first: int, after: str | None) -> dict: ...


class AgentAudit(Protocol):
    async def record(self, actor: Actor, revision: Revision, operation: str) -> bool: ...