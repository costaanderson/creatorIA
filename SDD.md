# SDD — Software Design Document
# CreatorAI — Gerador de Conteúdo para Instagram com IA (MVP)

> **Versão:** 1.2
> **Data:** 2026-06-23
> **Status:** Em desenvolvimento
> **Referências:** `PRD_Gerador_Conteudo_Instagram_IA_MVP.md`, `design_Gerador_Conteudo_Instagram_IA_MVP.md`

---

## Histórico de versões

| Versão | Data | Descrição |
|---|---|---|
| 1.0 | 2026-05-25 | Documento inicial — design forward |
| 1.1 | 2026-06-10 | Engenharia reversa: estado real do código vs arquitetura planejada; gap analysis; bugs identificados; decisão pendente de modelo de IA |
| 1.2 | 2026-06-23 | Consolidação Fases 2 e 3: schemas DDL reais, contratos Pydantic completos, decisão formal de IA (DP-01 → xAI Grok), tabelas renomeadas conforme código real, inconsistências resolvidas |

---

## 1. Visão Técnica

O CreatorAI é uma aplicação fullstack single-user que conecta um perfil profissional do Instagram e permite gerar e publicar conteúdo visual (post único ou carrossel) usando IA, respeitando a identidade de marca configurada pelo usuário.

### Decisões de arquitetura

| ID | Decisão | Escolha | Motivo |
|---|---|---|---|
| — | Single-user no MVP | `MVP_USER_ID` fixo em `.env` | Elimina complexidade de multi-tenancy, auth de sessão e permissões |
| — | Backend separado | FastAPI (Python) | Integração natural com IA, processamento de imagem, PDF e arquivos |
| — | Banco e Storage | Supabase | Postgres + Storage + SDK em uma solução só |
| — | Criptografia de token | Fernet (cryptography) | Simétrico, simples, reversível via chave |
| — | Token nunca exposto | Backend retém e decripta | Frontend nunca recebe o access token da Meta |
| — | Long-lived token | Troca short → long via Meta | Evita expiração em 1 hora; válido ~60 dias |
| **DP-01** | **Modelo de IA** | **xAI Grok (via `XAI_API_KEY`)** | Ver seção "Decisão DP-01" abaixo |

---

## 2. Decisão DP-01 — Modelo de IA (RESOLVIDA)

**Decisão formal (v1.2):** O projeto utiliza a **API da xAI (Grok)** como provedor de inteligência artificial.

A chave `XAI_API_KEY` já está presente no `.env` da raiz. Toda a implementação de `ai_service.py` e `brand_extraction_service.py` deve consumir exclusivamente esta API.

### Justificativa

| Critério | xAI (Grok) | OpenAI GPT-4o |
|---|---|---|
| Chave configurada no projeto | ✅ `XAI_API_KEY` já existe | ❌ `OPENAI_API_KEY` não configurada |
| Suporte multimodal (visão) | ✅ Grok Vision (análise de imagens e PDFs) | ✅ |
| Geração de texto / estrutura | ✅ | ✅ |
| Compatibilidade de SDK | API REST padrão / SDK Python | SDK Python maduro |

### Impacto no código

- `backend/app/core/config.py` — expor `XAI_API_KEY` e `XAI_MODEL` (default: `grok-2-vision-1212` para tarefas com imagem; `grok-3` para geração de texto).
- `backend/app/services/ai_service.py` — cliente HTTP apontando para `https://api.x.ai/v1` com `Authorization: Bearer {XAI_API_KEY}`.
- `backend/app/services/brand_extraction_service.py` — usar endpoint de visão para análise de imagens/PDFs.
- `requirements.txt` — adicionar `httpx` (já listado) e/ou SDK xAI quando disponível; até lá usar `openai` package com `base_url="https://api.x.ai/v1"` (compatível com API da xAI).

---

## 3. Arquitetura C4

### Nível 1 — Contexto do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  [Criador de Conteúdo / Empreendedor]                   │
│          │                                              │
│          │  Usa (browser)                               │
│          ▼                                              │
│  ┌───────────────────────────┐                          │
│  │   App Creator AI          │────── Integração ──────► │  [Instagram]
│  │   Sistema central para    │       via API            │  (sistema externo)
│  │   criação de posts e      │                          │
│  │   carrosséis com IA       │                          │
│  └───────────────────────────┘                          │
└─────────────────────────────────────────────────────────┘
```

### Nível 2 — Containers

```
[Usuário]
    │
    │ Usa
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  App Creator AI                                                              │
│                                                                              │
│  ┌──────────────────────────┐                                                │
│  │  FrontEnd (Next.js)      │  Interface para criar, revisar e aprovar posts │
│  │  porta 3000              │                                                │
│  └──────────┬───────────────┘                                                │
│             │ REST HTTP                                                      │
│             ▼                                                                │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Backend (FastAPI)  porta 8000                                        │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌───────────────────┐  ┌─────────────────────┐     │   │
│  │  │ Autenticação│  │ Gestão de Fotos   │  │ Gestão de Conteúdo  │     │   │
│  │  │ OAuth Meta  │  │ Upload + Storage  │  │ Legendas, CTA,      │     │   │
│  │  │ Token encr. │  │ identidade visual │  │ hashtags, estrutura │     │   │
│  │  └─────────────┘  └───────────────────┘  └─────────────────────┘     │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────┐  ┌──────────────────────────┐   │   │
│  │  │ Creator IA (xAI Grok)           │  │ Publicação               │   │   │
│  │  │ Gera ideias, legendas, textos   │  │ Meta Graph API           │   │   │
│  │  │ e roteiro do carrossel          │  │ single post / carousel   │   │   │
│  │  └─────────────────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                        │                                                     │
│                  ┌─────▼─────┐                                               │
│                  │ Supabase  │  Postgres + Storage                           │
│                  └───────────┘                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ Integração via API
                                        ▼
                                  [Instagram / Meta]
