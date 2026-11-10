from typing import Protocol
from app.domain.agents import Actor, ExecutionConfiguration


class ReportSources(Protocol):
    async def eligible(self, actor: Actor, case_id: str) -> dict: ...
    async def verify_context(self, actor: Actor, case_id: str, kind: str, context: dict, filters: dict) -> list[dict]: ...


class ReportProvider(Protocol):
    async def propose(self, configuration: ExecutionConfiguration, kind: str, question: str, context: dict, sources: list[dict]) -> dict: ...