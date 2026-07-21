"""
Serviço de publicação no Instagram via Meta Graph API.
Usa INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID do .env diretamente (MVP single-user).

Fluxo para post único:
  1. Cria container de mídia (image_url + caption)
  2. Aguarda status FINISHED
  3. Publica via media_publish

Fluxo para carrossel:
  1. Cria um container por slide (is_carousel_item=true)
  2. Aguarda FINISHED em cada um
  3. Cria container principal CAROUSEL com os IDs filhos
  4. Aguarda FINISHED
  5. Publica via media_publish
"""

import asyncio
import logging
from typing import Optional

import httpx

from app.core import config

logger = logging.getLogger(__name__)

_MAX_POLL = 12         # tentativas de polling para imagens (12 × 5s = 60s máx)
_MAX_POLL_VIDEO = 60  # tentativas para vídeo/reel (60 × 5s = 5min máx)
_POLL_INTERVAL = 5    # segundos entre cada poll


def _base() -> str:
    return config.META_API_BASE


def _token() -> str:
    if not config.INSTAGRAM_ACCESS_TOKEN:
        raise RuntimeError("INSTAGRAM_ACCESS_TOKEN não configurado no .env")
    return config.INSTAGRAM_ACCESS_TOKEN


def _ig_id() -> str:
    if not config.INSTAGRAM_BUSINESS_ID:
        raise RuntimeError("INSTAGRAM_BUSINESS_ID não configurado no .env")
    return config.INSTAGRAM_BUSINESS_ID


async def _wait_ready(
    client: httpx.AsyncClient,
    container_id: str,
    max_poll: int = _MAX_POLL,
) -> None:
    """Aguarda o container ficar com status FINISHED. Lança RuntimeError em caso de erro/timeout."""
    for attempt in range(max_poll):
        resp = await client.get(
            f"{_base()}/{container_id}",
            params={"fields": "status_code", "access_token": _token()},
            timeout=15,
        )
        resp.raise_for_status()
        status = resp.json().get("status_code", "")
        if status == "FINISHED":
            return
        if status == "ERROR":
            raise RuntimeError(f"Container {container_id} retornou erro na Meta: {resp.json()}")
        logger.debug("Container %s aguardando... tentativa %d status=%s", container_id, attempt + 1, status)
        await asyncio.sleep(_POLL_INTERVAL)

    raise RuntimeError(f"Timeout: container {container_id} não ficou pronto em {max_poll * _POLL_INTERVAL}s")


async def _create_single_container(
    client: httpx.AsyncClient,
    image_url: str,
    caption: str,
    hashtags: list[str],
) -> str:
    """Cria container para post único. Retorna o container ID."""
    full_caption = f"{caption}\n\n{' '.join(hashtags)}" if hashtags else caption
    resp = await client.post(
        f"{_base()}/{_ig_id()}/media",
        data={
            "access_token": _token(),
            "image_url": image_url,
            "caption": full_caption,
        },
        timeout=30,
    )
    if not resp.is_success:
        raise RuntimeError(f"Erro ao criar container (HTTP {resp.status_code}): {resp.text}")
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro ao criar container: {result}")
    return result["id"]


