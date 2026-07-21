"""
Rotas de Publicação no Instagram — Fase 4.

POST /instagram/publish/{project_id}  → publica o projeto no Instagram
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from app.core import config
from app.services import publishing_service
from app.services.supabase_service import get_table

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/instagram", tags=["Publish"])

USER_ID = config.MVP_USER_ID
TABLE_PROJECTS = "content_projects"
TABLE_SLIDES = "content_slides"


class PublishRequest(BaseModel):
    """Payload opcional para publicação. image_urls é obrigatório quando o projeto não tem media_url nos slides."""
    image_urls: Optional[list[str]] = None


class PublishResponse(BaseModel):
    status: str
    instagram_media_id: Optional[str] = None
    instagram_post_url: Optional[str] = None
    message: str


def _get_project(project_id: str) -> dict:
    result = (
        get_table(TABLE_PROJECTS)
        .select("*")
        .eq("id", project_id)
        .eq("user_id", USER_ID)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return result.data[0]


def _get_slides(project_id: str) -> list[dict]:
    result = (
        get_table(TABLE_SLIDES)
        .select("*")
        .eq("project_id", project_id)
        .order("slide_order", desc=False)
        .execute()
    )
    return result.data or []


def _update_project(project_id: str, data: dict) -> None:
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    get_table(TABLE_PROJECTS).update(data).eq("id", project_id).execute()


@router.post("/publish/{project_id}", response_model=PublishResponse)
async def publish_project(project_id: str, body: PublishRequest = PublishRequest()):
    """
    Publica um projeto de conteúdo no Instagram.

    - Para post único: espera 1 image_url no body (ou media_url no slide).
    - Para carrossel: espera N image_urls no body (ou media_url em cada slide).
    - Atualiza o status do projeto para 'published' ou 'failed' no Supabase.
    """
    project = _get_project(project_id)

    if project["status"] == "published":
        raise HTTPException(
            status_code=409,
            detail="Este projeto já foi publicado no Instagram.",
        )

    slides = _get_slides(project_id)
    content_type = project["type"]
    caption = project.get("caption") or ""
    hashtags = project.get("hashtags") or []

    # Resolve image_urls: body tem prioridade; fallback para media_url dos slides
    image_urls: list[str] = []
    if body.image_urls:
        image_urls = body.image_urls
    else:
        image_urls = [s["media_url"] for s in slides if s.get("media_url")]

    if not image_urls:
        raise HTTPException(
            status_code=422,
            detail=(
                "Nenhuma imagem fornecida. "
                "Envie image_urls no body ou gere as imagens dos slides antes de publicar."
            ),
        )

    # Marca como publicando
    _update_project(project_id, {"status": "publishing"})

    try:
        if content_type == "single_post":
            result = await publishing_service.publish_single_post(
                image_url=image_urls[0],
                caption=caption,
                hashtags=hashtags,
            )
        else:
            result = await publishing_service.publish_carousel(
                image_urls=image_urls,
                caption=caption,
                hashtags=hashtags,
            )
    except (httpx.HTTPError, RuntimeError, ValueError) as exc:
        logger.error("Falha ao publicar projeto %s: %s", project_id, exc)
        _update_project(project_id, {
            "status": "failed",
            "error_message": str(exc),
        })
        raise HTTPException(
            status_code=502,
            detail=f"Falha ao publicar no Instagram: {exc}",
        )

    # Sucesso — persiste media_id e post_url
    media_id = result.get("media_id")
    post_url = result.get("post_url")

    _update_project(project_id, {
        "status": "published",
        "instagram_media_id": media_id,
        "instagram_post_url": post_url,
        "error_message": None,
    })

    logger.info("Projeto %s publicado. media_id=%s url=%s", project_id, media_id, post_url)

    return PublishResponse(
        status="published",
        instagram_media_id=media_id,
        instagram_post_url=post_url,
        message="Publicado com sucesso no Instagram! 🎉",
    )
