import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Literal

USER_CONTEXT_HEADER = "x-lex-user-context"
UNAUTHENTICATED_BODY = {"category": "UNAUTHENTICATED", "message": "Solicitud interna no autenticada."}

_MIN_SIGNING_KEY_LENGTH = 32


@dataclass(frozen=True)
class VerifiedIdentity:
    """Identidad del solicitante firmada por el Gateway; la cuenta efectiva sale de aquí, nunca de parámetros."""

    user_id: str
    role: Literal["ABOGADO", "ADMINISTRADOR"]
    account_id: str


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def verify_user_context(value: str, signing_key: str) -> VerifiedIdentity | None:
    """Verifica `base64url(json).base64url(hmac-sha256)` y su vencimiento."""
    if len(signing_key) < _MIN_SIGNING_KEY_LENGTH:
        return None
    parts = value.split(".")
    if len(parts) != 2 or not parts[0] or not parts[1]:
        return None
    payload, signature = parts
    expected = base64.urlsafe_b64encode(
        hmac.new(signing_key.encode(), payload.encode(), hashlib.sha256).digest()
    ).rstrip(b"=").decode()
    if not hmac.compare_digest(signature.encode(), expected.encode()):
        return None
    try:
        claims = json.loads(_b64url_decode(payload))
    except ValueError:
        return None
    if not isinstance(claims, dict):
        return None
    user_id, account_id, role, exp = (claims.get(key) for key in ("userId", "accountId", "role", "exp"))
    if (
        not isinstance(user_id, str)
        or not user_id
        or not isinstance(account_id, str)
        or not account_id
        or role not in ("ABOGADO", "ADMINISTRADOR")
        or not isinstance(exp, int)
        or isinstance(exp, bool)
        or exp <= int(time.time())
    ):
        return None
    return VerifiedIdentity(user_id=user_id, role=role, account_id=account_id)


def authenticate_internal_request(
    authorization: str | None, user_context: str | None, api_token: str, signing_key: str
) -> tuple[bool, VerifiedIdentity | None]:
    """Credencial del servicio obligatoria y, si se envía, contexto firmado válido. Sin configuración, rechaza todo."""
    if not api_token or not authorization or not authorization.startswith("Bearer "):
        return False, None
    if not hmac.compare_digest(authorization[len("Bearer "):].encode(), api_token.encode()):
        return False, None
    if user_context is None:
        return True, None
    identity = verify_user_context(user_context, signing_key)
    return (identity is not None), identity
