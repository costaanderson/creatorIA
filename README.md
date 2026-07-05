# CreatorAI

Gerador de conteúdo para Instagram com IA, desenvolvido para criadores de conteúdo que publicam com frequência e precisam de consistência visual sem esforço manual de design.

---

## Funcionalidades

- Geração de posts únicos e carrosséis (2–10 slides) via IA
- Legenda automática (até 2.200 chars) e hashtags segmentadas por alcance
- Brand Kit com cor primária, logo e tom de voz
- Extração automática de identidade visual a partir de imagens e PDFs via OpenAI Vision
- Preview do conteúdo antes da publicação
- Publicação direta no Instagram com um clique

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js (TypeScript) — Pages Router |
| Backend | Python + FastAPI |
| Banco | Supabase Postgres |
| Storage | Supabase Storage |
| IA | OpenAI gpt-4o |
| Social | Meta Graph API / Instagram API |
| Deploy | Vercel (frontend) + Render (backend) |

---

## Estrutura do projeto

```
CreatorAI/
├── frontend/                  # Next.js app (TypeScript)
│   ├── pages/                 # index, settings, create
│   ├── components/            # BrandKitForm, ContentPreview, InstagramPreview...
│   ├── lib/                   # supabaseClient.ts, api.ts
│   └── styles/                # CSS Modules por componente
├── backend/                   # FastAPI
│   └── app/
│       ├── api/routes/        # instagram_auth, brand_kit, content, publish
│       ├── core/              # config.py, security.py
│       ├── models/            # schemas.py (Pydantic)
│       ├── services/          # meta, supabase, ai_service, publishing_service...
│       └── utils/             # file_validation.py
├── render.yaml                # Deploy config — Render (backend)
└── frontend/vercel.json       # Deploy config — Vercel (frontend)
```

---

## Como rodar localmente

### Pré-requisitos

- Node.js 18+
- Python 3.11+
- Conta no Supabase, OpenAI e Meta Developers

### Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=

# Meta / Instagram
META_CLIENT_ID=
META_CLIENT_SECRET=
META_REDIRECT_URI=http://localhost:8000/auth/instagram/callback
META_API_VERSION=v19.0
INSTAGRAM_ACCESS_TOKEN=
INSTAGRAM_BUSINESS_ID=

# Segurança
TOKEN_ENCRYPTION_KEY=          # chave Fernet

# App
MVP_USER_ID=                   # UUID fixo do usuário

# IA
OPENAI_API_KEY=

# CORS (produção)
ALLOWED_ORIGINS=               # ex: https://seuapp.vercel.app
```

### Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

### Backend

```bash
# Ativar virtualenv (Windows)
.venv\Scripts\Activate.ps1

# Ativar virtualenv (Linux/macOS)
source .venv/bin/activate

cd backend
uvicorn app.main:app --reload  # http://localhost:8000
```

---

## API — Endpoints

```
GET  /health
GET  /auth/instagram/connect
GET  /auth/instagram/callback
GET  /auth/instagram/status
POST /auth/instagram/disconnect

GET  /brand-kit
POST /brand-kit
POST /brand-kit/upload

POST /content/generate
GET  /content
GET  /content/{id}
PATCH /content/{id}
POST /content/upload-image

POST /instagram/publish/{project_id}
```

---

## Deploy

| Serviço | URL |
|---|---|
| Frontend (Vercel) | https://creator-ia-iota.vercel.app |
| Backend (Render) | https://creatoria-rm2g.onrender.com |

---

## Documentação interna

- [`CLAUDE.md`](CLAUDE.md) — guia técnico para desenvolvimento com Claude Code
- [`SDD.md`](SDD.md) — arquitetura C4, DDLs, contratos Pydantic, prompts de IA
- [`PRD_Gerador_Conteudo_Instagram_IA_MVP.md`](PRD_Gerador_Conteudo_Instagram_IA_MVP.md) — requisitos e user stories
