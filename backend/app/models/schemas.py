import re
from pydantic import BaseModel, Field, field_validator
from typing import Any, List, Literal, Optional
from datetime import datetime
from uuid import UUID

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class InstagramConnectResponse(BaseModel):
    auth_url: str


class InstagramCallbackResponse(BaseModel):
    status: str
    instagram_handle: str
    instagram_user_id: str


class InstagramStatusResponse(BaseModel):
    status: str  # connected | disconnected | expired
    instagram_handle: Optional[str] = None
    instagram_user_id: Optional[str] = None
    token_expires_at: Optional[datetime] = None


class InstagramDisconnectResponse(BaseModel):
    status: str


# --- Brand Kit ---

class BrandKitCreate(BaseModel):
    brand_name: Optional[str] = Field(None, max_length=120, example="Bru Rodrigues Design")
    primary_color: str = Field(..., max_length=7, description="Cor primária em formato HEX, ex: #A3B4C5")
    secondary_color: Optional[str] = Field(None, max_length=7)
    secondary_colors: Optional[List[str]] = Field(None)
    tone_of_voice: Optional[str] = Field(None)
    logo_url: Optional[str] = Field(None)

    @field_validator("primary_color")
    @classmethod
    def primary_must_be_hex(cls, v: str) -> str:
        if not _HEX_RE.match(v):
            raise ValueError("A cor primária deve estar no formato HEX de 6 dígitos, ex: #A3B4C5")
        return v.upper()

    @field_validator("secondary_color")
    @classmethod
    def secondary_must_be_hex(cls, v: Optional[str]) -> Optional[str]:
        if v and not _HEX_RE.match(v):
            raise ValueError("A cor secundária deve estar no formato HEX de 6 dígitos, ex: #A3B4C5")
        return v.upper() if v else v


class BrandKitUpdate(BaseModel):
    """Todos os campos são opcionais para permitir PATCH parcial."""
    brand_name: Optional[str] = Field(None, min_length=1, max_length=120)
    primary_color: Optional[str] = Field(None, max_length=7)
    secondary_color: Optional[str] = Field(None, max_length=7)
    tone_of_voice: Optional[str] = Field(None, min_length=10)

    @field_validator("primary_color", "secondary_color")
    @classmethod
    def must_be_hex(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _HEX_RE.match(v):
            raise ValueError("A cor deve estar no formato HEX de 6 dígitos, ex: #A3B4C5")
        return v.upper() if v else v


class BrandKitResponse(BaseModel):
    id: UUID
    user_id: UUID
    brand_name: Optional[str] = None
    primary_color: str
    secondary_color: Optional[str] = None
    secondary_colors: Optional[List[str]] = None
    tone_of_voice: Optional[str] = None
    logo_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BrandKitExtractionResponse(BaseModel):
    """Retorno do serviço de extração de identidade visual via IA."""
    brand_name: Optional[str] = None
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    tone_of_voice: Optional[str] = None
    raw_analysis: str = Field(..., description="Análise completa retornada pelo gpt-4o")


# ─── Fase 3 — Geração de Conteúdo ────────────────────────────────────────────


class ContentGenerateRequest(BaseModel):
    """Payload para geração de conteúdo via IA."""

    theme: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Tema ou briefing do conteúdo a ser gerado.",
        example="5 erros que designers iniciantes cometem no logo",
    )
    type: Literal["single_post", "carousel", "reel"] = Field(
        ...,
        description="Tipo de conteúdo: post único, carrossel ou reel.",
    )
    slides_count: Optional[int] = Field(
        None,
        ge=2,
        le=10,
        description="Número de slides/cenas. Obrigatório para carousel. Opcional para reel (padrão 4).",
    )

    @field_validator("slides_count")
    @classmethod
    def validate_slides_count(cls, v: Optional[int], info: Any) -> Optional[int]:
        content_type = info.data.get("type")
        if content_type == "carousel" and v is None:
            raise ValueError("slides_count é obrigatório para carousel (2–10).")
        if content_type == "single_post" and v is not None:
            raise ValueError("slides_count deve ser omitido para single_post.")
        return v


class SlideUpdateItem(BaseModel):
    id: str
    title: Optional[str] = None
    body: Optional[str] = None
    visual_prompt: Optional[str] = None
    media_url: Optional[str] = None


class ContentUpdateRequest(BaseModel):
    caption: Optional[str] = Field(None, max_length=2200)
    hashtags: Optional[List[str]] = None
    slides: Optional[List[SlideUpdateItem]] = None
    status: Optional[Literal["draft", "approved", "archived"]] = None


class SlideResponse(BaseModel):
    """Representa um slide individual de um projeto de conteúdo."""

    id: UUID
    project_id: UUID
    slide_order: int
    title: Optional[str] = None
    body: Optional[str] = None
    visual_prompt: Optional[str] = None
    media_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ContentProjectResponse(BaseModel):
    """Retorno completo de um projeto de conteúdo com slides aninhados."""

    id: UUID
    user_id: UUID
    type: str
    theme: str
    slides_count: int
    caption: Optional[str] = None
    hashtags: List[str] = Field(default_factory=list)
    status: str
    instagram_media_id: Optional[str] = None
    instagram_post_url: Optional[str] = None
    error_message: Optional[str] = None
    slides: List[SlideResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
