import secrets
import logging
from fastapi import APIRouter, HTTPException, Query

from app.core import config
from app.core.security import encrypt_token, decrypt_token
from app.models.schemas import (
    InstagramConnectResponse,
    InstagramCallbackResponse,
    InstagramStatusResponse,
    InstagramDisconnectResponse,
)
from app.services import meta_service
from app.services.supabase_service import get_table, insert, update

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/instagram", tags=["Instagram Auth"])

TABLE = "instagram_connections"
USER_ID = config.MVP_USER_ID


def _get_active_connection() -> dict | None:
    result = (
        get_table(TABLE)
        .select("*")
        .eq("user_id", USER_ID)
        .eq("status", "connected")
        .limit(1)
        .execute()
    )
    data = result.data
    return data[0] if data else None


@router.get("/connect", response_model=InstagramConnectResponse)
async def connect_instagram():
    """Gera a URL OAuth da Meta para o usuário autorizar o acesso."""
    if not config.META_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="META_CLIENT_ID não configurado no .env",
        )

    state = secrets.token_urlsafe(32)
    auth_url = meta_service.build_oauth_url(state)
    logger.info("URL OAuth gerada: %s", auth_url)
    return InstagramConnectResponse(auth_url=auth_url)


@router.get("/callback", response_model=InstagramCallbackResponse)
async def instagram_callback(
    code: str = Query(..., description="Authorization code retornado pela Meta"),
    state: str = Query(default=""),
):
    """Recebe o callback da Meta, troca o code por token e salva criptografado."""
    try:
        token_data = meta_service.exchange_code_for_token(code)
        ig_account = meta_service.get_instagram_account(token_data["access_token"])
    except Exception as exc:
        logger.error("Erro ao trocar code por token: %s", exc)
        raise HTTPException(status_code=400, detail=f"Falha na autenticação com a Meta: {exc}")

    encrypted = encrypt_token(token_data["access_token"])

    existing = _get_active_connection()
    record = {
        "user_id": USER_ID,
        "instagram_handle": ig_account["instagram_handle"],
        "instagram_user_id": ig_account["instagram_user_id"],
        "access_token_encrypted": encrypted,
        "token_expires_at": token_data["expires_at"].isoformat(),
        "status": "connected",
    }

    if existing:
        update(TABLE, existing["id"], record)
    else:
        insert(TABLE, record)

    logger.info("Instagram conectado: @%s", ig_account["instagram_handle"])
    return InstagramCallbackResponse(
        status="connected",
        instagram_handle=ig_account["instagram_handle"],
        instagram_user_id=ig_account["instagram_user_id"],
    )


@router.get("/status", response_model=InstagramStatusResponse)
async def instagram_status():
    """Retorna o status atual da conexão com o Instagram."""
    conn = _get_active_connection()
    if not conn:
        return InstagramStatusResponse(status="disconnected")

    # Valida se o token ainda funciona
    try:
        token = decrypt_token(conn["access_token_encrypted"])
        is_valid = meta_service.validate_token(token)
    except Exception:
        is_valid = False

    if not is_valid:
        update(TABLE, conn["id"], {"status": "expired"})
        return InstagramStatusResponse(status="expired")

    return InstagramStatusResponse(
        status="connected",
        instagram_handle=conn.get("instagram_handle"),
        instagram_user_id=conn.get("instagram_user_id"),
        token_expires_at=conn.get("token_expires_at"),
    )


@router.post("/disconnect", response_model=InstagramDisconnectResponse)
async def disconnect_instagram():
    """Remove a conexão ativa com o Instagram."""
    conn = _get_active_connection()
    if not conn:
        raise HTTPException(status_code=404, detail="Nenhuma conexão ativa encontrada.")

    update(TABLE, conn["id"], {"status": "disconnected", "access_token_encrypted": None})
    logger.info("Instagram desconectado para user_id=%s", USER_ID)
    return InstagramDisconnectResponse(status="disconnected")
