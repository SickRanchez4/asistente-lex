from app.adapters.outbound.chat_sources import HttpChatSources
from app.domain.conversations import ChatFailure, identifier


class HttpReportSources(HttpChatSources):
    async def verify_context(self, actor, case_id: str, kind: str, context: dict, filters: dict) -> list[dict]:
        if set(context) != {"legal", "pdfs"} or not isinstance(context["pdfs"], list) or len(context["pdfs"]) > 10 or set(filters) - {"actuationType", "fromDate", "toDate"}:
            raise ChatFailure("VALIDATION", "Contexto de informe no autorizado.")
        if kind == "CLIENT" and context["pdfs"]:
            raise ChatFailure("VALIDATION", "Un informe para cliente no admite documentos.")
        params = {"audience": "CLIENT" if kind == "CLIENT" else "INTERNAL"}
        params.update({("type" if key == "actuationType" else key): value for key, value in filters.items() if value is not None})
        legal = await self.get(actor, "ms01", "/cases/" + case_id + "/report-sources", params)
        if legal != context["legal"]:
            raise ChatFailure("CONFLICT", "Las fuentes juridicas cambiaron o no corresponden al expediente. Consulta antes de generar.")
        sources = [{"id": "CASE:" + case_id, "kind": "CASE", "label": "Expediente " + legal["caseData"]["code"]}]
        for item in context["pdfs"]:
            if not isinstance(item, dict) or set(item) != {"source", "text"} or not isinstance(item["source"], dict):
                raise ChatFailure("VALIDATION", "Fuente PDF invalida.")
            reference = item["source"].get("id", "")
            if not isinstance(reference, str) or not reference.startswith("PDF:"):
                raise ChatFailure("VALIDATION", "Fuente PDF invalida.")
            source, text = await self.pdf_text(actor, case_id, identifier(reference[4:]))
            if item != {"source": source, "text": text}:
                raise ChatFailure("CONFLICT", "El PDF cambio o no corresponde a la fuente autorizada.")
            sources.append(source)
        if not legal["participants"] and not legal["actuations"] and not context["pdfs"]:
            raise ChatFailure("VALIDATION", "Fuentes insuficientes: se requiere participante, actuacion o texto PDF autorizado.")
        return sources