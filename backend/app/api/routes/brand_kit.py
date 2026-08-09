"""
Rotas do Brand Kit — Fase 2.

GET  /brand-kit          → retorna o Brand Kit do usuário atual
POST /brand-kit          → cria ou atualiza o Brand Kit manualmente
POST /brand-kit/upload   → extrai identidade visual via OpenAI Vision
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import Optional

from app.core.auth import get_current_user
from app.models.schemas import (
    BrandKitCreate,
    BrandKitResponse,
    BrandKitExtractionResponse,
)
from app.services.supabase_service import get_table
from app.services import brand_extraction_service
from app.utils.file_validation import validate_brand_asset

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/brand-kit", tags=["Brand Kit"])

TABLE = "brand_kits"


def _get_existing(user_id: str) -> dict | None:
    result = (
        get_table(TABLE)
        .select("*")
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    data = result.data
    return data[0] if data else None


@router.get("", response_model=BrandKitResponse)
async def get_brand_kit(user: dict = Depends(get_current_user)):
    """Retorna o Brand Kit configurado pelo usuário."""
    kit = _get_existing(user["sub"])
    if not kit:
        raise HTTPException(
            status_code=404,
            detail="Brand Kit ainda não configurado. Use POST /brand-kit para criar.",
        )
    return kit


@router.post("", response_model=BrandKitResponse, status_code=200)
async def upsert_brand_kit(
    payload: BrandKitCreate,
    user: dict = Depends(get_current_user),
):
    """Cria ou atualiza o Brand Kit manualmente."""
    user_id = user["sub"]
    now = datetime.now(timezone.utc).isoformat()
    existing = _get_existing(user_id)

    if existing:
        update_data = payload.model_dump()
        update_data["updated_at"] = now

        result = (
            get_table(TABLE)
            .update(update_data)
            .eq("id", existing["id"])
            .execute()
        )
        if not result.data:
            logger.error("Falha ao atualizar Brand Kit para user_id=%s", user_id)
            raise HTTPException(status_code=500, detail="Erro ao atualizar o Brand Kit.")

        logger.info("Brand Kit atualizado para user_id=%s", user_id)
        return result.data[0]

    insert_data = payload.model_dump()
    insert_data["user_id"] = user_id
    insert_data["created_at"] = now
    insert_data["updated_at"] = now

    result = get_table(TABLE).insert(insert_data).execute()
    if not result.data:
        logger.error("Falha ao criar Brand Kit para user_id=%s", user_id)
        raise HTTPException(status_code=500, detail="Erro ao criar o Brand Kit.")

    logger.info("Brand Kit criado para user_id=%s", user_id)
    return result.data[0]


@router.post("/upload", response_model=BrandKitExtractionResponse)
async def upload_brand_identity(
    file: UploadFile = File(..., description="Imagem ou PDF da identidade visual (máx 10 MB)"),
    extra_context: Optional[str] = Form(
        None,
        description="Contexto textual adicional: nome da marca, nicho, público-alvo, etc.",
    ),
    user: dict = Depends(get_current_user),
):
    """
    Recebe um arquivo de identidade visual (PNG, JPG, SVG, PDF),
    envia para o OpenAI Vision e retorna a extração estruturada.

    O frontend deve exibir o resultado para o usuário confirmar/editar
    antes de persistir via POST /brand-kit.
    """
    content = await validate_brand_asset(file)
    mime_type = file.content_type or "application/octet-stream"

    logger.info(
        "Upload recebido: filename=%s mime=%s size=%d bytes user_id=%s",
        file.filename,
        mime_type,
        len(content),
        user["sub"],
    )

    try:
        extraction = await brand_extraction_service.extract_brand_identity(
            file_bytes=content,
            mime_type=mime_type,
            extra_context=extra_context,
        )
    except RuntimeError as exc:
        logger.error("Erro na extração via OpenAI: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))

    logger.info(
        "Extração concluída: brand_name=%s primary=%s secondary=%s",
        extraction.brand_name,
        extraction.primary_color,
        extraction.secondary_color,
    )
    return extraction