```

### Mapeamento C4 → Código

| Container C4 | Arquivos reais | Status |
|---|---|---|
| FrontEnd | `frontend/pages/`, `frontend/styles/` | ✅ scaffold / ⚠️ bugs ativos |
| Autenticação | `backend/app/api/routes/instagram_auth.py`, `core/security.py`, `services/meta_service.py` | ✅ implementado |
| Gestão de Fotos | `routes/brand_kit.py` + `services/brand_extraction_service.py` | 🔲 não existe |
| Gestão de Conteúdo | `routes/content.py` + `services/ai_service.py` | 🔲 não existe |
| Creator IA | `services/ai_service.py` (xAI Grok) | 🔲 não existe |
| Publicação | `routes/publish.py` + `services/publishing_service.py` | 🔲 não existe |
| Supabase (banco) | `services/supabase_service.py` — tabela `instagram_connections` ativa | ✅ serviço ok / ⚠️ tabelas faltando |

---

## 4. Estado Real do Código (Engenharia Reversa — 2026-06-10)

### 4.1 Backend

#### O que existe de fato no disco

```
backend/
  app/
    main.py                     ✅ FastAPI app, CORS, inclui instagram_auth router
    core/
      config.py                 ✅ Lê .env da raiz; expõe constantes tipadas
      security.py               ✅ encrypt_token / decrypt_token via Fernet
    api/
      routes/
        instagram_auth.py       ✅ GET /connect, GET /callback, GET /status, POST /disconnect
        brand_kit.py            🔲 não existe
        content.py              🔲 não existe
        publish.py              🔲 não existe
    services/
      meta_service.py           ✅ build_oauth_url, exchange_code_for_token, get_instagram_account, validate_token
      supabase_service.py       ✅ get_table, insert, update, delete
      ai_service.py             🔲 não existe
      brand_extraction_service.py 🔲 não existe
      publishing_service.py     🔲 não existe
    models/
      schemas.py                ✅ Pydantic: InstagramConnect/Callback/Status/DisconnectResponse
    utils/
      __init__.py               ✅ arquivo vazio
  requirements.txt              ✅ fastapi, uvicorn, supabase, httpx, cryptography, python-dotenv
```

#### Progresso por módulo (backend)

| Módulo | Arquivos | % real | Observação |
|---|---|---|---|
| OAuth / Autenticação | `instagram_auth.py`, `meta_service.py`, `security.py` | **100%** | Fluxo completo: connect → callback → salvar token → status → disconnect |
| Infraestrutura | `config.py`, `supabase_service.py`, `main.py` | **100%** | Pronto para uso |
| Brand Kit | `brand_kit.py`, `brand_extraction_service.py` | **0%** | Não iniciado |
| Geração de Conteúdo | `content.py`, `ai_service.py` | **0%** | Não iniciado |
| Publicação | `publish.py`, `publishing_service.py` | **0%** | Não iniciado |
| **Backend total** | | **~30%** | Infraestrutura + OAuth prontos |

---

### 4.2 Frontend

#### O que existe de fato no disco

```
frontend/
  pages/
    _app.tsx          ✅ App wrapper padrão Next.js
    index.tsx         ⚠️ Existe, mas tem dois bugs ativos (ver seção 5)
  styles/
    globals.css       ✅ Reset CSS básico
  lib/
    supabaseClient.ts 🔲 NÃO EXISTE — importado em index.tsx (BUG-01)
    api.ts            🔲 NÃO EXISTE
  components/         🔲 diretório não criado
  tsconfig.json       ✅
  package.json        ✅
```

#### Dependências instaladas (package.json)

| Pacote | Versão | Observação |
|---|---|---|
| next | ^16.2.4 | Pages Router — correto |
| react | 18.2.0 | ok |
| @supabase/supabase-js | 2.39.0 | instalado, mas `supabaseClient.ts` não criado |
| typescript | ^6.0.3 | ok |

#### Progresso por módulo (frontend)

| Módulo | Arquivos | % real | Observação |
|---|---|---|---|
| Scaffold Next.js | `_app.tsx`, `globals.css`, `tsconfig.json` | **100%** | Funcional |
| Página inicial | `index.tsx` | **20%** | Existe mas quebrada por 2 bugs |
| Lib / cliente HTTP | `lib/api.ts`, `lib/supabaseClient.ts` | **0%** | Não criados |
| Páginas de negócio | `/settings`, `/create`, `/preview/[id]`, `/publish/[id]` | **0%** | Não criadas |
| Componentes | Todos | **0%** | Não criados |
| **Frontend total** | | **~5%** | Apenas scaffold |

---

### 4.3 Banco de Dados (Supabase)

| Tabela | Status | Observação |
|---|---|---|
| `instagram_connections` | ✅ existe e em uso | Única tabela criada; nome real difere do modelo do PRD (`instagram_accounts`) |
| `brand_kits` | 🔲 não existe | Necessária para Fase 2 |
| `brand_assets` | 🔲 não existe | Necessária para upload de identidade visual |
| `content_projects` | 🔲 não existe | Substitui `generated_contents` do PRD |
| `content_slides` | 🔲 não existe | Necessária para carrosséis |
| Bucket `brand-assets` | 🔲 não criado | Supabase Storage |
| Bucket `content-media` | 🔲 não criado | Supabase Storage |

---

## 5. Bugs Ativos

### BUG-01 — `lib/supabaseClient.ts` não existe (CRÍTICO)

**Arquivo:** `frontend/pages/index.tsx`
**Linha:** `import { supabase } from '../lib/supabaseClient';`
**Impacto:** Build quebra ao importar. Frontend não sobe em produção.
**Correção:** Criar `frontend/lib/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

