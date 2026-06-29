"""
Serviço de extração de identidade visual via xAI Grok.

Fluxo:
  1. Recebe bytes do arquivo (PNG/JPG/SVG/PDF) + contexto textual opcional.
  2. Envia para grok-2-vision-1212 com prompt estruturado.
  3. Faz parse do JSON retornado e normaliza os campos.
  4. Retorna BrandKitExtractionResponse para a rota.
"""

import base64
import json
import logging
import re
from typing import Optional

from openai import OpenAI, APIError, APITimeoutError

from app.core import config
from app.models.schemas import BrandKitExtractionResponse

logger = logging.getLogger(__name__)

_HEX_RE = re.compile(r"#[0-9A-Fa-f]{6}")

_SYSTEM_PROMPT = """\
Você é um especialista em identidade visual e branding.
Analise o material enviado (imagem, logo ou PDF de brand book) e extraia as informações de identidade visual.
Responda APENAS com um objeto JSON válido, sem markdown, sem explicações extras.

Estrutura esperada:
{
  "brand_name": "<nome da marca ou null>",
  "primary_color": "<cor principal em HEX #RRGGBB ou null>",
  "secondary_color": "<cor secundária em HEX #RRGGBB ou null>",
  "tone_of_voice": "<descrição detalhada do tom de voz, estilo de escrita e personalidade da marca>"
}

Regras:
- Cores DEVEM estar no formato #RRGGBB (6 dígitos). Se não for possível identificar com precisão, retorne null.
- tone_of_voice deve ter pelo menos 3 frases descrevendo como a IA deve escrever para essa marca.
- Se algum campo não puder ser extraído, use null.
"""


def _build_client() -> OpenAI:
    if not config.OPENAI_API_KEY:
        raise RuntimeError("OPENAI_API_KEY não configurada no .env")
    return OpenAI(
        api_key=config.OPENAI_API_KEY,
        base_url=config.OPENAI_BASE_URL,
        timeout=60.0,
    )


def _parse_extraction(raw: str) -> dict:
    """Extrai o JSON da resposta do Grok (tolerante a texto extra ao redor)."""
    # Tenta parse direto
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Tenta extrair bloco JSON entre chaves
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    logger.warning("Não foi possível fazer parse do JSON retornado pelo Grok.")
    return {}


def _normalize_hex(value: Optional[str]) -> Optional[str]:
    """Garante que a cor esteja no formato #RRGGBB ou retorna None."""
    if not value:
        return None
    match = _HEX_RE.search(value)
    return match.group().upper() if match else None


async def extract_brand_identity(
    file_bytes: bytes,
    mime_type: str,
    extra_context: Optional[str] = None,
) -> BrandKitExtractionResponse:
    """
    Envia o arquivo para o Grok Vision e retorna a identidade visual extraída.

    Args:
        file_bytes: Conteúdo binário do arquivo.
        mime_type: MIME type real do arquivo (ex: "image/png").
        extra_context: Texto adicional do usuário (briefing, nome da marca, etc.).

    Returns:
        BrandKitExtractionResponse com os campos extraídos e a análise bruta.
    """
    client = _build_client()

    # Grok Vision aceita imagens em base64 via data URL
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_url = f"data:{mime_type};base64,{b64}"

    user_content: list = [
        {
            "type": "image_url",
            "image_url": {"url": data_url},
        }
    ]

    if extra_context:
        user_content.append({
            "type": "text",
            "text": f"Contexto adicional fornecido pelo usuário:\n{extra_context}",
        })

    user_content.append({
        "type": "text",
        "text": "Extraia a identidade visual deste material e retorne o JSON conforme instruído.",
    })

    try:
        response = client.chat.completions.create(
            model=config.OPENAI_VISION_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            max_tokens=1024,
            temperature=0.2,
        )
    except APITimeoutError as exc:
        logger.error("Timeout na chamada ao GPT-4o Vision: %s", exc)
        raise RuntimeError("A API da OpenAI não respondeu a tempo. Tente novamente.") from exc
    except APIError as exc:
        logger.error("Erro na API do GPT-4o Vision (status=%s): %s", exc.status_code, exc.message)
        raise RuntimeError(f"Erro na API da OpenAI: {exc.message}") from exc

    raw_text = response.choices[0].message.content or ""
    logger.info("Resposta bruta do Grok Vision recebida (%d chars).", len(raw_text))

    parsed = _parse_extraction(raw_text)

    return BrandKitExtractionResponse(
        brand_name=parsed.get("brand_name"),
        primary_color=_normalize_hex(parsed.get("primary_color")),
        secondary_color=_normalize_hex(parsed.get("secondary_color")),
        tone_of_voice=parsed.get("tone_of_voice"),
        raw_analysis=raw_text,
    )
