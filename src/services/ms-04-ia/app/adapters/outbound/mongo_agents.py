import base64
from dataclasses import asdict
from datetime import timezone
import hashlib
import hmac
import json
from uuid import uuid4

from pymongo import WriteConcern
from pymongo.errors import DuplicateKeyError

from app.domain.agents import AGENTS, INITIAL_INSTRUCTIONS, TOOLS, AgentFailure, Revision, revision_time, validate_configuration


class MongoAgents:
    def __init__(self, database, cursor_key: str):
        self.database = database
        self.agents = database.get_collection("agents_v1", write_concern=WriteConcern(w="majority"))
        self.revisions = database.get_collection("agent_revisions_v1", write_concern=WriteConcern(w="majority"))
        self.cursor_key = cursor_key

    async def provision(self, model: str) -> None:
        validate_configuration(INITIAL_INSTRUCTIONS["penalista"], model, TOOLS)
        if await self.agents.count_documents({"_id": {"$nin": list(AGENTS)}}):
            raise AgentFailure("CONFLICT", "El catalogo contiene agentes no permitidos.")
        for agent_id in AGENTS:
            if await self.agents.find_one({"_id": agent_id}):
                await self.current(agent_id)
                continue
            revision = Revision(agent_id, str(uuid4()), None, INITIAL_INSTRUCTIONS[agent_id], model,
                                TOOLS, True, None, revision_time())
            await self.insert_revision(revision)
            try:
                await self.agents.insert_one({"_id": agent_id, "revision": revision.revision, "provisionVersion": 1})
            except DuplicateKeyError:
                await self.current(agent_id)

    async def insert_revision(self, revision: Revision) -> None:
        document = asdict(revision)
        document["_id"] = document.pop("revision")
        document["tools"] = list(revision.tools)
        await self.revisions.insert_one(document)

    async def read_revision(self, agent_id: str, revision_id: str) -> Revision:
        document = await self.revisions.find_one({"_id": revision_id, "agent_id": agent_id})
        if document is None:
            raise AgentFailure("SERVICE_UNAVAILABLE", "El historial del agente no esta disponible.")
        document["revision"] = document.pop("_id")
        document["tools"] = tuple(document["tools"])
        document["occurred_at"] = document["occurred_at"].astimezone(timezone.utc)
        return Revision(**document)

    async def current(self, agent_id: str) -> Revision:
        document = await self.agents.find_one({"_id": agent_id})
        if document is None:
            raise AgentFailure("SERVICE_UNAVAILABLE", "Catalogo no aprovisionado. Ejecuta la preparacion explicita de agentes.")
        return await self.read_revision(agent_id, document["revision"])

    async def publish(self, revision: Revision, expected: str) -> None:
        await self.insert_revision(revision)
        result = await self.agents.update_one({"_id": revision.agent_id, "revision": expected},
                                              {"$set": {"revision": revision.revision}})
        if result.modified_count != 1:
            raise AgentFailure("CONFLICT", "El agente cambio durante la edicion. Recarga antes de confirmar.")

    def encode_cursor(self, agent_id: str, revision_id: str) -> str:
        if len(self.cursor_key) < 32:
            raise AgentFailure("SERVICE_UNAVAILABLE", "No se puede consultar el historial.")
        payload = base64.urlsafe_b64encode(json.dumps({"agentId": agent_id, "next": revision_id},
                                                     separators=(",", ":")).encode()).rstrip(b"=").decode()
        signature = hmac.new(self.cursor_key.encode(), ("agent-history-v1." + payload).encode(), hashlib.sha256).hexdigest()
        return payload + "." + signature

    def decode_cursor(self, agent_id: str, cursor: str) -> str:
        try:
            if len(cursor) > 1000 or len(self.cursor_key) < 32:
                raise ValueError()
            payload, signature = cursor.split(".")
            expected = hmac.new(self.cursor_key.encode(), ("agent-history-v1." + payload).encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, expected):
                raise ValueError()
            value = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
            if set(value) != {"agentId", "next"} or value["agentId"] != agent_id or not isinstance(value["next"], str):
                raise ValueError()
            return value["next"]
        except (ValueError, TypeError, KeyError):
            raise AgentFailure("VALIDATION", "La pagina de historial no es valida.") from None

    async def history(self, agent_id: str, first: int, after: str | None) -> dict:
        current = await self.current(agent_id) if after is None else await self.read_revision(agent_id, self.decode_cursor(agent_id, after))
        items = []
        for _ in range(first):
            previous = await self.read_revision(agent_id, current.previous_revision) if current.previous_revision else None
            items.append({"current": current.configuration(), "previous": previous.configuration() if previous else None})
            if previous is None:
                return {"items": items, "pageInfo": {"hasNextPage": False, "endCursor": None}}
            current = previous
        return {"items": items, "pageInfo": {"hasNextPage": True, "endCursor": self.encode_cursor(agent_id, current.revision)}}