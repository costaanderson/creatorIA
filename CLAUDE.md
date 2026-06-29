# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CreatorAI — CLAUDE.md

Gerador de conteúdo para Instagram com IA, desenvolvido para a Bru (designer).

## Visão do Produto

Aplicação fullstack single-user que permite a criadores de conteúdo gerar e publicar posts no Instagram automaticamente usando IA, reduzindo o tempo de produção e mantendo consistência visual com a marca.

**Persona:** Criador de conteúdo / empreendedor individual — trabalha solo, publica com frequência, sem habilidade avançada em design, usa Instagram como canal principal.

### Proposta de valor

- Criar posts únicos ou carrosséis em poucos segundos
- Garantir consistência visual com a identidade da marca via Brand Kit
- Reduzir esforço manual de design, copywriting e publicação
- Publicar diretamente no Instagram após revisão do usuário

---

## Escopo do MVP

### Incluído
- Conexão com perfil profissional do Instagram via Meta Graph API (OAuth)
- Configuração manual de Brand Kit (cor primária, logo, tom de voz)
- Upload de identidade visual com extração inteligente via IA
- Geração de conteúdo visual: post único e carrossel (2–10 slides)
- Geração automática de legenda e hashtags segmentadas por alcance
- Preview e edição antes da publicação
- Publicação direta no Instagram com um clique

### Fora do MVP
Multi-contas, gestão de clientes, agendamento, analytics, biblioteca de templates, aprovação colaborativa.

---

## Épicos e User Stories

### Épico 1 — Conexão e Identidade
- **US-01** Conectar perfil do Instagram via OAuth Meta → salvar token criptografado no Supabase
- **US-02** Configurar Brand Kit manual (cor HEX, logo PNG/SVG, tom de voz)
- **US-03** Upload de identidade visual → OpenAI gpt-4o Vision extrai paleta, estilo, tipografia, padrões de layout

### Épico 2 — Criação de Conteúdo com IA
- **US-04** Gerar post único ou carrossel a partir de um tema → respeitar Brand Kit e tom de voz
- **US-05** Gerar legenda (até 2.200 chars) e ≥10 hashtags por nicho/alcance

### Épico 3 — Publicação Direct-to-Instagram
- **US-06** Publicar via Meta API com indicador de progresso → retornar link do post publicado

---

## Stack

```
Frontend:  Next.js (TypeScript) — Pages Router
Backend:   Python + FastAPI
Banco:     Supabase Postgres
Storage:   Supabase Storage (buckets: brand-assets, content-media)
IA:        OpenAI — provedor ativo do projeto (OPENAI_API_KEY)
             gpt-4o  → geração de texto, legendas, hashtags
             gpt-4o  → extração de identidade visual (imagens/PDFs)
           SDK: pacote openai>=1.0 com base_url="https://api.openai.com/v1"
Social:    Meta Graph API / Instagram API
Deploy:    Vercel (frontend) | Render / Railway / Fly.io (backend)
```

---

## Estrutura do projeto

```
CreatorAI/
├── frontend/                  # Next.js app (TypeScript)
│   ├── pages/                 # index.tsx ✅ | settings.tsx ✅ | create.tsx ✅
│   ├── lib/                   # supabaseClient.ts ✅ | api.ts ✅
│   ├── components/            # InstagramConnectionCard ✅ | BrandKitForm ✅ | UploadIdentityForm ✅
│   │                          # ContentGeneratorForm ✅ | ContentPreview ✅ | InstagramPreview ✅
│   └── styles/                # globals.css ✅ | *.module.css por componente ✅
├── backend/                   # FastAPI
│   └── app/
│       ├── api/routes/        # instagram_auth ✅ | brand_kit ✅ | content ✅ | publish ✅
│       ├── core/              # config.py ✅ | security.py ✅
│       ├── models/            # schemas.py ✅ (auth + brand kit + content + publish)
│       ├── services/          # meta ✅ | supabase ✅ | brand_extraction_service ✅ | ai_service ✅ | publishing_service ✅
│       ├── sql/               # fase3_content.sql ✅
│       └── utils/             # file_validation.py ✅
├── render.yaml                # Deploy config — Render (backend)
├── frontend/vercel.json       # Deploy config — Vercel (frontend)
├── publicar_agora.py          # Script de publicação manual (legado)
└── publish_instagram.py
```

