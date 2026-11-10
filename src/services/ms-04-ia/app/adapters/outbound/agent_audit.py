import asyncio
import math
from time import monotonic

import httpx

from app.domain.agents import Actor, Revision


class HttpAgentAudit:
    def __init__(self, client: httpx.AsyncClient, url: str, token: str, user_context: str,
                 correlation_id: str | None, deadline: float):
        self.client = client
        self.url = url.rstrip("/") + "/audit/events"
        self.token = token
        self.user_context = user_context
        self.correlation_id = correlation_id
        self.deadline = deadline

    async def record(self, actor: Actor, revision: Revision, operation: str) -> bool:
        remaining = self.deadline - monotonic()
        if not self.token or not self.user_context or remaining <= 0:
            return False
        headers = {"Authorization": "Bearer " + self.token, "X-Lex-User-Context": self.user_context,
                   "X-Lex-Deadline-Ms": str(max(1, math.floor(remaining * 1000)))}
        if self.correlation_id:
            headers["X-Correlation-Id"] = self.correlation_id
        try:
            async with asyncio.timeout(remaining):
                response = await self.client.post(self.url, headers=headers,
                    json={"eventId": revision.revision, "type": "AGENT_ACTION", "result": "SUCCESS",
                          "operation": operation, "agentId": revision.agent_id,
                          "date": revision.occurred_at.isoformat().replace("+00:00", "Z")}, timeout=remaining)
            if response.status_code != 200:
                return False
            data = response.json()
            return isinstance(data, dict) and data.get("applied") is True and data.get("auditRecorded") is True
        except (httpx.HTTPError, TimeoutError, ValueError):
            return False