> **Nota:** Em produção o frontend não deve usar o Service Role Key. Usar a `anon key` pública, ou remover o Supabase client do frontend completamente (backend-only access).

---

### BUG-02 — `index.tsx` chama endpoint inexistente

**Arquivo:** `frontend/pages/index.tsx`
**Linha:** `fetch('http://127.0.0.1:8000/content/')`
**Impacto:** Silencioso em dev (catch absorve), mas o dado nunca carrega.
**Correção:** Rota `GET /content/` não existe no backend. Remover ou substituir por chamada a endpoint que existe (`GET /auth/instagram/status`), ou criar o endpoint correto na Fase 3.

---

## 6. Estrutura do Projeto (Completa — com estado)

### Backend

```
backend/
  app/
    main.py                         ✅
    core/
      config.py                     ✅  (adicionar XAI_API_KEY e XAI_MODEL em Fase 2/3)
      security.py                   ✅
    api/
      routes/
        instagram_auth.py           ✅ GET connect | GET callback | GET status | POST disconnect
        brand_kit.py                🔲 GET /brand-kit | POST /brand-kit | POST /brand-kit/upload
        content.py                  🔲 POST /content/generate | POST /content/{id}/caption
        publish.py                  🔲 POST /instagram/publish | GET /instagram/publication-status/{id}
    services/
      meta_service.py               ✅
      supabase_service.py           ✅
      ai_service.py                 🔲 generate_content() | generate_caption()  [xAI Grok]
      brand_extraction_service.py   🔲 extract_from_assets()  [xAI Grok Vision]
      publishing_service.py         🔲 publish_single_post() | publish_carousel()
    models/
      schemas.py                    ✅ schemas Instagram auth
                                    🔲 adicionar: BrandKit, Content, Publish schemas
    utils/
      __init__.py                   ✅
      file_validation.py            🔲 validar extensão + MIME + tamanho
  requirements.txt                  ✅ (adicionar openai>=1.0 com base_url xAI na Fase 2)
```

### Frontend

```
frontend/
  pages/
    _app.tsx                        ✅
    index.tsx                       ⚠️ bugs ativos (BUG-01, BUG-02)
    settings.tsx                    🔲
    create.tsx                      🔲
    preview/[id].tsx                🔲
    publish/[id].tsx                🔲
  styles/
    globals.css                     ✅
  lib/
    supabaseClient.ts               🔲 BUG-01 — deve ser criado
    api.ts                          🔲 cliente HTTP para o backend
  components/
    InstagramConnectionCard.tsx     🔲
    BrandKitForm.tsx                🔲
    UploadIdentityForm.tsx          🔲
    ContentGeneratorForm.tsx        🔲
    SinglePostPreview.tsx           🔲
    CarouselPreview.tsx             🔲
    CaptionEditor.tsx               🔲
    PublishButton.tsx               🔲
```

---

## 7. Banco de Dados (Schemas DDL reais)

O backend usa Supabase com Service Role Key (bypass de RLS). Toda operação é feita via `supabase_service.py`. O `MVP_USER_ID` do `.env` é usado como `user_id` em todas as inserções — não há tabela `users` no MVP.

### 7.1 `instagram_connections` ✅ (já existe)

```sql
CREATE TABLE instagram_connections (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID        NOT NULL,
  instagram_handle       TEXT        NOT NULL,
  instagram_user_id      TEXT        NOT NULL,
  access_token_encrypted TEXT        NOT NULL,
  token_expires_at       TIMESTAMPTZ NOT NULL,
  status                 TEXT        NOT NULL DEFAULT 'connected',
    -- valores: connected | disconnected | expired
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_instagram_connections_user_id ON instagram_connections (user_id);
```

---

### 7.2 `brand_kits` 🔲 (criar na Fase 2)

```sql
CREATE TABLE brand_kits (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL,
  primary_color         VARCHAR(7),
    -- formato HEX: #RRGGBB
  secondary_colors      JSONB,
    -- ex: ["#000000", "#FFFFFF"]
  logo_url              TEXT,
    -- URL pública ou signed URL do Supabase Storage
  tone_of_voice         TEXT,
    -- ex: profissional | casual | inspiracional
  visual_style          TEXT,
    -- ex: minimalista premium | colorido vibrante
  typography_suggestion TEXT,
    -- ex: sans-serif moderna e elegante
  layout_patterns       JSONB,
    -- ex: ["uso generoso de espaço em branco", "títulos centralizados"]
  source                TEXT        NOT NULL DEFAULT 'manual',
    -- valores: manual | ai_extracted
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_brand_kits_user_id ON brand_kits (user_id);
-- Um Brand Kit ativo por usuário no MVP
```

---

### 7.3 `brand_assets` 🔲 (criar na Fase 2)

```sql
CREATE TABLE brand_assets (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL,
  brand_kit_id       UUID        REFERENCES brand_kits (id) ON DELETE SET NULL,
  file_name          TEXT        NOT NULL,
  file_type          TEXT        NOT NULL,
    -- ex: image/png | image/jpeg | image/svg+xml | application/pdf
  storage_path       TEXT        NOT NULL,
    -- caminho interno no bucket brand-assets
  storage_url        TEXT        NOT NULL,
    -- URL pública ou signed URL para acesso
  extracted_metadata JSONB,
    -- JSON com resultado da extração via xAI Grok Vision
    -- ex: { primary_color, secondary_colors, visual_style, typography_suggestion, layout_patterns }
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_brand_assets_user_id     ON brand_assets (user_id);
CREATE INDEX idx_brand_assets_brand_kit_id ON brand_assets (brand_kit_id);
```

---

### 7.4 `content_projects` 🔲 (criar na Fase 3)

