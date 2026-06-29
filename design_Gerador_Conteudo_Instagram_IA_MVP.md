# Design — Gerador de Conteúdo para Instagram com IA (MVP)

## 1. Visão Técnica

Este documento descreve o desenho técnico do MVP do **Gerador de Conteúdo para Instagram com IA**, baseado no PRD do produto.

O objetivo técnico é construir uma aplicação single-user capaz de:

- Conectar um perfil profissional do Instagram via Meta API.
- Configurar e armazenar o Brand Kit do usuário.
- Fazer upload de identidade visual e extrair referências com IA.
- Gerar posts únicos ou carrosséis estruturados.
- Gerar legendas e hashtags.
- Publicar diretamente no Instagram.

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
| IA | OpenAI ou modelo multimodal equivalente |
| Deploy frontend | Vercel |
| Deploy backend | Render, Railway, Fly.io ou Cloud Run |

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
| Dashboard | Resumo do estado da conta, Brand Kit e conteúdos recentes. |
| Configurações | Conexão Instagram e gerenciamento do Brand Kit. |
| Upload de Identidade | Envio de logos, PDFs, imagens e referências visuais. |
| Criar Conteúdo | Definição de tema, formato e quantidade de slides. |
| Preview/Edição | Revisão e edição do post ou carrossel. |
| Publicação | Revisão final, legenda, hashtags e publicação. |

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
Escolhe Post Único ou Carrossel
  ↓
Backend busca Brand Kit salvo
  ↓
Backend monta prompt estruturado
  ↓
IA gera estrutura textual e visual
  ↓
Backend salva rascunho no banco
  ↓
Frontend exibe preview editável
```

### Entrada

- Tema do conteúdo.
- Tipo de conteúdo: `single_post` ou `carousel`.
- Quantidade de slides, quando for carrossel.
- Brand Kit do usuário.
- Tom de voz.

### Saída Esperada

Para post único:

- Título.
- Texto principal.
- Sugestão visual.
- CTA opcional.

Para carrossel:

- Lista de slides.
- Título por slide.
- Texto de apoio por slide.
- Sugestão visual por slide.
- Estrutura narrativa.

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

## 4.6 Fluxo de Publicação

```txt
Usuário clica em Publicar Agora
  ↓
Frontend envia conteúdo aprovado ao backend
  ↓
Backend valida token Instagram
  ↓
Backend envia mídia e legenda para Meta API
  ↓
Meta processa publicação
  ↓
Backend salva status e link do post
  ↓
Frontend exibe sucesso ou erro
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
| type | text | single_post/carousel. |
| theme | text | Tema informado pelo usuário. |
| status | text | draft/approved/publishing/published/failed. |
| generated_content | jsonb | Estrutura textual e visual gerada. |
| caption | text | Legenda final. |
| hashtags | jsonb | Hashtags sugeridas. |
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

Gera post único ou carrossel.

**Payload:**

```json
{
  "theme": "5 dicas para melhorar sua presença digital",
  "type": "carousel",
  "slides_count": 5
}
```

**Resposta:**

```json
{
  "content_project_id": "uuid",
  "type": "carousel",
  "slides": [
    {
      "slide_number": 1,
      "title": "Sua presença digital importa",
      "body": "O primeiro passo é entender como sua marca aparece online.",
      "visual_suggestion": "Fundo claro com destaque para o título."
    }
  ]
}
```

---

### `PATCH /content/{content_project_id}`

Atualiza textos editados pelo usuário.

---

### `POST /content/{content_project_id}/caption`

Gera legenda e hashtags.

---

## 6.4 Publicação

### `POST /instagram/publish`

Publica o conteúdo aprovado no Instagram.

**Payload:**

```json
{
  "content_project_id": "uuid"
}
```

**Resposta:**

```json
{
  "status": "published",
  "instagram_post_url": "https://instagram.com/p/..."
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

## 7.2 Prompt para Geração de Conteúdo

Entrada:

- Tema.
- Tipo de conteúdo.
- Quantidade de slides.
- Brand Kit.
- Tom de voz.

Saída esperada em JSON.

Para post único:

```json
{
  "type": "single_post",
  "title": "Título do post",
  "body": "Texto principal",
  "visual_suggestion": "Descrição visual da arte",
  "cta": "Chamada para ação"
}
```

Para carrossel:

```json
{
  "type": "carousel",
  "slides": [
    {
      "slide_number": 1,
      "title": "Título do slide",
      "body": "Texto de apoio",
      "visual_suggestion": "Descrição visual"
    }
  ],
  "narrative_structure": "gancho, desenvolvimento, fechamento e CTA"
}
```

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
    main.py
    core/
      config.py
      security.py
    api/
      routes/
        instagram_auth.py
        brand_kit.py
        content.py
        publish.py
    services/
      meta_service.py
      ai_service.py
      supabase_service.py
      brand_extraction_service.py
      publishing_service.py
    models/
      schemas.py
    utils/
      file_validation.py
      encryption.py
  requirements.txt
  Dockerfile
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
