"""
Motor de geração de conteúdo para Instagram — Fase 3.

Fluxo:
  1. Busca o Brand Kit do usuário no Supabase.
  2. Monta prompt de sistema com identidade da marca (cores, tom de voz).
  3. Chama grok-3 (xAI) exigindo resposta em JSON estrito.
  4. Faz parse robusto da resposta (tolerante a lixo textual ao redor do JSON).
  5. Valida estrutura mínima e retorna dados prontos para persistência.

Não persiste no banco — a rota é responsável pelo INSERT.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass, field
from typing import Any, Optional

from openai import APIError, APITimeoutError, OpenAI

from app.core import config
from app.services.supabase_service import get_table

logger = logging.getLogger(__name__)

# ─── Tipos internos ───────────────────────────────────────────────────────────

@dataclass
class GeneratedSlide:
    slide_order: int
    title: str
    body: str
    visual_prompt: str


@dataclass
class GeneratedContent:
    caption: str
    hashtags: list[str]
    slides: list[GeneratedSlide] = field(default_factory=list)


# ─── Prompts ─────────────────────────────────────────────────────────────────

_SYSTEM_TEMPLATE = """\
Você é um copywriter e estrategista de conteúdo especializado em Instagram para criadores de conteúdo e marcas pessoais.

## Identidade da Marca
- **Cor primária:** {primary_color}
- **Cor secundária:** {secondary_color}
- **Tom de voz:** {tone_of_voice}

## Sua tarefa
Gerar conteúdo para Instagram no formato "{content_type}" sobre o tema fornecido pelo usuário.
{slide_instruction}