> Substitui a tabela `generated_contents` definida no PRD. Nome alinhado ao código real e às rotas `/content`.

```sql
CREATE TABLE content_projects (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL,
  type                TEXT        NOT NULL,
    -- valores: single_post | carousel
  theme               TEXT        NOT NULL,
  slides_count        INTEGER,
    -- NULL para single_post; 2–10 para carousel
  status              TEXT        NOT NULL DEFAULT 'draft',
    -- valores: draft | approved | publishing | published | failed
  caption             TEXT,
    -- legenda gerada (até 2.200 chars)
  hashtags            JSONB,
    -- ex: { niche: [...], high_reach: [...], medium_reach: [...], low_reach: [...] }
  instagram_post_url  TEXT,
    -- link do post após publicação bem-sucedida
  error_message       TEXT,
    -- mensagem de erro da Meta API em caso de falha
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_projects_user_id ON content_projects (user_id);
CREATE INDEX idx_content_projects_status  ON content_projects (status);
```

---

### 7.5 `content_slides` 🔲 (criar na Fase 3)

```sql
CREATE TABLE content_slides (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id    UUID        NOT NULL REFERENCES content_projects (id) ON DELETE CASCADE,
  slide_order   INTEGER     NOT NULL,
    -- começa em 1; define a sequência de exibição do carrossel
  title         TEXT,
  body          TEXT,
  visual_prompt TEXT,
    -- prompt descritivo do visual do slide (para geração futura de imagem)
  media_url     TEXT,
    -- URL da mídia gerada/upada para este slide
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_content_slides_content_id ON content_slides (content_id);
CREATE UNIQUE INDEX idx_content_slides_order ON content_slides (content_id, slide_order);
```

---

### Storage (Supabase)

| Bucket | Conteúdo | Acesso | Status |
|---|---|---|---|
| `brand-assets` | Logos, PDFs, imagens de identidade visual | Private (signed URLs) | 🔲 não criado |
| `content-media` | Imagens geradas/processadas para publicação | Private (signed URLs) | 🔲 não criado |

---

## 8. Endpoints da API e Contratos Pydantic

### 8.1 Instagram Auth — `/auth/instagram` ✅

| Método | Rota | Status | Descrição |
|---|---|---|---|
| GET | `/auth/instagram/connect` | ✅ | Retorna URL OAuth da Meta |
| GET | `/auth/instagram/callback` | ✅ | Recebe code, troca por token, salva criptografado |
| GET | `/auth/instagram/status` | ✅ | Retorna status da conexão + valida token |
| POST | `/auth/instagram/disconnect` | ✅ | Seta status = disconnected, apaga token |

#### Fluxo OAuth detalhado

```
1. Frontend GET /auth/instagram/connect
   → backend gera state aleatório
   → retorna { auth_url: "https://facebook.com/dialog/oauth?..." }

2. Frontend redireciona usuário para auth_url

3. Meta redireciona para META_REDIRECT_URI?code=...&state=...
   → backend GET /auth/instagram/callback?code=...
   → troca code por short-lived token (GET /oauth/access_token)
   → troca short por long-lived token (~60 dias)
   → GET /me/accounts → localiza instagram_business_account
   → GET /{ig_id}?fields=username
   → Fernet.encrypt(long_lived_token) → salva em instagram_connections
   → retorna { status, instagram_handle, instagram_user_id }
```

---

### 8.2 Brand Kit — `/brand-kit` 🔲

| Método | Rota | Status | Descrição |
|---|---|---|---|
| GET | `/brand-kit` | 🔲 | Retorna Brand Kit do usuário |
| POST | `/brand-kit` | 🔲 | Cria ou atualiza Brand Kit via formulário manual |
| POST | `/brand-kit/upload` | 🔲 | Upload de arquivos de identidade visual (multipart/form-data) |

---

#### Schemas Pydantic — Brand Kit

```python
# backend/app/models/schemas.py  (adicionar)

from pydantic import BaseModel, Field
from typing import Optional, List
import uuid

# --- GET /brand-kit ---

class BrandKitResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    primary_color: Optional[str] = None        # "#RRGGBB"
    secondary_colors: Optional[List[str]] = None
    logo_url: Optional[str] = None
    tone_of_voice: Optional[str] = None
    visual_style: Optional[str] = None
    typography_suggestion: Optional[str] = None
    layout_patterns: Optional[List[str]] = None
    source: str                                 # "manual" | "ai_extracted"

# --- POST /brand-kit ---

class BrandKitManualPayload(BaseModel):
    primary_color: Optional[str] = Field(
        default=None,
        pattern=r'^#[0-9A-Fa-f]{6}$',
        description="Cor primária em formato HEX (#RRGGBB)"
    )
    secondary_colors: Optional[List[str]] = None
    logo_url: Optional[str] = None
    tone_of_voice: Optional[str] = Field(
        default=None,
        description="profissional | casual | inspiracional"
    )
    visual_style: Optional[str] = None
    typography_suggestion: Optional[str] = None

# --- POST /brand-kit/upload (multipart/form-data) ---
# O upload usa UploadFile do FastAPI — não há schema Pydantic para o body.
# Parâmetros via Form():
#   files: List[UploadFile]  — PNG, JPG, SVG, PDF; máx 10 MB cada

class BrandKitUploadResponse(BaseModel):
    brand_kit_id: uuid.UUID
    assets_stored: int
    extracted_metadata: dict
    message: str
```

---

#### Contratos de Rota — Brand Kit

**`GET /brand-kit`**