---

## Endpoints da API

### Implementados ✅

```
GET  /auth/instagram/connect       # retorna URL OAuth da Meta
GET  /auth/instagram/callback      # recebe code, salva token criptografado
GET  /auth/instagram/status        # status da conexão + validade do token
POST /auth/instagram/disconnect    # revoga conexão
GET  /health                       # { "status": "ok" }
```

> Os endpoints connect/callback são **GET** (não POST) — exigência do fluxo OAuth da Meta.

### Implementados — Fase 2 (Brand Kit) ✅

```
GET  /brand-kit                    # retorna Brand Kit do usuário
POST /brand-kit                    # cria ou atualiza Brand Kit manual (JSON)
POST /brand-kit/upload             # upload de identidade visual (multipart/form-data)
```

### Implementados — Fase 3 (Conteúdo) ✅

```
POST /content/generate             # gera post único ou carrossel via OpenAI gpt-4o
GET  /content                      # lista todos os projetos do usuário
GET  /content/{id}                 # retorna projeto completo com slides
PATCH /content/{id}                # edita caption, hashtags e slides
POST /content/upload-image         # upload de imagem para bucket content-media (multipart)
```

### Implementados — Fase 4 (Publicação) ✅

```
POST /instagram/publish/{project_id}   # publica post único ou carrossel via INSTAGRAM_ACCESS_TOKEN do .env
```

> Publicação usa token direto do `.env` (sem OAuth). O usuário fornece image_urls públicas no body.

---

## Modelo de Dados (Supabase)

Nomes reais das tabelas — use estes nomes em todo código novo. A tabela `users` não existe no MVP; o `MVP_USER_ID` do `.env` é o identificador fixo de todas as operações.

| Tabela | Status | Campos-chave |
|---|---|---|
| `instagram_connections` | ✅ existe | user_id, instagram_handle, instagram_user_id, access_token_encrypted, token_expires_at, status |
| `brand_kits` | ✅ existe (Fase 2) | user_id, primary_color (varchar HEX), secondary_colors (jsonb), logo_url, tone_of_voice, visual_style, typography_suggestion, layout_patterns (jsonb), source (manual\|ai_extracted) |
| `brand_assets` | ✅ existe (Fase 2) | user_id, brand_kit_id (fk), file_name, file_type, storage_path, storage_url, extracted_metadata (jsonb) |
| `content_projects` | ✅ existe (Fase 3) | user_id, type (single_post\|carousel), theme, slides_count, status (draft\|approved\|publishing\|published\|failed), caption, hashtags (jsonb), instagram_post_url, error_message |
| `content_slides` | ✅ existe (Fase 3) | content_id (fk → content_projects), slide_order, title, body, visual_prompt, media_url |

> Os schemas DDL completos (CREATE TABLE com índices) estão na **seção 7 do SDD.md**.

---

## Como rodar

### Frontend
```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção
```

### Backend
O `.venv` já está criado na raiz do projeto. O arquivo `.env` também fica na raiz (não dentro de `backend/`).

```bash
# Windows (PowerShell)
.venv\Scripts\Activate.ps1
cd backend
uvicorn app.main:app --reload   # http://localhost:8000
```

```bash
# Adicionar dependências
pip install <pacote>
pip freeze > requirements.txt
```

---

## Detalhes de implementação importantes

