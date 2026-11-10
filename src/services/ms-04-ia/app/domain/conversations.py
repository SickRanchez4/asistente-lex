from uuid import UUID

from app.domain.agents import AGENTS, Actor, AgentFailure


class ChatFailure(AgentFailure):
    pass


def agent_identity(agent_id: str) -> dict:
    return {"id": agent_id, "name": AGENTS[agent_id][0]}


def conversation_view(document: dict) -> dict:
    return {"id": document["id"], "caseId": document["caseId"],
            "createdAt": document["createdAt"].isoformat().replace("+00:00", "Z"),
            "activeAgent": agent_identity(document["activeAgent"]), "version": document["version"],
            "exchanges": [{key: value for key, value in exchange.items() if key not in ("configurationRevision", "model")}
                          for exchange in document["exchanges"]]}


def identifier(value: str) -> str:
    try:
        if str(UUID(value)) != value:
            raise ValueError()
    except (ValueError, TypeError, AttributeError):
        raise ChatFailure("VALIDATION", "El identificador no es valido.") from None
    return value


def owner(actor: Actor | None) -> Actor:
    if actor is None:
        raise ChatFailure("UNAUTHENTICATED", "Debes iniciar sesion.")
    if actor.role != "ABOGADO" or actor.user_id != actor.account_id:
        raise ChatFailure("FORBIDDEN", "No autorizado para acceder a conversaciones.")
    identifier(actor.account_id)
    return actor


def question_text(value: str) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 8000 or any(
        ord(character) < 32 and character not in "\n\r\t" for character in value
    ):
        raise ChatFailure("VALIDATION", "La pregunta debe tener entre 1 y 8000 caracteres de texto.")
    return value.strip()


def expected_version(value: int) -> int:
    if type(value) is not int or value < 1:
        raise ChatFailure("VALIDATION", "Consulta la version vigente de la conversacion.")
    return value


def analysis_scope(mode: str, document_id: str | None) -> None:
    if mode not in ("CASE", "PDF") or (mode == "PDF") != (document_id is not None):
        raise ChatFailure("VALIDATION", "Selecciona expediente completo o un PDF autorizado.")
    if document_id is not None:
        identifier(document_id)


def complete_answer(value: object, sources: dict[str, dict]) -> tuple[str, list[dict]]:
    if not isinstance(value, dict) or set(value) != {"answer", "sourceIds"}:
        raise ChatFailure("SERVICE_UNAVAILABLE", "La IA no devolvio una respuesta completa valida.")
    answer, references = value["answer"], value["sourceIds"]
    if not isinstance(answer, str) or not answer.strip() or len(answer) > 50000 or not isinstance(references, list):
        raise ChatFailure("SERVICE_UNAVAILABLE", "La IA no devolvio una respuesta completa valida.")
    if len(references) > 100 or any(not isinstance(reference, str) or reference not in sources for reference in references):
        raise ChatFailure("SERVICE_UNAVAILABLE", "La IA devolvio referencias no verificadas. No se guardo respuesta.")
    return answer.strip(), [sources[reference] for reference in dict.fromkeys(references)]