```
Método:  GET
Rota:    /brand-kit
Headers: (nenhum — MVP_USER_ID fixo no backend)

Resposta 200:
{
  "id": "uuid",
  "user_id": "uuid",
  "primary_color": "#C9A227",
  "secondary_colors": ["#000000", "#FFFFFF"],
  "logo_url": "https://xyz.supabase.co/storage/v1/object/sign/brand-assets/logo.png?token=...",
  "tone_of_voice": "inspiracional",
  "visual_style": "minimalista premium",
  "typography_suggestion": "sans-serif moderna e elegante",
  "layout_patterns": ["uso generoso de espaço em branco", "títulos centralizados"],
  "source": "ai_extracted"
}

Resposta 404:
{
  "detail": "Brand Kit não encontrado para este usuário."
}
```

---

**`POST /brand-kit`**

```
Método:       POST
Rota:         /brand-kit
Content-Type: application/json

Payload de entrada:
{
  "primary_color": "#C9A227",
  "secondary_colors": ["#000000", "#FFFFFF"],
  "logo_url": "https://...",
  "tone_of_voice": "inspiracional",
  "visual_style": "minimalista premium",
  "typography_suggestion": "sans-serif moderna"
}
(todos os campos são opcionais — envia apenas o que deseja atualizar)

Comportamento:
- Se já existe um Brand Kit para o MVP_USER_ID → atualiza (UPSERT).
- Se não existe → cria com source="manual".

Resposta 200:
{
  "id": "uuid",
  "user_id": "uuid",
  "primary_color": "#C9A227",
  "secondary_colors": ["#000000", "#FFFFFF"],
  "logo_url": "https://...",
  "tone_of_voice": "inspiracional",
  "visual_style": "minimalista premium",
  "typography_suggestion": "sans-serif moderna",
  "layout_patterns": null,
  "source": "manual"
}

Resposta 422 (validação):
{
  "detail": [
    {
      "loc": ["body", "primary_color"],
      "msg": "String should match pattern '^#[0-9A-Fa-f]{6}$'",
      "type": "string_pattern_mismatch"
    }
  ]
}
```

---

**`POST /brand-kit/upload`**

```
Método:       POST
Rota:         /brand-kit/upload
Content-Type: multipart/form-data

Campos do formulário:
  files: [File, File, ...]   — até 10 arquivos; PNG, JPG, SVG, PDF; máx 10 MB cada

Comportamento:
1. Valida extensão, MIME type e tamanho via utils/file_validation.py.
2. Salva cada arquivo no bucket brand-assets (Supabase Storage).
3. Registra cada arquivo em brand_assets com storage_path e storage_url.
4. Chama brand_extraction_service.extract_from_assets(asset_urls) → xAI Grok Vision.
5. Faz UPSERT em brand_kits com os dados extraídos e source="ai_extracted".

Resposta 200:
{
  "brand_kit_id": "uuid",
  "assets_stored": 3,
  "extracted_metadata": {
    "primary_color": "#C9A227",
    "secondary_colors": ["#000000", "#FFFFFF"],
    "visual_style": "minimalista premium",
    "typography_suggestion": "sans-serif moderna e elegante",
    "layout_patterns": ["uso generoso de espaço em branco"],
    "tone_recommendation": "inspiracional"
  },
  "message": "Identidade visual extraída com sucesso. Revise e confirme os dados."
}

Resposta 422 — arquivo inválido:
{
  "detail": "Formato não suportado: .docx. Aceitos: PNG, JPG, SVG, PDF."
}

Resposta 413 — arquivo muito grande:
{
  "detail": "Arquivo logo_grande.png excede o limite de 10 MB."
}
```

---

### 8.3 Conteúdo — `/content` 🔲

| Método | Rota | Status | Descrição |
|---|---|---|---|
| POST | `/content/generate` | 🔲 | Gera post único ou carrossel via xAI Grok |
| POST | `/content/{id}/caption` | 🔲 | Regenera ou atualiza legenda e hashtags |

---

#### Schemas Pydantic — Conteúdo

```python
# backend/app/models/schemas.py  (adicionar)

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
import uuid

# --- POST /content/generate ---

class ContentGeneratePayload(BaseModel):
    theme: str = Field(
        ...,
        min_length=5,
        max_length=300,
        description="Tema ou assunto do conteúdo a ser gerado"
    )
    type: Literal["single_post", "carousel"]
    slides_count: Optional[int] = Field(
        default=None,
        ge=2,
        le=10,
        description="Número de slides (obrigatório quando type='carousel')"
    )

class SlideResponse(BaseModel):
    slide_number: int
    title: str
    body: str
    visual_suggestion: str

class ContentGenerateResponse(BaseModel):
    content_project_id: uuid.UUID
    type: str
    theme: str
    status: str                        # "draft"
    slides: Optional[List[SlideResponse]] = None   # preenchido para carousel
    title: Optional[str] = None        # preenchido para single_post
    body: Optional[str] = None         # preenchido para single_post
    visual_suggestion: Optional[str] = None        # preenchido para single_post
    cta: Optional[str] = None          # chamada para ação (single_post)

# --- POST /content/{id}/caption ---

class CaptionRegeneratePayload(BaseModel):
    custom_instructions: Optional[str] = Field(
        default=None,
        max_length=500,
        description="Instruções adicionais para ajustar tom ou foco da legenda"
    )

class HashtagsResponse(BaseModel):
    niche: List[str]
    high_reach: List[str]
    medium_reach: List[str]
    low_reach: List[str]

class CaptionResponse(BaseModel):
    content_project_id: uuid.UUID
    caption: str
    character_count: int
    hashtags: HashtagsResponse
```

---

#### Contratos de Rota — Conteúdo

**`POST /content/generate`**

