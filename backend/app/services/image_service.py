"""
Serviço de geração de imagens via DALL-E 3 (OpenAI).

Fluxo:
  1. Recebe o visual_prompt gerado pela IA para um slide.
  2. Enriquece o prompt com instruções de qualidade e proporção.
  3. Chama DALL-E 3 → recebe URL temporária (expira em ~1h).
  4. Baixa a imagem e persiste no bucket content-media do Supabase.
  5. Retorna URL pública permanente.
"""

from __future__ import annotations

import logging
import uuid

import httpx
from openai import APIError, APITimeoutError, OpenAI

from app.core import config
from app.services.supabase_service import supabase

logger = logging.getLogger(__name__)

_BUCKET = "content-media"
_STORAGE_PREFIX = "generated"

# Singleton do cliente OpenAI para geração de imagens
_openai_client: OpenAI | None = None


def _get_client() -> OpenAI:
    global _openai_client
    if _openai_client is None:
        if not config.OPENAI_API_KEY:
            raise RuntimeError("OPENAI_API_KEY não configurada no .env")
        _openai_client = OpenAI(
            api_key=config.OPENAI_API_KEY,
            base_url=config.OPENAI_BASE_URL,
            timeout=120.0,
        )
    return _openai_client


async def generate_and_store(visual_prompt: str) -> str:
    """
    Gera uma imagem via DALL-E 3 a partir do visual_prompt e persiste no Supabase.

    Args:
        visual_prompt: Descrição da imagem gerada pela IA no momento da criação do conteúdo.

    Returns:
        URL pública permanente da imagem no Supabase Storage.

    Raises:
        RuntimeError: Falha na API da OpenAI ou no upload para o Supabase.
    """
    enriched_prompt = (
        f"{visual_prompt}. "
        "Proporção quadrada 1:1. Alta qualidade fotorrealista. "
        "Iluminação profissional. Sem texto ou letras sobrepostos na imagem."
    )

    logger.info("Gerando imagem via DALL-E 3. prompt_len=%d", len(enriched_prompt))

    client = _get_client()

    try:
        response = client.images.generate(
            model="dall-e-3",
            prompt=enriched_prompt,
            size="1024x1024",
            quality="standard",
            n=1,
        )
    except APITimeoutError as exc:
        logger.error("Timeout na chamada ao DALL-E 3: %s", exc)
        raise RuntimeError("DALL-E 3 não respondeu a tempo. Tente novamente.") from exc
    except APIError as exc:
        logger.error("Erro na API do DALL-E 3 (status=%s): %s", exc.status_code, exc.message)
        raise RuntimeError(f"Erro ao gerar imagem: {exc.message}") from exc

    temp_url = response.data[0].url if response.data else None
    if not temp_url:
        raise RuntimeError("DALL-E 3 não retornou URL de imagem.")

    logger.info("Imagem gerada pela OpenAI — baixando...")

    # Baixa a imagem temporária (URL expira em ~1h)
    async with httpx.AsyncClient() as http:
        try:
            img_resp = await http.get(temp_url, timeout=60)
            img_resp.raise_for_status()
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Falha ao baixar imagem gerada: {exc}") from exc

    # Persiste no Supabase Storage
    storage_path = f"{_STORAGE_PREFIX}/{uuid.uuid4()}.png"
    try:
        supabase.storage.from_(_BUCKET).upload(
            path=storage_path,
            file=img_resp.content,
            file_options={"content-type": "image/png"},
        )
    except Exception as exc:
        logger.error("Falha ao salvar imagem no Supabase: %s", exc)
        raise RuntimeError(f"Falha ao salvar imagem: {exc}") from exc

    public_url = supabase.storage.from_(_BUCKET).get_public_url(storage_path)
    logger.info("Imagem gerada e persistida: %s", public_url)
    return public_url