- **MVP single-user**: o backend usa `MVP_USER_ID` fixo (env var) em vez de autenticação de sessão — toda operação é feita para esse único usuário.
- **Tabela real de conexões**: `instagram_connections` (o PRD menciona `instagram_accounts` — nome desatualizado, ignorar).
- **Tabela real de conteúdo**: `content_projects` (o PRD menciona `generated_contents` — nome desatualizado, ignorar).
- **Endpoints connect/callback são GET** — o OAuth da Meta exige redirect GET.
- **Token encryption**: usa `cryptography` (Fernet). A chave é `TOKEN_ENCRYPTION_KEY` no `.env`. Sem ela o backend falha ao iniciar.
- **IA — provedor ativo**: OpenAI (`gpt-4o`). O cliente é instanciado via pacote `openai` com `base_url="https://api.openai.com/v1"` e `api_key=OPENAI_API_KEY`.
- **CORS**: usa `ALLOWED_ORIGINS` env var (lista separada por vírgula). Padrão local: `http://localhost:3000,http://127.0.0.1:3000`. Em produção: definir no Render com a URL do Vercel.
- **Publicação Instagram**: usa `INSTAGRAM_ACCESS_TOKEN` + `INSTAGRAM_BUSINESS_ID` direto do `.env` (sem OAuth interativo). O mesmo token usado pelos scripts legados `publicar_agora.py` / `publish_instagram.py`.
- **Upload de imagens de conteúdo**: `POST /content/upload-image` aceita JPEG/PNG/WebP ≤ 10 MB, salva no bucket `content-media` (público), retorna URL pública.
- **Edição de conteúdo**: `PATCH /content/{id}` permite atualizar caption, hashtags e campos de cada slide (title, body, visual_prompt) antes da publicação.
- **requirements.txt**: apenas `backend/requirements.txt` (11 linhas, versões sem pin) é usado no deploy. O arquivo `requirements.txt` na raiz é um pip freeze de referência local — NÃO é lido pelo Render.
- **BUG-01 corrigido**: `lib/supabaseClient.ts` criado na Fase 2.
- **BUG-02 corrigido**: `index.tsx` saneado na Fase 2 — chamada para `/content/` inexistente removida.

---

## Supabase

| Campo | Valor |
|---|---|
| Projeto ativo | **InstagramCreator** |
| Project ID | `lirpdpfoyuifmleoladc` |
| Região | `us-west-2` |
| Host | `db.lirpdpfoyuifmleoladc.supabase.co` |
| Projeto antigo (pausado) | `creatorInstagram` — `gmhdjmyryathesebprky` — INACTIVE, não usar |

Credenciais em **Project Settings → API** do projeto InstagramCreator.

---

## Variáveis de ambiente (.env na raiz)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://lirpdpfoyuifmleoladc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Meta / Instagram
META_CLIENT_ID=
META_CLIENT_SECRET=
META_REDIRECT_URI=http://localhost:8000/auth/instagram/callback
META_API_VERSION=v19.0
INSTAGRAM_ACCESS_TOKEN=        # token do perfil profissional — usado para publicação e nos scripts legados
INSTAGRAM_BUSINESS_ID=         # ID numérico do perfil profissional do Instagram

# Segurança
TOKEN_ENCRYPTION_KEY=          # chave Fernet — backend falha ao iniciar sem ela

# App
MVP_USER_ID=                   # UUID fixo do único usuário do MVP

# IA
OPENAI_API_KEY=                # API da OpenAI — gpt-4o para geração de texto e extração visual

# CORS (produção)
ALLOWED_ORIGINS=               # ex: https://creatorai.vercel.app,https://www.seudominio.com
                               # (vazio = usa padrão http://localhost:3000)