```
Método:       POST
Rota:         /content/generate
Content-Type: application/json

Payload de entrada (single_post):
{
  "theme": "Como usar cores para transmitir autoridade na sua marca",
  "type": "single_post"
}

Payload de entrada (carousel):
{
  "theme": "5 erros que destroem a identidade visual de pequenas marcas",
  "type": "carousel",
  "slides_count": 5
}

Comportamento:
1. Valida payload (slides_count obrigatório para carousel).
2. Busca Brand Kit do MVP_USER_ID.
3. Chama ai_service.generate_content(theme, type, slides_count, brand_kit) → xAI Grok.
4. Insere registro em content_projects com status="draft".
5. Para carousel: insere N registros em content_slides.
6. Retorna estrutura completa.

Resposta 200 — single_post:
{
  "content_project_id": "uuid",
  "type": "single_post",
  "theme": "Como usar cores para transmitir autoridade na sua marca",
  "status": "draft",
  "title": "Cores que comunicam poder",
  "body": "A cor primária da sua marca diz mais sobre você do que imagina...",
  "visual_suggestion": "Fundo escuro com tipografia em dourado, atmosfera premium.",
  "cta": "Salve este post para revisar seu Brand Kit hoje."
}

Resposta 200 — carousel:
{
  "content_project_id": "uuid",
  "type": "carousel",
  "theme": "5 erros que destroem a identidade visual de pequenas marcas",
  "status": "draft",
  "slides": [
    {
      "slide_number": 1,
      "title": "Sua marca está comunicando o que você quer?",
      "body": "A maioria dos empreendedores nunca para para responder essa pergunta.",
      "visual_suggestion": "Fundo branco, título centralizado em cor primária, sem elementos extras."
    },
    {
      "slide_number": 2,
      "title": "Erro #1 — Usar fontes demais",
      "body": "Mais de 2 famílias tipográficas gera ruído visual e dispersa a atenção.",
      "visual_suggestion": "Tipografia grande em destaque, cor secundária para o número do erro."
    }
  ]
}

Resposta 422 — carousel sem slides_count:
{
  "detail": "slides_count é obrigatório quando type='carousel'."
}

Resposta 502 — falha na IA:
{
  "detail": "Falha ao gerar conteúdo via xAI. Tente novamente."
}
```

---

**`POST /content/{id}/caption`**

```
Método:       POST
Rota:         /content/{id}/caption
Content-Type: application/json

Parâmetro de rota:
  id: UUID do content_project

Payload de entrada:
{
  "custom_instructions": "Use um tom mais direto e inclua um CTA para salvar o post."
}
(campo opcional — pode enviar {} para regenerar com o tom de voz do Brand Kit)

Comportamento:
1. Busca content_project pelo id.
2. Busca Brand Kit do MVP_USER_ID.
3. Chama ai_service.generate_caption(content_project, brand_kit, custom_instructions) → xAI Grok.
4. Atualiza campos caption e hashtags em content_projects.
5. Retorna legenda e hashtags gerados.

Resposta 200:
{
  "content_project_id": "uuid",
  "caption": "Você sabia que as cores da sua marca estão falando por você o tempo todo? 🎨\n\nNa identidade visual, cada tom carrega uma mensagem: tons escuros transmitem autoridade, tons vibrantes comunicam energia, tons pastéis evocam delicadeza.\n\nAntes de escolher a paleta da sua marca, pergunte: que sensação quero gerar nos meus clientes?\n\nSalve este post para consultar sempre que precisar decidir sobre as cores da sua marca. 💾",
  "character_count": 487,
  "hashtags": {
    "niche": ["#identidadevisual", "#brandingdigital", "#designdemarca"],
    "high_reach": ["#instagram", "#empreendedorismo", "#marketing"],
    "medium_reach": ["#conteudodigital", "#marcapessoal", "#designgrafico"],
    "low_reach": ["#criadoresbrasileiros", "#pequenasmarcas", "#brandkit"]
  }
}

Resposta 404:
{
  "detail": "Content project não encontrado."
}

Resposta 502:
{
  "detail": "Falha ao gerar legenda via xAI. Tente novamente."
}
```

---

### 8.4 Publicação — `/instagram` 🔲

| Método | Rota | Status | Descrição |
|---|---|---|---|
| POST | `/instagram/publish` | 🔲 | Publica conteúdo aprovado |
| GET | `/instagram/publication-status/{id}` | 🔲 | Consulta status de publicação assíncrona |

#### Fluxo de publicação (Meta Graph API)

```
Post único:
1. POST /{ig_user_id}/media  { image_url, caption }  → creation_id
2. POST /{ig_user_id}/media_publish  { creation_id } → post_id
3. GET  /{post_id}?fields=permalink → instagram_post_url

Carrossel:
1. POST /{ig_user_id}/media (is_carousel_item=true) → item_id  [N vezes]
2. POST /{ig_user_id}/media (media_type=CAROUSEL, children=[item_ids], caption) → carousel_id
3. POST /{ig_user_id}/media_publish { carousel_id } → post_id
4. GET  /{post_id}?fields=permalink → instagram_post_url
```

---

## 9. Camada de Serviços

### `meta_service.py` ✅

| Função | Descrição |
|---|---|
| `build_oauth_url(state)` | Monta URL OAuth com scopes e redirect_uri |
| `exchange_code_for_token(code)` | Short-lived → long-lived token (~60 dias) |
| `get_instagram_account(token)` | Busca páginas → localiza instagram_business_account → retorna handle e ig_user_id |
| `validate_token(token)` | GET /me — retorna bool |

### `supabase_service.py` ✅

| Função | Descrição |
|---|---|
| `get_table(name)` | Retorna query builder da tabela |
| `insert(table, data)` | Insere registro |
| `update(table, id, data)` | Atualiza por id |
| `delete(table, id)` | Remove por id |

### `ai_service.py` 🔲 — usa xAI Grok (DP-01 resolvida)

