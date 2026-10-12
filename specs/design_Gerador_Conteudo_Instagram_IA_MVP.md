# Design — Gerador de Conteúdo para Instagram com IA (MVP)

## 1. Visão Técnica

Este documento descreve o desenho técnico do MVP do **Gerador de Conteúdo para Instagram com IA**, baseado no PRD do produto.

O objetivo técnico é construir uma aplicação single-user capaz de:

- Conectar um perfil profissional do Instagram via Meta API.
- Configurar e armazenar o Brand Kit do usuário.
- Fazer upload de identidade visual e extrair referências com IA.
- Gerar posts únicos, carrosséis estruturados ou roteiros de Reel.
- Gerar imagens por slide via DALL-E 3.
- Gerar legendas e hashtags.
- Publicar diretamente no Instagram (feed e Reels).

---

## 2. Arquitetura Geral

### Stack Recomendada

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js / React |
| Backend | Python + FastAPI |
| Banco de dados | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Autenticação do Instagram | Meta OAuth |
| Publicação | Meta Graph API / Instagram API |
| IA | OpenAI — gpt-4o (texto + visão) + dall-e-3 (imagens) |
| Deploy frontend | Vercel |
| Deploy backend | Render |

### Arquitetura em Alto Nível

```txt
Usuário
  ↓
Frontend Next.js
  ↓
Backend FastAPI
  ↓        ↓        ↓
Supabase  IA       Meta Graph API
DB/Storage         Instagram
```

---

## 3. Módulos do Sistema

## 3.1 Frontend — Next.js

Responsável por:

- Interface de conexão com Instagram.
- Tela de configuração do Brand Kit.
- Upload de identidade visual.
- Formulário de geração de conteúdo.
- Preview de post único e carrossel.
- Edição de textos gerados.
- Tela de legenda e hashtags.
- Botão de publicação.
- Feedback visual de progresso e erros.

### Principais Telas

| Tela | Descrição |
|---|---|
| Dashboard | Lista de projetos recentes com links para edição. |
| Configurações | Conexão Instagram e gerenciamento do Brand Kit. |
| Upload de Identidade | Envio de logos, PDFs, imagens e referências visuais. |
| Criar Conteúdo | Definição de tema, formato (post / carrossel / reel) e número de slides/cenas. |
| Preview/Edição | Revisão e edição do conteúdo; geração de imagem por slide; upload de vídeo para Reel. |
| Publicação | Revisão final, legenda, hashtags e publicação direta (feed ou Reel). |

---

## 3.2 Backend — FastAPI

Responsável por:

- Orquestração das regras de negócio.
- Comunicação com a Meta API.
- Comunicação com a IA.
- Processamento de uploads.
- Persistência no Supabase.
- Validação de dados via Pydantic.
- Segurança dos tokens e credenciais.

### Por que FastAPI?

FastAPI é adequado para este MVP porque:

- Tem excelente performance para APIs REST.
- Usa Pydantic para validação forte de payloads.
- Integra bem com Python, IA, processamento de imagem e leitura de arquivos.
- Gera documentação automática via Swagger/OpenAPI.
- É simples para evoluir de MVP para produto mais robusto.

---

## 4. Fluxos Principais

## 4.1 Fluxo de Conexão com Instagram

```txt
Usuário clica em Conectar Instagram
  ↓
Frontend chama backend para gerar URL OAuth
  ↓
Usuário é redirecionado para Meta OAuth
  ↓
Meta retorna authorization code no callback
  ↓
Backend troca code por access token
  ↓
Backend criptografa e salva token no Supabase
  ↓
Frontend exibe status Conectado + @handle
```

### Pontos de Atenção

- O token nunca deve ser exposto no frontend.
- O backend deve validar permissões antes de permitir publicação.
- Deve existir rotina para desconectar/remover credenciais.

---

## 4.2 Fluxo de Configuração Manual do Brand Kit

```txt
Usuário acessa configurações
  ↓
Define cor primária, logo e tom de voz
  ↓
Frontend envia dados ao backend
  ↓
Backend salva metadados no Supabase
  ↓
Logo é armazenado no Supabase Storage
  ↓
Brand Kit passa a ser usado como contexto nas gerações
```

---

## 4.3 Fluxo de Upload de Identidade Visual