```

---

## Deploy

### Backend — Render
- Arquivo de config: `render.yaml` na raiz do repo
- Runtime: Python, `rootDir: backend`
- Build: `pip install -r requirements.txt` (lê `backend/requirements.txt`)
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **URL de produção**: `https://creatoria-rm2g.onrender.com`
- Env vars a definir no painel do Render: todas as variáveis do `.env` (exceto `NEXT_PUBLIC_*`)
- `ALLOWED_ORIGINS`: `https://creator-h0wakwbna-andersonlcosta4-8923s-projects.vercel.app`

### Frontend — Vercel
- Arquivo de config: `frontend/vercel.json`
- Framework: Next.js (auto-detectado)
- Root directory no Vercel: `frontend`
- **URL de produção**: `https://creator-h0wakwbna-andersonlcosta4-8923s-projects.vercel.app`
- Env vars configuradas no painel do Vercel:
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://lirpdpfoyuifmleoladc.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (anon key do Supabase)
  - `NEXT_PUBLIC_API_URL` = `https://creatoria-rm2g.onrender.com`

---

## Convenções

- Frontend usa **Pages Router** do Next.js (não App Router)
- Tipagem TypeScript no frontend
- Backend em camadas: `api/routes → services → models`
- Validação de payloads com **Pydantic** (schemas em `models/schemas.py`)
- Tokens de acesso armazenados **criptografados** no Supabase via Fernet
- Brand Kit carregado como contexto em todas as chamadas de IA
- Uploads validados por extensão + MIME type + tamanho máximo (10 MB) antes de qualquer operação de storage

---

## Documentação interna

| Arquivo | Conteúdo |
|---|---|
| `SDD.md` | Design document técnico — arquitetura C4, DDLs, contratos Pydantic, prompts de IA, fluxo de implementação por fase |
| `PRD_Gerador_Conteudo_Instagram_IA_MVP.md` | Requisitos completos do produto e user stories |
| `design_Gerador_Conteudo_Instagram_IA_MVP.md` | Referências de design |

---

## Status das Fases

| Fase | Escopo | Status |
|---|---|---|
| Fase 1 — Auth Instagram | OAuth Meta, token criptografado, tabela `instagram_connections` | ✅ Concluída |
| Fase 2 — Brand Kit | Tabelas `brand_kits`/`brand_assets`, buckets, endpoints `/brand-kit`, extração via OpenAI Vision | ✅ Concluída (backend + frontend) |
| Fase 3 — Geração de Conteúdo | Tabelas `content_projects`/`content_slides`, endpoints `/content/*`, pipeline OpenAI | ✅ Concluída (backend + frontend) |
| Fase 4 — Publicação | `POST /instagram/publish/{id}`, token direto do `.env`, botão no frontend | ✅ Concluída |

---

## Fase 2 (Brand Kit) — Concluída ✅

### Backend ✅

- [x] Tabela `brand_kits` criada no Supabase
- [x] Tabela `brand_assets` criada no Supabase
- [x] Bucket `brand-assets` criado (acesso privado, signed URLs)
- [x] Bucket `content-media` criado (acesso privado, signed URLs)
- [x] `openai>=1.0` adicionado ao `requirements.txt`
- [x] `core/config.py` atualizado: `OPENAI_API_KEY` e modelo `gpt-4o` configurados
- [x] `utils/file_validation.py`: valida extensão (PNG, JPG, SVG, PDF), MIME type e tamanho ≤ 10 MB
- [x] `services/brand_extraction_service.py`: chama OpenAI gpt-4o Vision; retorna JSON de identidade visual
- [x] `api/routes/brand_kit.py`: `GET /brand-kit`, `POST /brand-kit`, `POST /brand-kit/upload`
- [x] Schemas Pydantic em `models/schemas.py`: `BrandKitResponse`, `BrandKitManualPayload`, `BrandKitUploadResponse`
- [x] Router `brand_kit` registrado em `main.py`

### Frontend ✅