```python
# Implementação via openai package com base_url da xAI
# pip install openai>=1.0
# client = OpenAI(api_key=config.XAI_API_KEY, base_url="https://api.x.ai/v1")
```

| Função | Entrada | Saída |
|---|---|---|
| `generate_content(theme, type, slides_count, brand_kit)` | Dados do projeto + Brand Kit | JSON com estrutura do post/carrossel conforme contratos da seção 10 |
| `generate_caption(content_project, brand_kit, custom_instructions)` | Conteúdo aprovado + Brand Kit | `{ caption, character_count, hashtags }` |

### `brand_extraction_service.py` 🔲 — usa xAI Grok Vision (DP-01 resolvida)

```python
# Usa modelo grok-2-vision-1212 (ou equivalente com suporte a visão)
# Envia URLs das imagens/PDFs como conteúdo multimodal
```

| Função | Entrada | Saída |
|---|---|---|
| `extract_from_assets(asset_urls)` | Lista de URLs (imagens/PDF do Supabase Storage) | JSON de metadados de identidade visual (ver contrato seção 10) |

### `publishing_service.py` 🔲

| Função | Descrição |
|---|---|
| `publish_single_post(ig_user_id, token, image_url, caption)` | Container → publish → retorna permalink |
| `publish_carousel(ig_user_id, token, slides, caption)` | N containers → carousel container → publish → retorna permalink |

---

## 10. Contratos de IA (Prompts e Schemas de Saída)

### 10.1 Extração de identidade visual — `brand_extraction_service.py`

**Modelo:** `grok-2-vision-1212` (ou equivalente xAI com visão)
**Entrada:** URLs das imagens/PDFs no Supabase Storage

**System prompt:**
```
Você é um especialista em branding e identidade visual. Analise as imagens fornecidas
e extraia as informações da identidade visual da marca. Responda SOMENTE em JSON válido
com a estrutura especificada. Não inclua markdown, comentários ou texto fora do JSON.
```

**Saída esperada:**
```json
{
  "primary_color": "#C9A227",
  "secondary_colors": ["#000000", "#FFFFFF"],
  "visual_style": "minimalista premium",
  "typography_suggestion": "sans-serif moderna e elegante",
  "layout_patterns": ["uso generoso de espaço em branco", "títulos centralizados"],
  "tone_recommendation": "inspiracional"
}
```

---

### 10.2 Geração de conteúdo — post único

**Modelo:** `grok-3` (ou equivalente xAI para texto)

**Saída:**
```json
{
  "type": "single_post",
  "title": "Título do post",
  "body": "Texto principal do post",
  "visual_suggestion": "Descrição detalhada do visual sugerido",
  "cta": "Chamada para ação"
}
```

---

### 10.3 Geração de conteúdo — carrossel

**Modelo:** `grok-3`

**Saída:**
```json
{
  "type": "carousel",
  "narrative_structure": "gancho → desenvolvimento → fechamento → CTA",
  "slides": [
    {
      "slide_number": 1,
      "title": "Título do slide 1",
      "body": "Texto de apoio do slide 1",
      "visual_suggestion": "Descrição visual específica do slide 1"
    },
    {
      "slide_number": 2,
      "title": "Título do slide 2",
      "body": "Texto de apoio do slide 2",
      "visual_suggestion": "Descrição visual específica do slide 2"
    }
  ]
}
```

---

### 10.4 Legenda e hashtags

**Modelo:** `grok-3`

**Saída:**
```json
{
  "caption": "Texto completo da legenda (máx 2.200 chars)",
  "character_count": 487,
  "hashtags": {
    "niche": ["#marketingdigital", "#brandingdigital"],
    "high_reach": ["#instagram", "#empreendedorismo"],
    "medium_reach": ["#conteudodigital", "#marcapessoal"],
    "low_reach": ["#criadoresbrasileiros", "#pequenasmarcas"]
  }
}
```

---

## 11. Fluxo de Telas (Frontend)

```
/ (dashboard)
  ├── /settings
  │     ├── Conectar Instagram (status + botão OAuth)
  │     └── Brand Kit (cor, logo, tom de voz)
  ├── /brand-kit/upload
  │     └── Upload de identidade visual → revisão dos dados extraídos → salvar
  ├── /create
  │     └── Tema + formato + nº slides → gerar
  ├── /preview/[id]
  │     └── Preview editável + gerar legenda
  └── /publish/[id]
        └── Legenda + hashtags + botão Publicar
```

### Componentes planejados

| Componente | Responsabilidade | Status |
|---|---|---|
| `InstagramConnectionCard` | Exibe status + botão conectar/desconectar | 🔲 |
| `BrandKitForm` | Formulário manual de cor, logo, tom de voz | 🔲 |
| `UploadIdentityForm` | Upload multipart + exibe extração da IA com opção de confirmar/editar | 🔲 |
| `ContentGeneratorForm` | Tema, tipo, nº slides | 🔲 |
| `SinglePostPreview` | Preview editável de post único | 🔲 |
| `CarouselPreview` | Swipe entre slides editáveis | 🔲 |
| `CaptionEditor` | Textarea com contador de caracteres (limite 2200) | 🔲 |
| `PublishButton` | Ativo só com conteúdo aprovado + legenda válida | 🔲 |

---

## 12. Segurança

| Ponto | Implementação | Status |
|---|---|---|
| Token da Meta | Fernet encrypt antes de salvar; decrypt apenas no backend ao publicar | ✅ |
| Token nunca no frontend | Backend valida e usa internamente; frontend recebe só handle e status | ✅ |
| Upload de arquivos | Validar extensão + MIME type + tamanho máximo (10 MB) em `utils/file_validation.py` | 🔲 |
| Variáveis sensíveis | Apenas em `.env` (raiz); nunca commitadas | ✅ |
| CORS | Atualmente `allow_origins=["*"]` — restringir para origem do frontend antes do deploy | ⚠️ |
| `TOKEN_ENCRYPTION_KEY` | Gerar com `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` | ✅ configurado |
| `XAI_API_KEY` | Nunca exposta no frontend; consumida exclusivamente no backend | 🔲 garantir em config.py |

