"""
Rotas de Geração de Conteúdo — Fase 3.

POST /content/generate   → gera conteúdo via xAI e persiste no Supabase
GET  /content/{id}       → retorna projeto com slides aninhados
GET  /content            → lista projetos do usuário (mais recentes primeiro)
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List

from app.core import config
from app.models.schemas import (
    ContentGenerateRequest,
    ContentProjectResponse,
    ContentUpdateRequest,
    SlideResponse,
)
from app.services import ai_service, image_service
from app.services.supabase_service import get_table, supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/content", tags=["Content"])

USER_ID = config.MVP_USER_ID
TABLE_PROJECTS = "content_projects"
TABLE_SLIDES = "content_slides"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_project_response(project: dict, slides: list[dict]) -> ContentProjectResponse:
    """Monta ContentProjectResponse a partir dos dicts crus do Supabase."""
    slide_responses = [
        SlideResponse(
            id=s["id"],
            project_id=s["project_id"],
            slide_order=s["slide_order"],
            title=s.get("title"),
            body=s.get("body"),
            visual_prompt=s.get("visual_prompt"),
            media_url=s.get("media_url"),
            created_at=s["created_at"],
        )
        for s in sorted(slides, key=lambda x: x["slide_order"])
    ]

    return ContentProjectResponse(
        id=project["id"],
        user_id=project["user_id"],
        type=project["type"],
        theme=project["theme"],
        slides_count=project["slides_count"],
        caption=project.get("caption"),
        hashtags=project.get("hashtags") or [],
        status=project["status"],
        instagram_media_id=project.get("instagram_media_id"),
        instagram_post_url=project.get("instagram_post_url"),
        error_message=project.get("error_message"),
        slides=slide_responses,
        created_at=project["created_at"],
        updated_at=project["updated_at"],
    )


def _fetch_slides(project_id: str) -> list[dict]:
    result = (
        get_table(TABLE_SLIDES)
        .select("*")
        .eq("project_id", project_id)
        .order("slide_order", desc=False)
        .execute()
    )
    return result.data or []


# ─── Rotas ───────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=ContentProjectResponse, status_code=201)
async def generate_content(payload: ContentGenerateRequest):
    """
    Gera um post ou carrossel para Instagram usando o gpt-4o (OpenAI).

    1. Busca o Brand Kit do usuário no Supabase.
    2. Monta prompt de sistema com identidade da marca.
    3. Chama gpt-4o e faz parse do JSON retornado.
    4. Persiste content_project e content_slides.
    5. Retorna o projeto completo com slides aninhados.
    """
    if payload.type == "single_post":
        effective_slides = 1
    elif payload.type == "reel":
        effective_slides = payload.slides_count or 4
    else:
        effective_slides = payload.slides_count or 3

    # 1. Geração via IA
    try:
        generated = await ai_service.generate_content(
            user_id=USER_ID,
            theme=payload.theme,
            content_type=payload.type,
            slides_count=effective_slides,
        )
    except RuntimeError as exc:
        # Falha de rede / timeout / quota da OpenAI
        logger.error("Falha na API da OpenAI: %s", exc)
        raise HTTPException(status_code=502, detail=str(exc))
    except ValueError as exc:
        # Resposta da IA irrecuperável (JSON malformado, estrutura ausente)
        logger.error("Resposta inválida do gpt-4o: %s", exc)
        raise HTTPException(
            status_code=422,
            detail=(
                "A IA retornou uma resposta inválida. "
                "Tente novamente ou reformule o tema."
            ),
        )

    now = datetime.now(timezone.utc).isoformat()

    # 2. Persistir content_project
    project_data = {
        "user_id": USER_ID,
        "type": payload.type,
        "theme": payload.theme,
        "slides_count": len(generated.slides),
        "caption": generated.caption,
        "hashtags": generated.hashtags,
        "status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    try:
        project_result = get_table(TABLE_PROJECTS).insert(project_data).execute()
    except Exception as exc:
        logger.error("Erro ao inserir content_project no Supabase: %s", exc)
        raise HTTPException(
            status_code=500,
            detail="Conteúdo gerado com sucesso, mas falhou ao salvar no banco. Tente novamente.",
        )

    if not project_result.data:
        raise HTTPException(status_code=500, detail="Erro ao persistir o projeto de conteúdo.")

    project = project_result.data[0]
    project_id = project["id"]
    logger.info("content_project criado: id=%s type=%s", project_id, payload.type)

    # 3. Persistir content_slides
    slides_data = [
        {
            "project_id": project_id,
            "slide_order": slide.slide_order,
            "title": slide.title,
            "body": slide.body,
            "visual_prompt": slide.visual_prompt,
            "created_at": now,
        }
        for slide in generated.slides
    ]

    try:
        slides_result = get_table(TABLE_SLIDES).insert(slides_data).execute()
    except Exception as exc:
        logger.error("Erro ao inserir slides no Supabase (project_id=%s): %s", project_id, exc)
        # Projeto foi criado — retorna sem slides para não perder o conteúdo
        raise HTTPException(
            status_code=500,
            detail="Projeto criado, mas os slides falharam ao salvar. Tente gerar novamente.",
        )

    slides = slides_result.data or []
    logger.info("Inseridos %d slides para project_id=%s", len(slides), project_id)

    return _build_project_response(project, slides)


@router.patch("/{project_id}", response_model=ContentProjectResponse)
async def update_project(project_id: str, payload: ContentUpdateRequest):
    """
    Atualiza parcialmente um projeto de conteúdo (caption, hashtags, slides).
    """
    # Verificar existência
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

    # Atualizar content_projects se necessário
    project_update: dict = {}
    if payload.caption is not None:
        project_update["caption"] = payload.caption
    if payload.hashtags is not None:
        project_update["hashtags"] = payload.hashtags

    if project_update:
        project_update["updated_at"] = datetime.now(timezone.utc).isoformat()
        try:
            get_table(TABLE_PROJECTS).update(project_update).eq("id", project_id).execute()
        except Exception as exc:
            logger.error("Erro ao atualizar content_project %s: %s", project_id, exc)
            raise HTTPException(status_code=500, detail="Erro ao atualizar o projeto.")

    # Atualizar slides individualmente
    if payload.slides:
        for slide_item in payload.slides:
            slide_update: dict = {}
            if slide_item.title is not None:
                slide_update["title"] = slide_item.title
            if slide_item.body is not None:
                slide_update["body"] = slide_item.body
            if slide_item.visual_prompt is not None:
                slide_update["visual_prompt"] = slide_item.visual_prompt
            if slide_update:
                try:
                    get_table(TABLE_SLIDES).update(slide_update).eq("id", slide_item.id).execute()
                except Exception as exc:
                    logger.error("Erro ao atualizar slide %s: %s", slide_item.id, exc)
                    raise HTTPException(status_code=500, detail=f"Erro ao atualizar slide {slide_item.id}.")

    # Retornar projeto atualizado
    updated_result = (
        get_table(TABLE_PROJECTS)
        .select("*")
        .eq("id", project_id)
        .limit(1)
        .execute()
    )
    project = updated_result.data[0]
    slides = _fetch_slides(project_id)
    return _build_project_response(project, slides)


@router.get("/{project_id}", response_model=ContentProjectResponse)
async def get_project(project_id: str):
    """Retorna um projeto de conteúdo com todos os seus slides."""
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

    project = result.data[0]
    slides = _fetch_slides(project_id)
    return _build_project_response(project, slides)


@router.get("", response_model=List[ContentProjectResponse])
async def list_projects(limit: int = 20, offset: int = 0):
    """Lista os projetos de conteúdo do usuário (mais recentes primeiro)."""
    result = (
        get_table(TABLE_PROJECTS)
        .select("*")
        .eq("user_id", USER_ID)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    projects = result.data or []
    if not projects:
        return []

    # Busca todos os slides de uma vez (evita N+1 queries)
    project_ids = [p["id"] for p in projects]
    slides_result = (
        get_table(TABLE_SLIDES)
        .select("*")
        .in_("project_id", project_ids)
        .order("slide_order", desc=False)
        .execute()
    )
    all_slides = slides_result.data or []

    # Agrupa slides por project_id em memória
    slides_by_project: dict[str, list[dict]] = {}
    for slide in all_slides:
        pid = slide["project_id"]
        slides_by_project.setdefault(pid, []).append(slide)

    return [
        _build_project_response(project, slides_by_project.get(project["id"], []))
        for project in projects
    ]


ALLOWED_IMAGE_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
ALLOWED_VIDEO_MIME = {"video/mp4", "video/quicktime"}
MAX_IMAGE_SIZE = 10 * 1024 * 1024    # 10 MB
MAX_VIDEO_SIZE = 100 * 1024 * 1024   # 100 MB


@router.post("/upload-image")
async def upload_content_image(file: UploadFile = File(...)):
    """
    Faz upload de uma imagem para o bucket content-media no Supabase Storage.
    Retorna a URL pública do arquivo.
    """
    if file.content_type not in ALLOWED_IMAGE_MIME:
        raise HTTPException(
            status_code=422,
            detail=f"Tipo de arquivo não suportado: {file.content_type}. Use JPEG, PNG ou WebP.",
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=422, detail="Arquivo muito grande. Máximo 10 MB.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "jpg"
    storage_path = f"content/{uuid.uuid4()}.{ext}"

    try:
        supabase.storage.from_("content-media").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type},
        )
    except Exception as exc:
        logger.error("Erro ao fazer upload da imagem: %s", exc)
        raise HTTPException(status_code=500, detail=f"Falha no upload: {exc}")

    public_url = supabase.storage.from_("content-media").get_public_url(storage_path)
    logger.info("Imagem enviada: %s", public_url)
    return {"url": public_url}


@router.post("/upload-video")
async def upload_content_video(file: UploadFile = File(...)):
    """
    Faz upload de um vídeo para o bucket content-media no Supabase Storage.
    Aceita MP4 e MOV. Máximo 100 MB.
    Retorna a URL pública do arquivo (usada para publicar Reels).
    """
    if file.content_type not in ALLOWED_VIDEO_MIME:
        raise HTTPException(
            status_code=422,
            detail=f"Tipo de arquivo não suportado: {file.content_type}. Use MP4 ou MOV.",
        )

    content = await file.read()
    if len(content) > MAX_VIDEO_SIZE:
        raise HTTPException(status_code=422, detail="Vídeo muito grande. Máximo 100 MB.")

    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "mp4"
    storage_path = f"videos/{uuid.uuid4()}.{ext}"

    try:
        supabase.storage.from_("content-media").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": file.content_type},
        )
    except Exception as exc:
        logger.error("Erro ao fazer upload do vídeo: %s", exc)
        raise HTTPException(status_code=500, detail=f"Falha no upload: {exc}")

    public_url = supabase.storage.from_("content-media").get_public_url(storage_path)
    logger.info("Vídeo enviado: %s", public_url)
    return {"url": public_url}


@router.post("/{project_id}/slides/{slide_id}/generate-image")
async def generate_slide_image(project_id: str, slide_id: str):
    """
    Gera uma imagem via DALL-E 3 usando o visual_prompt do slide.
    Persiste no Supabase Storage e atualiza media_url do slide.
    Retorna a URL pública da imagem gerada.
    """
    # Verifica que o projeto pertence ao usuário
    proj_result = (
        get_table(TABLE_PROJECTS)
        .select("id")
        .eq("id", project_id)
        .eq("user_id", USER_ID)
        .limit(1)
        .execute()
    )
    if not proj_result.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")

    # Busca o slide
    slide_result = (
        get_table(TABLE_SLIDES)
        .select("id, visual_prompt")
        .eq("id", slide_id)
        .eq("project_id", project_id)
        .limit(1)
        .execute()
    )
    if not slide_result.data:
        raise HTTPException(status_code=404, detail="Slide não encontrado.")

    slide = slide_result.data[0]
    visual_prompt = slide.get("visual_prompt") or ""
    if not visual_prompt:
        raise HTTPException(
            status_code=422,
            detail="Este slide não possui um prompt visual. Edite o slide e adicione um antes de gerar a imagem.",
        )

    # Gera a imagem via DALL-E 3
    try:
        image_url = await image_service.generate_and_store(visual_prompt)
    except RuntimeError as exc:
        logger.error("Falha na geração de imagem para slide %s: %s", slide_id, exc)
        raise HTTPException(status_code=502, detail=str(exc))

    # Atualiza media_url do slide no banco
    try:
        get_table(TABLE_SLIDES).update({"media_url": image_url}).eq("id", slide_id).execute()
    except Exception as exc:
        logger.error("Erro ao atualizar media_url do slide %s: %s", slide_id, exc)
        raise HTTPException(status_code=500, detail="Imagem gerada, mas falhou ao salvar no banco.")

    logger.info("Imagem gerada para slide %s: %s", slide_id, image_url)
    return {"url": image_url, "slide_id": slide_id}