```txt
Usuário envia arquivos da marca
  ↓
Frontend faz upload para backend
  ↓
Backend valida tipo e tamanho dos arquivos
  ↓
Arquivos são salvos no Supabase Storage
  ↓
Backend processa arquivos com IA
  ↓
IA extrai paleta, estilo, tipografia e padrões visuais
  ↓
Usuário revisa informações extraídas
  ↓
Backend salva metadados finais no Supabase
```

### Arquivos Aceitos no MVP

- PNG
- JPG/JPEG
- SVG
- PDF

### Extrações Esperadas

- Cores principais.
- Cores secundárias.
- Estilo visual predominante.
- Tipografia sugerida.
- Tom visual.
- Recomendações de layout.

---

## 4.4 Fluxo de Geração de Conteúdo

```txt
Usuário informa tema
  ↓
Escolhe Post Único, Carrossel ou Reel
  ↓
Backend busca Brand Kit salvo
  ↓
Backend monta prompt estruturado (por tipo)
  ↓
gpt-4o gera estrutura textual + visual_prompts
  ↓
Backend salva rascunho no banco
  ↓
Frontend exibe preview editável
  ↓
Usuário clica "Gerar imagem com IA" por slide (opcional)
  ↓
DALL-E 3 gera imagem → persiste no Supabase → exibe no preview
```

### Entrada

- Tema do conteúdo.
- Tipo de conteúdo: `single_post`, `carousel` ou `reel`.
- Quantidade de slides (carrossel: 2–10) ou cenas (reel: 3–6).
- Brand Kit do usuário.
- Tom de voz.

### Saída Esperada

Para post único e carrossel — por slide:

- `title`: título do slide.
- `body`: texto de apoio.
- `visual_prompt`: descrição da imagem ideal (usada pelo DALL-E 3).

Para reel — por cena:

- `title`: nome da cena (ex: Hook, Desenvolvimento, CTA).
- `body`: roteiro/script — o que falar ou fazer na câmera.
- `visual_prompt`: direção de câmera — ângulo, movimento, cenário, iluminação.

Em todos os tipos:

- `caption`: legenda completa (até 2.200 chars).
- `hashtags`: array de 10–30 hashtags segmentadas por alcance.

---

## 4.5 Fluxo de Legenda e Hashtags

```txt
Usuário aprova conteúdo visual
  ↓
Backend recebe conteúdo final
  ↓
IA gera legenda e hashtags
  ↓
Backend retorna legenda editável
  ↓
Frontend exibe contador de caracteres
  ↓
Usuário revisa antes de publicar
```

### Regras

- Limite de legenda: 2.200 caracteres.
- Gerar no mínimo 10 hashtags.
- Separar hashtags por nicho e alcance.

---

## 4.6 Fluxo de Publicação — Feed (Post Único / Carrossel)

```txt
Usuário fornece URLs das imagens (ou usa media_url gerados pelo DALL-E 3)
  ↓
POST /instagram/publish/{id} com image_urls
  ↓
Backend cria container de mídia na Meta API
  ↓
Polling até status FINISHED (máx. 60s)
  ↓
Backend publica container → obtém media_id
  ↓
Salva status "published" + instagram_post_url no banco
  ↓
Frontend exibe link do post
```

## 4.7 Fluxo de Publicação — Reel

```txt
Usuário faz upload do vídeo (MP4/MOV ≤ 100MB)
  ↓
POST /content/upload-video → URL pública no Supabase Storage
  ↓
POST /instagram/publish/{id} com video_url
  ↓
Backend cria container REELS na Meta API
  ↓
Polling até status FINISHED (máx. 5 min)
  ↓
Backend publica container → obtém media_id
  ↓
Salva status "published" + instagram_post_url no banco
  ↓
Frontend exibe link do Reel
```

### Estados de Publicação

| Estado | Descrição |
|---|---|
| draft | Conteúdo gerado, ainda não aprovado. |
| approved | Conteúdo aprovado pelo usuário. |
| publishing | Publicação em andamento. |
| published | Publicado com sucesso. |
| failed | Falha na publicação. |

---

## 5. Modelo de Dados Inicial

## 5.1 Tabela `instagram_connections`