async def _create_carousel_item(client: httpx.AsyncClient, image_url: str) -> str:
    """Cria um item de carrossel (sem caption). Retorna o container ID."""
    resp = await client.post(
        f"{_base()}/{_ig_id()}/media",
        data={
            "access_token": _token(),
            "image_url": image_url,
            "is_carousel_item": "true",
        },
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro ao criar item de carrossel: {result}")
    return result["id"]


async def _create_carousel_container(
    client: httpx.AsyncClient,
    children_ids: list[str],
    caption: str,
    hashtags: list[str],
) -> str:
    """Cria o container principal do carrossel. Retorna o container ID."""
    full_caption = f"{caption}\n\n{' '.join(hashtags)}" if hashtags else caption
    resp = await client.post(
        f"{_base()}/{_ig_id()}/media",
        data={
            "access_token": _token(),
            "media_type": "CAROUSEL",
            "children": ",".join(children_ids),
            "caption": full_caption,
        },
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro ao criar container de carrossel: {result}")
    return result["id"]


async def _publish_container(client: httpx.AsyncClient, container_id: str) -> str:
    """Publica o container. Retorna o media ID do post publicado."""
    resp = await client.post(
        f"{_base()}/{_ig_id()}/media_publish",
        data={
            "access_token": _token(),
            "creation_id": container_id,
        },
        timeout=30,
    )
    resp.raise_for_status()
    result = resp.json()
    if "id" not in result:
        raise RuntimeError(f"Erro ao publicar: {result}")
    return result["id"]


async def publish_single_post(
    image_url: str,
    caption: str,
    hashtags: list[str],
) -> dict:
    """
    Publica um post único no Instagram.

    Returns:
        dict com "media_id" e "post_url"
    """
    logger.info("Publicando post único. image_url=%s", image_url)
    async with httpx.AsyncClient() as client:
        container_id = await _create_single_container(client, image_url, caption, hashtags)
        logger.info("Container criado: %s — aguardando processamento...", container_id)
        await _wait_ready(client, container_id)
        media_id = await _publish_container(client, container_id)

    post_url = f"https://www.instagram.com/p/{_media_id_to_shortcode(media_id)}/" if media_id else None
    logger.info("Post único publicado. media_id=%s", media_id)
    return {"media_id": media_id, "post_url": post_url}


async def publish_carousel(
    image_urls: list[str],
    caption: str,
    hashtags: list[str],
) -> dict:
    """
    Publica um carrossel no Instagram.

    Args:
        image_urls: Lista de URLs públicas das imagens dos slides (mín. 2, máx. 10).

    Returns:
        dict com "media_id" e "post_url"
    """
    if len(image_urls) < 2:
        raise ValueError("Carrossel exige mínimo 2 imagens.")
    if len(image_urls) > 10:
        raise ValueError("Carrossel suporta no máximo 10 imagens.")

    logger.info("Publicando carrossel com %d slides.", len(image_urls))
    async with httpx.AsyncClient() as client:
        # 1. Criar e aguardar cada item
        children_ids: list[str] = []
        for i, url in enumerate(image_urls, start=1):
            item_id = await _create_carousel_item(client, url)
            logger.info("Item %d/%d criado: %s — aguardando...", i, len(image_urls), item_id)
            await _wait_ready(client, item_id)
            children_ids.append(item_id)

        # 2. Container principal
        carousel_id = await _create_carousel_container(client, children_ids, caption, hashtags)
        logger.info("Container do carrossel criado: %s — aguardando...", carousel_id)
        await _wait_ready(client, carousel_id)

        # 3. Publicar
        media_id = await _publish_container(client, carousel_id)

    post_url = f"https://www.instagram.com/p/{_media_id_to_shortcode(media_id)}/" if media_id else None
    logger.info("Carrossel publicado. media_id=%s", media_id)
    return {"media_id": media_id, "post_url": post_url}


async def publish_reel(
    video_url: str,
    caption: str,
    hashtags: list[str],
    cover_url: Optional[str] = None,
) -> dict:
    """
    Publica um Reel no Instagram via Meta Graph API.

    Args:
        video_url:  URL pública do vídeo MP4 (máx. 90s, proporção 9:16 recomendada).
        caption:    Legenda do Reel.
        hashtags:   Lista de hashtags.
        cover_url:  URL pública da imagem de capa (opcional).

    Returns:
        dict com "media_id" e "post_url"
    """
    logger.info("Publicando Reel. video_url=%s", video_url)
    full_caption = f"{caption}\n\n{' '.join(hashtags)}" if hashtags else caption

    async with httpx.AsyncClient() as client:
        # 1. Criar container de Reel
        payload: dict = {
            "access_token": _token(),
            "media_type": "REELS",
            "video_url": video_url,
            "caption": full_caption,
            "share_to_feed": "true",
        }
        if cover_url:
            payload["cover_url"] = cover_url

        resp = await client.post(
            f"{_base()}/{_ig_id()}/media",
            data=payload,
            timeout=30,
        )
        if not resp.is_success:
            raise RuntimeError(f"Erro ao criar container do Reel (HTTP {resp.status_code}): {resp.text}")
        result = resp.json()
        if "id" not in result:
            raise RuntimeError(f"Erro ao criar container do Reel: {result}")

        container_id = result["id"]
        logger.info("Container do Reel criado: %s — aguardando processamento (até 5 min)...", container_id)

        # 2. Aguardar processamento (vídeos demoram mais que imagens)
        await _wait_ready(client, container_id, max_poll=_MAX_POLL_VIDEO)

        # 3. Publicar
        media_id = await _publish_container(client, container_id)

    post_url = f"https://www.instagram.com/reel/{_media_id_to_shortcode(media_id)}/" if media_id else None
    logger.info("Reel publicado. media_id=%s", media_id)
    return {"media_id": media_id, "post_url": post_url}


async def delete_media(media_id: str) -> None:
    """
    Remove uma mídia publicada do Instagram via Meta Graph API.
    Lança RuntimeError se a API retornar erro.
    """
    logger.info("Removendo mídia do Instagram. media_id=%s", media_id)
    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{_base()}/{media_id}",
            params={"access_token": _token()},
            timeout=15,
        )
        if not resp.is_success:
            raise RuntimeError(
                f"Erro ao remover mídia (HTTP {resp.status_code}): {resp.text}"
            )
        result = resp.json()
        if not result.get("success"):
            raise RuntimeError(f"Meta API não confirmou remoção: {result}")
    logger.info("Mídia %s removida do Instagram.", media_id)


def _media_id_to_shortcode(media_id: str) -> str:
    """
    Converte media_id numérico em shortcode Base64 do Instagram.
    Usado para montar a URL do post: instagram.com/p/<shortcode>/
    """
    alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
    num = int(media_id.split("_")[0])  # remove sufixo de conta se houver
    shortcode = ""
    while num > 0:
        shortcode = alphabet[num % 64] + shortcode
        num //= 64
    return shortcode
