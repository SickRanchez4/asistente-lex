import base64
import hashlib
import hmac
import json
from time import monotonic, time

import httpx

from app.domain.agents import AGENTS, Actor
from app.domain.conversations import ChatFailure, identifier


class HttpChatSources:
    def __init__(self, client: httpx.AsyncClient, settings, deadline: float, correlation_id: str):
        self.client, self.settings, self.deadline, self.correlation_id = client, settings, deadline, correlation_id

    async def get(self, actor: Actor, service: str, path: str, params: dict | None = None):
        token = self.settings.ms01_api_token if service == "ms01" else self.settings.ms02_api_token
        url = self.settings.ms01_url if service == "ms01" else self.settings.ms02_url
        signing_key = self.settings.user_context_signing_key.get_secret_value()
        remaining = self.deadline - monotonic()
        if not token.get_secret_value() or len(signing_key) < 32 or remaining <= 0:
            raise ChatFailure("SERVICE_UNAVAILABLE", "No se pudo consultar la fuente autorizada.")
        claims = {"userId": actor.user_id, "accountId": actor.account_id, "role": actor.role, "exp": int(time()) + 120}
        payload = base64.urlsafe_b64encode(json.dumps(claims, separators=(",", ":")).encode()).rstrip(b"=").decode()
        signature = base64.urlsafe_b64encode(hmac.new(signing_key.encode(), payload.encode(), hashlib.sha256).digest()).rstrip(b"=").decode()
        headers = {"Authorization": "Bearer " + token.get_secret_value(), "X-Lex-User-Context": payload + "." + signature,
                   "X-Lex-Deadline-Ms": str(max(1, int(remaining * 1000))), "X-Correlation-Id": self.correlation_id}
        try:
            async with self.client.stream("GET", url.rstrip("/") + path, params=params, headers=headers,
                                          timeout=httpx.Timeout(remaining, connect=min(3, remaining)), follow_redirects=False) as response:
                if response.status_code in (401, 403, 404, 409):
                    category = {401: "UNAUTHENTICATED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT"}[response.status_code]
                    raise ChatFailure(category, "La fuente no esta autorizada o ya no esta disponible.")
                if response.status_code != 200:
                    raise ChatFailure("SERVICE_UNAVAILABLE", "La fuente autorizada no esta disponible.")
                body = bytearray()
                async for chunk in response.aiter_bytes():
                    body.extend(chunk)
                    if len(body) > 1500000:
                        raise ChatFailure("VALIDATION", "La fuente excede el contexto seguro; no se omitio contenido silenciosamente.")
                return json.loads(body)
        except (httpx.HTTPError, ValueError):
            raise ChatFailure("SERVICE_UNAVAILABLE", "No se pudo leer la fuente autorizada.") from None

    async def eligible(self, actor: Actor, case_id: str) -> dict:
        data = await self.get(actor, "ms01", "/cases/" + identifier(case_id) + "/eligibility")
        if not isinstance(data, dict) or data.get("id") != case_id or data.get("state") not in ("OPEN", "CLOSED", "ARCHIVED") or data.get("initialAgentId") not in AGENTS or type(data.get("archiving")) is not bool or type(data.get("questionsAllowed")) is not bool:
            raise ChatFailure("SERVICE_UNAVAILABLE", "La elegibilidad del expediente no pudo verificarse.")
        if data["state"] == "ARCHIVED" or data["archiving"] or not data["questionsAllowed"]:
            raise ChatFailure("CONFLICT", "El expediente esta Archivado o tiene un archivo pendiente. No admite conversaciones.")
        return data

    async def pages(self, actor: Actor, service: str, path: str, params: dict | None = None) -> list[dict]:
        items, after, seen = [], None, set()
        while True:
            data = await self.get(actor, service, path, {**(params or {}), "first": 100, **({"after": after} if after else {})})
            if not isinstance(data, dict) or not isinstance(data.get("items"), list) or not isinstance(data.get("pageInfo"), dict) or type(data["pageInfo"].get("hasNextPage")) is not bool:
                raise ChatFailure("SERVICE_UNAVAILABLE", "La pagina de fuentes no pudo verificarse.")
            items.extend(data["items"])
            if len(items) > 1000:
                raise ChatFailure("VALIDATION", "El expediente excede el contexto seguro. No se omitieron fuentes silenciosamente.")
            if not data["pageInfo"]["hasNextPage"]:
                return items
            after = data["pageInfo"].get("endCursor")
            if not isinstance(after, str) or not after or after in seen:
                raise ChatFailure("SERVICE_UNAVAILABLE", "No se pudo completar la lectura de fuentes.")
            seen.add(after)

    async def legal_data(self, actor: Actor, case_id: str) -> dict:
        await self.eligible(actor, case_id)
        case = await self.get(actor, "ms01", "/cases/" + case_id)
        participants = await self.pages(actor, "ms01", "/cases/" + case_id + "/participants")
        actuations = await self.pages(actor, "ms01", "/cases/" + case_id + "/actuations")
        return {"source": {"id": "CASE:" + case_id, "kind": "CASE", "label": "Expediente " + case["code"]},
                "data": {"case": {key: case[key] for key in ("code", "title", "description", "area", "state")},
                         "participants": [{"name": item["person"]["displayName"], "personType": item["person"]["type"],
                                           "role": item["role"], "detail": item["detail"]} for item in participants],
                         "actuations": [{key: item[key] for key in ("type", "date", "description")} for item in actuations]}}

    async def pdf_list(self, actor: Actor, case_id: str) -> list[dict]:
        await self.eligible(actor, case_id)
        items = await self.pages(actor, "ms02", "/cases/" + case_id + "/file-sources", {"format": "PDF"})
        result = []
        for item in items:
            if item.get("format") != "PDF" or item.get("availability") != "AVAILABLE" or not isinstance(item.get("name"), str):
                raise ChatFailure("SERVICE_UNAVAILABLE", "La fuente PDF no pudo verificarse.")
            result.append({"id": identifier(item["id"]), "name": item["name"], "classification": item["classification"]})
        return result

    async def pdf_text(self, actor: Actor, case_id: str, document_id: str) -> tuple[dict, str]:
        await self.eligible(actor, case_id)
        path = "/cases/" + case_id + "/files/" + identifier(document_id)
        metadata = await self.get(actor, "ms02", path)
        if metadata.get("format") != "PDF" or metadata.get("availability") != "AVAILABLE":
            raise ChatFailure("VALIDATION", "Selecciona un PDF disponible, no una fotografia ni un informe.")
        data = await self.get(actor, "ms02", path + "/pdf-text")
        if data.get("status") == "NO_TEXT":
            raise ChatFailure("VALIDATION", "El PDF no contiene texto extraible: no es analizable sin OCR. No se envio al proveedor.")
        if data.get("status") == "LIMIT_EXCEEDED":
            raise ChatFailure("VALIDATION", "El PDF excede el contexto seguro. No se envio texto parcial al proveedor.")
        if data.get("status") != "EXTRACTED" or not isinstance(data.get("text"), str) or not data["text"].strip() or len(data["text"]) > 200000:
            raise ChatFailure("SERVICE_UNAVAILABLE", "No se pudo verificar el texto del PDF.")
        return {"id": "PDF:" + document_id, "kind": "PDF", "label": metadata["name"]}, data["text"]