Armazena a conexão do usuário com o Instagram.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador da conexão. |
| user_id | uuid | Identificador do usuário dono da conexão. |
| instagram_handle | text | @handle conectado. |
| instagram_user_id | text | ID retornado pela Meta API. |
| access_token_encrypted | text | Token criptografado. |
| token_expires_at | timestamptz | Data de expiração do token. |
| status | text | connected/disconnected/expired. |
| created_at | timestamptz | Data de criação. |
| updated_at | timestamptz | Data de atualização. |

---

## 5.2 Tabela `brand_kits`

Armazena a identidade visual consolidada do usuário.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do Brand Kit. |
| user_id | uuid | Dono do Brand Kit. |
| primary_color | text | Cor primária em HEX. |
| secondary_colors | jsonb | Lista de cores secundárias. |
| logo_url | text | URL do logo no Storage. |
| tone_of_voice | text | Tom de voz escolhido. |
| visual_style | text | Estilo visual predominante. |
| typography_suggestion | text | Tipografia sugerida. |
| layout_patterns | jsonb | Padrões de layout extraídos. |
| source | text | manual/ai/hybrid. |
| created_at | timestamptz | Data de criação. |
| updated_at | timestamptz | Data de atualização. |

---

## 5.3 Tabela `brand_assets`

Armazena arquivos enviados pelo usuário.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do arquivo. |
| user_id | uuid | Dono do arquivo. |
| brand_kit_id | uuid | Brand Kit relacionado. |
| file_name | text | Nome original do arquivo. |
| file_type | text | Tipo do arquivo. |
| storage_url | text | URL no Supabase Storage. |
| extracted_metadata | jsonb | Dados extraídos pela IA. |
| created_at | timestamptz | Data de upload. |

---

## 5.4 Tabela `content_projects`

Armazena cada conteúdo criado.

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do conteúdo. |
| user_id | uuid | Dono do conteúdo. |
| type | text | single_post / carousel / reel. |
| theme | text | Tema informado pelo usuário. |
| slides_count | integer | Número de slides ou cenas. |
| status | text | draft / approved / publishing / published / failed. |
| caption | text | Legenda final. |
| hashtags | jsonb | Hashtags sugeridas. |
| instagram_media_id | text | ID da mídia na Meta API. |
| instagram_post_url | text | Link do post publicado. |
| error_message | text | Mensagem de erro, se houver. |
| created_at | timestamptz | Data de criação. |
| updated_at | timestamptz | Data de atualização. |

---

## 6. APIs do Backend

## 6.1 Instagram

### `GET /auth/instagram/connect`

Gera a URL de autorização OAuth da Meta.

**Resposta:**

```json
{
  "auth_url": "https://..."
}
```

---

### `GET /auth/instagram/callback`

Recebe o callback da Meta e troca o code por token.

**Parâmetros:**

- `code`
- `state`

**Resposta:**

```json
{
  "status": "connected",
  "instagram_handle": "@minhamarca"
}
```

---

### `POST /auth/instagram/disconnect`

Remove a conexão ativa.

**Resposta:**

```json
{
  "status": "disconnected"
}
```

---

## 6.2 Brand Kit

### `GET /brand-kit`

Retorna o Brand Kit atual.

---

### `POST /brand-kit`

Cria ou atualiza o Brand Kit manual.

**Payload:**

```json
{
  "primary_color": "#C9A227",
  "tone_of_voice": "inspiracional",
  "logo_url": "https://..."
}
```

---

### `POST /brand-kit/upload`

Recebe arquivos da identidade visual para análise.

**Tipo:** `multipart/form-data`

**Resposta:**

```json
{
  "asset_ids": ["uuid"],
  "extracted_metadata": {
    "colors": ["#000000", "#FFFFFF"],
    "visual_style": "minimalista",
    "typography_suggestion": "sans-serif elegante"
  }
}
```

---

### `POST /brand-kit/confirm-extraction`

Confirma ou ajusta os dados extraídos pela IA.

---

## 6.3 Conteúdo

### `POST /content/generate`

Gera post único, carrossel ou reel.

**Payload:**

```json
{
  "theme": "5 dicas para melhorar sua presença digital",
  "type": "carousel",
  "slides_count": 5
}
```

**`type` aceito:** `"single_post"` | `"carousel"` | `"reel"`

---