## Regras absolutas
1. Responda SOMENTE com um objeto JSON válido. Nenhum texto antes ou depois.
2. Não use blocos de código markdown (sem ```json). Apenas o JSON puro.
3. O campo "caption" deve ter no máximo 2.200 caracteres.
4. O campo "hashtags" deve ser um array de strings, cada uma começando com "#", contendo entre 10 e 30 hashtags.
   - Misture hashtags de alto alcance (>500k posts), médio (50k–500k) e nicho (<50k).
5. Cada slide deve ter "title" (máx 60 chars), "body" (máx 300 chars) e "visual_prompt" (máx 500 chars).
6. O "visual_prompt" deve descrever uma imagem fotorrealista ou gráfica para esse slide,
   incluindo: composição, paleta de cores da marca ({primary_color}), estilo visual, iluminação e elementos visuais.
7. O tom de voz deve ser fielmente aplicado em todos os textos — caption, títulos e corpos dos slides.

## Estrutura JSON obrigatória
{{
  "caption": "<legenda completa para o post, incluindo chamada para ação>",
  "hashtags": ["#hashtag1", "#hashtag2", ...],
  "slides": [
    {{
      "slide_order": 1,
      "title": "<título impactante do slide>",
      "body": "<texto principal do slide, direto e valioso>",
      "visual_prompt": "<descrição detalhada da imagem a ser gerada para este slide>"
    }}
  ]
}}
"""

_SINGLE_POST_INSTRUCTION = (
    "Gere exatamente 1 slide. O conteúdo deve ser completo e auto-suficiente como um post único."
)

_CAROUSEL_INSTRUCTION = (
    "Gere exatamente {n} slides. O primeiro slide é a capa (gancho visual forte). "
    "Os intermediários desenvolvem o conteúdo com profundidade. "
    "O último slide é a chamada para ação (salvar, seguir, comentar)."
)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_client() -> OpenAI:
    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY não configurada no .env")
    return OpenAI(
        api_key=config.OPENAI_API_KEY,
        base_url=config.OPENAI_BASE_URL,
        timeout=90.0,
    )


def _fetch_brand_kit(user_id: str) -> dict[str, Any]:
    """Retorna o Brand Kit do usuário ou um dict com defaults seguros."""
    try:
        result = (
            get_table("brand_kits")
            .select("primary_color, secondary_color, tone_of_voice, brand_name")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception as exc:
        logger.warning("Não foi possível buscar Brand Kit (user_id=%s): %s", user_id, exc)

    logger.info("Brand Kit não encontrado para user_id=%s — usando defaults.", user_id)
    return {
        "primary_color": "#6366F1",
        "secondary_color": "#F97316",
        "tone_of_voice": (
            "Profissional mas acessível. Linguagem clara, direta e inspiradora. "
            "Foco em valor prático para o leitor."
        ),
        "brand_name": None,
    }


def _build_system_prompt(
    brand_kit: dict[str, Any],
    content_type: str,
    slides_count: int,
) -> str:
    if content_type == "single_post":
        slide_instruction = _SINGLE_POST_INSTRUCTION
    else:
        slide_instruction = _CAROUSEL_INSTRUCTION.format(n=slides_count)

    return _SYSTEM_TEMPLATE.format(
        primary_color=brand_kit.get("primary_color") or "#6366F1",
        secondary_color=brand_kit.get("secondary_color") or "#F97316",
        tone_of_voice=brand_kit.get("tone_of_voice") or "Profissional e acessível.",
        content_type="post único" if content_type == "single_post" else f"carrossel de {slides_count} slides",
        slide_instruction=slide_instruction,
    )


def _extract_json(raw: str) -> dict[str, Any]:
    """
    Extrai o objeto JSON da resposta do Grok com múltiplas estratégias de fallback.

    Estratégias (em ordem):
      1. Parse direto da string limpa.
      2. Extração do bloco ```json ... ```.
      3. Extração do primeiro { ... } usando busca gulosa.
    """
    cleaned = raw.strip()

    # 1. Parse direto
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # 2. Bloco markdown ```json ... ```
    md_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", cleaned, re.DOTALL)
    if md_match:
        try:
            return json.loads(md_match.group(1))
        except json.JSONDecodeError:
            pass

    # 3. Primeiro objeto JSON { ... } na string
    brace_match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if brace_match:
        try:
            return json.loads(brace_match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Não foi possível extrair JSON válido da resposta do Grok. Raw: {raw[:300]!r}")


def _validate_and_build(
    parsed: dict[str, Any],
    content_type: str,
    expected_slides: int,
) -> GeneratedContent:
    """
    Valida a estrutura do JSON e constrói GeneratedContent.
    Aplica correções automáticas em campos menores (trunca textos, normaliza hashtags).
    Lança ValueError se a estrutura for irrecuperável.
    """
    caption: str = parsed.get("caption") or ""
    if not caption:
        raise ValueError("Resposta do Grok não contém 'caption'.")

    # Trunca caption a 2200 chars (limite do Instagram)
    caption = caption[:2200]

    raw_hashtags: list = parsed.get("hashtags") or []
    hashtags: list[str] = []
    for tag in raw_hashtags:
        tag = str(tag).strip()
        if not tag.startswith("#"):
            tag = f"#{tag}"
        hashtags.append(tag)

    # Garante pelo menos uma hashtag para não quebrar o schema
    if not hashtags:
        logger.warning("Grok não retornou hashtags; usando fallback genérico.")
        hashtags = ["#instagram", "#conteudo", "#criadores"]

    raw_slides: list = parsed.get("slides") or []
    if not raw_slides:
        raise ValueError("Resposta do Grok não contém 'slides'.")

    slides: list[GeneratedSlide] = []
    for i, s in enumerate(raw_slides, start=1):
        if not isinstance(s, dict):
            logger.warning("Slide %d ignorado — não é um objeto dict.", i)
            continue

        title = str(s.get("title") or "")[:60] or f"Slide {i}"
        body = str(s.get("body") or "")[:300]
        visual_prompt = str(s.get("visual_prompt") or "")[:500]
        order = int(s.get("slide_order") or i)

        slides.append(GeneratedSlide(
            slide_order=order,
            title=title,
            body=body,
            visual_prompt=visual_prompt,
        ))

    if not slides:
        raise ValueError("Nenhum slide válido encontrado na resposta do Grok.")

    # Avisa se a contagem difere do esperado, mas não falha
    if len(slides) != expected_slides:
        logger.warning(
            "Grok retornou %d slides mas %d eram esperados. Prosseguindo com o retornado.",
            len(slides),
            expected_slides,
        )

    # Reordena por slide_order para consistência
    slides.sort(key=lambda s: s.slide_order)
    # Renumera sequencialmente para evitar gaps
    for idx, slide in enumerate(slides, start=1):
        slide.slide_order = idx

    return GeneratedContent(caption=caption, hashtags=hashtags, slides=slides)


# ─── Ponto de entrada público ─────────────────────────────────────────────────

async def generate_content(
    user_id: str,
    theme: str,
    content_type: str,
    slides_count: Optional[int] = None,
) -> GeneratedContent:
    """
    Gera conteúdo para Instagram usando o Grok-3.

    Args:
        user_id:       ID fixo do usuário MVP.
        theme:         Tema/briefing do conteúdo.
        content_type:  "single_post" ou "carousel".
        slides_count:  Número de slides (obrigatório para carousel).

    Returns:
        GeneratedContent com caption, hashtags e slides.

    Raises:
        RuntimeError:  Falha na API da xAI (timeout, quota, etc.).
        ValueError:    Resposta da IA inválida ou irrecuperável.
    """
    effective_slides = 1 if content_type == "single_post" else (slides_count or 3)

    # 1. Brand Kit
    brand_kit = _fetch_brand_kit(user_id)
    logger.info(
        "Brand Kit carregado: primary=%s tone_len=%d",
        brand_kit.get("primary_color"),
        len(brand_kit.get("tone_of_voice") or ""),
    )

    # 2. Prompt
    system_prompt = _build_system_prompt(brand_kit, content_type, effective_slides)
    user_message = (
        f"Crie conteúdo para Instagram sobre o seguinte tema:\n\n"
        f"**Tema:** {theme}\n\n"
        f"Lembre-se: responda APENAS com o JSON, sem qualquer texto adicional."
    )

    # 3. Chamada ao Grok-3
    client = _build_client()
    logger.info(
        "Chamando %s: type=%s slides=%d theme_len=%d",
        config.OPENAI_TEXT_MODEL,
        content_type,
        effective_slides,
        len(theme),
    )

    try:
        response = client.chat.completions.create(
            model=config.OPENAI_TEXT_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=4096,
            temperature=0.7,       # criatividade controlada
            top_p=0.9,
        )
    except APITimeoutError as exc:
        logger.error("Timeout na chamada ao GPT-4o: %s", exc)
        raise RuntimeError(
            "A API da OpenAI não respondeu a tempo. Tente novamente em alguns instantes."
        ) from exc
    except APIError as exc:
        logger.error("Erro na API do GPT-4o (status=%s): %s", exc.status_code, exc.message)
        raise RuntimeError(f"Erro na API da OpenAI: {exc.message}") from exc

    raw_text: str = response.choices[0].message.content or ""
    logger.info("Resposta do Grok-3 recebida (%d chars).", len(raw_text))

    # 4. Parse + validação
    try:
        parsed = _extract_json(raw_text)
    except ValueError as exc:
        logger.error("Falha no parse JSON da resposta do Grok: %s", exc)
        raise

    result = _validate_and_build(parsed, content_type, effective_slides)
    logger.info(
        "Conteúdo gerado: %d slides, caption=%d chars, hashtags=%d",
        len(result.slides),
        len(result.caption),
        len(result.hashtags),
    )
    return result