**Variáveis de ambiente obrigatórias:**

```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
META_CLIENT_ID
META_CLIENT_SECRET
META_REDIRECT_URI
TOKEN_ENCRYPTION_KEY
MVP_USER_ID
XAI_API_KEY          ← decisão DP-01 resolvida: usar xAI Grok
```

---

## 13. Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Token Instagram expirado | `/auth/instagram/status` retorna `{ status: "expired" }` → frontend exibe botão de reconectar |
| Sem conta Business vinculada | `meta_service.get_instagram_account` lança ValueError com mensagem clara |
| Falha na geração de IA | HTTP 502 com mensagem; frontend oferece botão "tentar novamente" |
| Upload com formato inválido | HTTP 422 com lista de formatos aceitos (PNG, JPG, SVG, PDF) |
| Upload acima de 10 MB | HTTP 413 com nome do arquivo e limite |
| Legenda acima de 2200 chars | Frontend bloqueia publicação e mostra contador com contagem regressiva |
| Falha na publicação Meta | Salvar `status = "failed"` e `error_message` em `content_projects` |
| `TOKEN_ENCRYPTION_KEY` ausente | Backend levanta `RuntimeError` na inicialização de `security.py` |
| `XAI_API_KEY` ausente | Backend levanta `RuntimeError` na inicialização de `config.py` |
| `slides_count` ausente em carousel | HTTP 422 com mensagem explicativa |

---

## 14. Sequência de Implementação

### Fase 0 — Correções imediatas (antes de qualquer coisa)

- [ ] Corrigir BUG-01: criar `frontend/lib/supabaseClient.ts`
- [ ] Corrigir BUG-02: remover ou corrigir fetch para `/content/` em `index.tsx`
- [ ] ~~Resolver DP-01~~ ✅ **RESOLVIDA** — usar xAI Grok; atualizar `config.py` com `XAI_API_KEY` e `XAI_MODEL`
- [ ] Criar tabelas no Supabase (`brand_kits`, `brand_assets`, `content_projects`, `content_slides`) usando os DDLs da seção 7
- [ ] Criar buckets no Supabase Storage (`brand-assets`, `content-media`)
- [ ] Testar fluxo completo de OAuth end-to-end

### Fase 1 — Base ✅ (concluída)

- [x] Projeto FastAPI criado e rodando
- [x] Projeto Next.js criado
- [x] `.env` configurado com todas as credenciais
- [x] Supabase conectado (`supabase_service.py`)
- [x] OAuth Meta implementado (`instagram_auth.py`, `meta_service.py`)
- [x] Criptografia de token (`security.py`)
- [x] Tabela `instagram_connections` no Supabase

### Fase 2 — Brand Kit

- [ ] Criar `routes/brand_kit.py` com `GET /brand-kit`, `POST /brand-kit`, `POST /brand-kit/upload`
- [ ] Adicionar schemas Pydantic de Brand Kit em `schemas.py` (conforme seção 8.2)
- [ ] Criar `utils/file_validation.py` (extensão, MIME, tamanho)
- [ ] Upload de arquivos → bucket `brand-assets` (Supabase Storage)
- [ ] Criar `services/brand_extraction_service.py` com xAI Grok Vision
- [ ] Adicionar `XAI_API_KEY` e `XAI_MODEL` a `config.py`
- [ ] Registrar router de brand_kit em `main.py`
- [ ] Frontend: componentes `BrandKitForm` + `UploadIdentityForm`
- [ ] Frontend: página `/settings`

### Fase 3 — Geração de Conteúdo

- [ ] Adicionar `openai>=1.0` ao `requirements.txt` (compatível com xAI via base_url)
- [ ] Criar `services/ai_service.py` com `generate_content()` e `generate_caption()` (xAI Grok)
- [ ] Criar `routes/content.py` com `POST /content/generate` e `POST /content/{id}/caption`
- [ ] Adicionar schemas Pydantic de Content em `schemas.py` (conforme seção 8.3)
- [ ] Registrar router de content em `main.py`
- [ ] Frontend: componentes `ContentGeneratorForm`, `SinglePostPreview`, `CarouselPreview`, `CaptionEditor`
- [ ] Frontend: páginas `/create` e `/preview/[id]`
- [ ] Frontend: criar `lib/api.ts` (cliente HTTP para o backend)

### Fase 4 — Publicação

- [ ] Criar `services/publishing_service.py` com fluxo Meta Graph API
- [ ] Criar `routes/publish.py` com `POST /instagram/publish` e `GET /instagram/publication-status/{id}`
- [ ] Registrar router de publish em `main.py`
- [ ] Frontend: componente `PublishButton` + feedback de progresso
- [ ] Frontend: página `/publish/[id]`
- [ ] Tratar todos os estados de erro da Meta API (token expirado, permissão insuficiente, formato inválido)
- [ ] Restringir CORS para origem do frontend antes do deploy em produção

---

## 15. Observabilidade

O backend usa `logging` do Python. Eventos a logar:

- Geração de URL OAuth
- Troca de code por token (sucesso/erro)
- Conexão/desconexão de conta Instagram
- Validação de token (expirado ou não)
- Upload de assets (nome, tamanho, tipo)
- Chamadas à IA via xAI (modelo usado, tokens consumidos se disponível na resposta)
- Extração de identidade visual (sucesso, campos extraídos, erros de parsing)
- Tentativa de publicação (success, falha, mensagem de erro da Meta API)
- Status de publicação consultado pelo frontend