### `GET /content` / `GET /content/{id}`

Lista ou retorna projeto completo com slides aninhados.

---

### `PATCH /content/{id}`

Atualiza caption, hashtags e campos dos slides (title, body, visual_prompt).

---

### `POST /content/upload-image`

Upload de imagem (JPEG/PNG/WebP ≤ 10 MB) para o bucket `content-media`. Retorna URL pública.

---

### `POST /content/upload-video`

Upload de vídeo (MP4/MOV ≤ 100 MB) para publicação de Reels. Retorna URL pública.

---

### `POST /content/{id}/slides/{slide_id}/generate-image`

Gera imagem via DALL-E 3 usando o `visual_prompt` do slide. Persiste no Supabase e atualiza `media_url`.

**Resposta:**

```json
{
  "url": "https://...supabase.co/storage/.../generated/uuid.png",
  "slide_id": "uuid"
}
```

---

## 6.4 Publicação

### `POST /instagram/publish/{project_id}`

Publica o conteúdo no Instagram. Comportamento varia por tipo:

**Post único / Carrossel:**

```json
{ "image_urls": ["https://..."] }
```

**Reel:**

```json
{
  "video_url": "https://...",
  "cover_url": "https://..."
}
```

**Resposta:**

```json
{
  "status": "published",
  "instagram_media_id": "...",
  "instagram_post_url": "https://instagram.com/p/...",
  "message": "Publicado com sucesso no Instagram!"
}
```

---

## 7. Contratos de IA

## 7.1 Prompt para Extração de Identidade Visual

Entrada:

- Arquivos enviados.
- Imagens ou PDF convertidos em contexto visual/textual.

Saída esperada em JSON:

```json
{
  "primary_color": "#000000",
  "secondary_colors": ["#FFFFFF", "#C9A227"],
  "visual_style": "minimalista premium",
  "typography_suggestion": "sans-serif moderna",
  "layout_patterns": [
    "uso de bastante espaço em branco",
    "títulos centralizados",
    "contraste alto entre fundo e texto"
  ],
  "tone_recommendation": "inspiracional"
}
```

---

## 7.2 Prompt para Geração de Conteúdo (gpt-4o)

Entrada:

- Tema.
- Tipo de conteúdo: `single_post`, `carousel` ou `reel`.
- Quantidade de slides/cenas.
- Brand Kit (cores, tom de voz).

Saída esperada em JSON (estrutura unificada):

```json
{
  "caption": "Legenda completa com CTA...",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "slides": [
    {
      "slide_order": 1,
      "title": "Título do slide ou nome da cena",
      "body": "Texto do slide ou roteiro da cena",
      "visual_prompt": "Descrição detalhada da imagem ou direção de câmera"
    }
  ]
}
```

Para **reel**, `visual_prompt` descreve direção de câmera (ângulo, movimento, cenário). Para **post/carrossel**, descreve a imagem ideal para geração via DALL-E 3.

---

## 7.3 Geração de Imagem (DALL-E 3)

Entrada:

- `visual_prompt` do slide (gerado pelo gpt-4o).
- Enriquecido automaticamente com: proporção 1:1, alta qualidade, sem texto sobreposto.

Saída:

- URL temporária da OpenAI (~1h de validade).
- Baixada e persistida em `content-media/generated/{uuid}.png`.
- URL pública permanente retornada e salva em `content_slides.media_url`.

---

## 7.3 Prompt para Legenda e Hashtags

Saída esperada:

```json
{
  "caption": "Legenda pronta para Instagram...",
  "hashtags": {
    "niche": ["#marketingdigital"],
    "high_reach": ["#instagram"],
    "medium_reach": ["#conteudodigital"],
    "low_reach": ["#criadoresbrasileiros"]
  },
  "character_count": 850
}
```

---

## 8. Segurança

### Requisitos

