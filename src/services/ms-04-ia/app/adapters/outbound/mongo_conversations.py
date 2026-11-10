from uuid import uuid4

from pymongo import ReturnDocument, WriteConcern

from app.domain.agents import revision_time
from app.domain.conversations import ChatFailure, agent_identity, conversation_view, identifier


def view(document: dict, include_exchanges: bool = True) -> dict:
    result = {"id": document["_id"], "caseId": document["caseId"],
              "createdAt": document["createdAt"].isoformat().replace("+00:00", "Z"),
              "activeAgent": agent_identity(document["activeAgent"]), "version": document["version"]}
    if include_exchanges:
        return conversation_view({**document, "id": document["_id"]})
    return result


class MongoConversations:
    def __init__(self, database):
        options = {"write_concern": WriteConcern(w="majority")}
        self.chats = database.get_collection("conversations_v1", **options)
        self.epochs = database.get_collection("chat_epochs_v1", **options)
        self.receipts = database.get_collection("chat_deletion_receipts_v1", **options)

    async def provision(self) -> None:
        await self.chats.create_index([("accountId", 1), ("caseId", 1), ("createdAt", -1), ("_id", -1)], name="owner_case_order")
        await self.receipts.create_index([("accountId", 1), ("caseId", 1), ("attemptId", 1)], unique=True, name="owner_case_attempt")

    async def epoch(self, account_id: str, case_id: str) -> dict:
        return await self.epochs.find_one_and_update({"_id": account_id + ":" + case_id},
            {"$setOnInsert": {"accountId": account_id, "caseId": case_id, "generation": 1, "deletingAttempt": None}},
            upsert=True, return_document=ReturnDocument.AFTER)

    async def generation(self, account_id: str, case_id: str) -> int:
        epoch = await self.epoch(account_id, case_id)
        if epoch["deletingAttempt"] is not None:
            raise ChatFailure("CONFLICT", "La eliminacion del historial no esta confirmada. Consulta el expediente.")
        return epoch["generation"]

    async def create(self, account_id: str, case_id: str, agent_id: str, generation: int) -> dict:
        document = {"_id": str(uuid4()), "accountId": account_id, "caseId": case_id, "createdAt": revision_time(),
                    "activeAgent": agent_id, "version": 1, "generation": generation, "exchanges": []}
        await self.chats.insert_one(document)
        return view(document)

    async def get(self, account_id: str, case_id: str, conversation_id: str) -> dict:
        document = await self.chats.find_one({"_id": conversation_id, "accountId": account_id, "caseId": case_id})
        if document is None:
            raise ChatFailure("NOT_FOUND", "La conversacion no existe o su historial fue eliminado.")
        document["id"] = document.pop("_id")
        return document

    async def list(self, account_id: str, case_id: str, first: int, after: str | None) -> dict:
        query = {"accountId": account_id, "caseId": case_id}
        if after is not None:
            previous = await self.get(account_id, case_id, identifier(after))
            query["$or"] = [{"createdAt": {"$lt": previous["createdAt"]}},
                            {"createdAt": previous["createdAt"], "_id": {"$lt": after}}]
        documents = await self.chats.find(query, {"exchanges": 0}).sort([("createdAt", -1), ("_id", -1)]).limit(first + 1).to_list(first + 1)
        items = documents[:first]
        return {"items": [view(item, False) for item in items],
                "pageInfo": {"hasNextPage": len(documents) > first, "endCursor": items[-1]["_id"] if len(documents) > first else None}}

    async def change_agent(self, account_id: str, case_id: str, conversation_id: str, version: int, agent_id: str) -> dict:
        document = await self.chats.find_one_and_update(
            {"_id": conversation_id, "accountId": account_id, "caseId": case_id, "version": version},
            {"$set": {"activeAgent": agent_id}, "$inc": {"version": 1}}, return_document=ReturnDocument.AFTER)
        if document is None:
            raise ChatFailure("CONFLICT", "La conversacion cambio. Consulta el historial antes de continuar.")
        return view(document)

    async def append(self, account_id: str, case_id: str, conversation_id: str, version: int, exchange: dict) -> dict:
        document = await self.chats.find_one_and_update(
            {"_id": conversation_id, "accountId": account_id, "caseId": case_id, "version": version},
            {"$push": {"exchanges": exchange}, "$inc": {"version": 1}}, return_document=ReturnDocument.AFTER)
        if document is None:
            raise ChatFailure("CONFLICT", "La conversacion cambio. No se guardo el intercambio; consulta el historial.")
        return view(document)

    async def erase(self, account_id: str, case_id: str, attempt_id: str) -> int:
        receipt_id = account_id + ":" + case_id + ":" + attempt_id
        receipt = await self.receipts.find_one({"_id": receipt_id})
        epoch_id = account_id + ":" + case_id
        if receipt is not None:
            await self.epochs.update_one({"_id": epoch_id, "deletingAttempt": attempt_id, "generation": receipt["generation"]},
                                         {"$set": {"deletingAttempt": None}})
            return receipt["generation"]
        epoch = await self.epoch(account_id, case_id)
        if epoch["deletingAttempt"] not in (None, attempt_id):
            raise ChatFailure("CONFLICT", "Existe una eliminacion anterior sin confirmar.")
        if epoch["deletingAttempt"] is None:
            epoch = await self.epochs.find_one_and_update({"_id": epoch_id, "generation": epoch["generation"], "deletingAttempt": None},
                {"$inc": {"generation": 1}, "$set": {"deletingAttempt": attempt_id}}, return_document=ReturnDocument.AFTER)
            if epoch is None:
                raise ChatFailure("CONFLICT", "La generacion del expediente cambio.")
        scope = {"accountId": account_id, "caseId": case_id}
        await self.chats.delete_many(scope)
        if await self.chats.count_documents(scope):
            raise ChatFailure("SERVICE_UNAVAILABLE", "No se confirmo la eliminacion completa de las conversaciones.")
        await self.receipts.update_one({"_id": receipt_id}, {"$setOnInsert": {**scope, "attemptId": attempt_id, "generation": epoch["generation"]}}, upsert=True)
        result = await self.epochs.update_one({"_id": epoch_id, "generation": epoch["generation"], "deletingAttempt": attempt_id},
                                               {"$set": {"deletingAttempt": None}})
        if result.modified_count != 1:
            raise ChatFailure("SERVICE_UNAVAILABLE", "Borrado realizado; liberacion tecnica no confirmada. Repite el mismo intento.")
        return epoch["generation"]