- [x] BUG-01 corrigido: `frontend/lib/supabaseClient.ts` criado (usa `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)
- [x] BUG-02 corrigido: `pages/index.tsx` saneado — removida chamada para `/content/` inexistente
- [x] `frontend/lib/api.ts`: cliente HTTP tipado (`getBrandKit`, `saveBrandKit`, `uploadIdentityFile`, `getInstagramStatus`, `disconnectInstagram`) com classe `ApiError`
- [x] Componente `BrandKitForm`: color swatch + HEX sincronizados, cores secundárias dinâmicas (até 4), logo URL, textarea de tom de voz, auto-preenchimento pós-extração IA
- [x] Componente `UploadIdentityForm`: drag-and-drop, validação client-side de tipo/tamanho, spinner contextual, banner de sucesso com instruções de revisão
- [x] Componente `InstagramConnectionCard`: exibe @handle, validade do token e fluxo de desconexão
- [x] Página `pages/settings.tsx`: carrega Brand Kit no `useEffect`, pré-preenche formulário, estados de loading/erro/retry
- [x] CSS Modules por componente (sem dependências externas de UI)

### Validação de integração ✅

- [x] `POST /brand-kit` testado — upsert no Supabase funcionando (incluindo correção de `logo_url` NOT NULL e `brand_name` NOT NULL)
- [x] Erros de validação Pydantic (422) exibidos corretamente no frontend (BUG corrigido em `api.ts`)

---

## Fase 3 (Geração de Conteúdo) — Concluída ✅

### Backend ✅

- [x] DDL em `backend/app/sql/fase3_content.sql`: tabelas `content_projects` + `content_slides` com índices, trigger `updated_at` e constraints
- [x] Schemas Pydantic em `models/schemas.py`: `ContentGenerateRequest`, `SlideResponse`, `ContentProjectResponse`, `SlideUpdateItem`, `ContentUpdateRequest`
- [x] `services/ai_service.py`: motor de geração com prompt parametrizado por Brand Kit, parse JSON em 3 camadas, validação automática — usa OpenAI `gpt-4o`
- [x] `api/routes/content.py`: `POST /content/generate`, `GET /content/{id}`, `GET /content`, `PATCH /content/{id}`, `POST /content/upload-image`
- [x] Router `content` registrado em `main.py`

### Supabase ✅

- [x] Tabelas `content_projects` e `content_slides` criadas via DDL

### Frontend ✅

- [x] Componente `ContentGeneratorForm`: seletor de tipo (post único/carrossel), nº de slides, tema, **ImagePicker** integrado (upload local → backend → URL pública) por slide
- [x] Componente `ContentPreview`: abas Preview/Edição, seção de publicação com upload de imagens, toggle de preview Instagram
- [x] Componente `InstagramPreview`: mock visual do Instagram com abas Post e Reels
- [x] Página `pages/create.tsx`: carrega projeto existente via `?id=` na querystring; exibe gerador + preview
- [x] `pages/index.tsx`: lista projetos como links clicáveis para `/create?id={id}`
- [x] `lib/api.ts`: funções `generateContent`, `getContent`, `listContent`, `updateContent`, `publishContent`, `uploadContentImage`

---

## Fase 4 (Publicação) — Concluída ✅

### Backend ✅

- [x] `services/publishing_service.py`: publica post único e carrossel via Meta Graph API usando `INSTAGRAM_ACCESS_TOKEN` do `.env`; polling de status do container com `_wait_ready()`; gera URL do post via `_media_id_to_shortcode()`
- [x] `api/routes/publish.py`: `POST /instagram/publish/{project_id}`; aceita `image_urls` no body; atualiza status do projeto para `publishing` → `published`/`failed`; retorna `PublishResponse`
- [x] Router `publish` registrado em `main.py`
- [x] Schema `PublishResponse` em `models/schemas.py`

### Frontend ✅

- [x] Botão "Publicar no Instagram" no `ContentPreview` com estados: idle → aguardando URLs → publicando → sucesso/erro
- [x] Link para o post publicado exibido após sucesso