- Tokens do Instagram devem ser criptografados antes de salvar.
- Tokens nunca devem ser retornados ao frontend.
- Uploads devem validar extensão, MIME type e tamanho.
- Requisições sensíveis devem exigir autenticação.
- Variáveis de ambiente devem armazenar segredos como:
  - `META_CLIENT_ID`
  - `META_CLIENT_SECRET`
  - `OPENAI_API_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `TOKEN_ENCRYPTION_KEY`

---

## 9. Tratamento de Erros

| Cenário | Comportamento Esperado |
|---|---|
| Token expirado | Exibir solicitação para reconectar Instagram. |
| Falha na IA | Permitir tentar novamente. |
| Upload inválido | Informar formatos aceitos. |
| Erro na publicação | Salvar status failed e mensagem amigável. |
| Legenda acima do limite | Bloquear publicação até ajuste. |
| Carrossel sem slides válidos | Impedir aprovação. |

---

## 10. Observabilidade

### Logs Recomendados

- Tentativas de conexão Instagram.
- Uploads realizados.
- Chamadas de IA.
- Gerações concluídas.
- Tentativas de publicação.
- Erros retornados pela Meta API.

### Métricas Técnicas

- Tempo médio de geração.
- Taxa de erro na IA.
- Taxa de erro na publicação.
- Tempo de upload.
- Quantidade de conteúdos publicados.

---

## 11. Estrutura Sugerida do Backend

```txt
backend/
  app/
    main.py               # startup, CORS, routers, validação de env vars
    core/
      config.py           # variáveis de ambiente
      security.py         # criptografia Fernet
    api/
      routes/
        instagram_auth.py
        brand_kit.py
        content.py        # geração, CRUD, upload-image, upload-video, generate-image
        publish.py        # publicação (single_post / carousel / reel)
    services/
      meta_service.py
      ai_service.py              # gpt-4o (texto + reel) — cliente singleton
      supabase_service.py
      brand_extraction_service.py
      publishing_service.py      # async — suporta post, carrossel e reel
      image_service.py           # dall-e-3 → download → Supabase Storage
    models/
      schemas.py          # Pydantic — inclui type "reel"
    utils/
      file_validation.py
  requirements.txt
```

---

## 12. Estrutura Sugerida do Frontend

```txt
frontend/
  app/
    dashboard/
    settings/
    create/
    preview/
    publish/
  components/
    BrandKitForm.tsx
    InstagramConnectionCard.tsx
    UploadIdentityForm.tsx
    ContentGeneratorForm.tsx
    CarouselPreview.tsx
    SinglePostPreview.tsx
    CaptionEditor.tsx
    PublishButton.tsx
  lib/
    api.ts
    validators.ts
```

---

## 13. Sequência Recomendada de Implementação

### Fase 1 — Base do MVP

1. Criar projeto frontend.
2. Criar projeto FastAPI.
3. Configurar Supabase DB e Storage.
4. Criar tabelas principais.
5. Implementar Brand Kit manual.

### Fase 2 — IA e Conteúdo

1. Implementar geração de post único.
2. Implementar geração de carrossel.
3. Implementar preview editável.
4. Implementar legenda e hashtags.

### Fase 3 — Instagram

1. Implementar OAuth Meta.
2. Salvar token criptografado.
3. Implementar publicação de post único.
4. Implementar publicação de carrossel.
5. Tratar erros da Meta API.

### Fase 4 — Upload Inteligente

1. Upload de arquivos.
2. Extração de cores e estilo.
3. Revisão pelo usuário.
4. Aplicação automática no Brand Kit.

---

## 14. Decisões Técnicas do MVP

| Decisão | Motivo |
|---|---|
| Single-user | Reduz complexidade de permissões e multi-tenancy. |
| FastAPI | Melhor encaixe para IA, arquivos e processamento. |
| Supabase | Banco, storage e auth em uma solução simples. |
| Brand Kit híbrido | Permite configuração manual e extração via IA. |
| Publicação direta | Entrega o maior valor do produto no MVP. |
| Sem agendamento | Reduz dependência de jobs e workers no início. |

---

## 15. Fora do Design Técnico Inicial

Não serão detalhados neste MVP:

- Sistema multiusuário avançado.
- Gestão de clientes.
- Agendamento recorrente.
- Analytics de performance.
- Templates visuais avançados.
- Editor gráfico completo estilo Canva.
- Sistema de aprovação colaborativa.

---

## 16. Resumo

O design técnico proposto prioriza velocidade de construção, clareza arquitetural e aderência ao MVP.

A combinação **Next.js + FastAPI + Supabase + Meta API + IA** permite construir uma primeira versão funcional com baixo custo operacional e boa capacidade de evolução futura.
