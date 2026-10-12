# PRD — Gerador de Conteúdo para Instagram com IA (MVP)

## 1. Visão do Produto

### Objetivo

Criar uma aplicação que permita a criadores de conteúdo gerar e publicar posts no Instagram automaticamente usando IA, reduzindo o tempo de produção de conteúdo e mantendo consistência visual com a marca.

### Proposta de Valor

- Criar posts únicos, carrosséis ou Reels em poucos segundos.
- Gerar imagens automaticamente por slide via IA (DALL-E 3) a partir do prompt visual gerado.
- Garantir consistência visual com a identidade da marca.
- Reduzir esforço manual de design, copywriting e publicação.
- Permitir publicação direta no Instagram (feed e Reels) após revisão do usuário.

### Persona

**Criador de Conteúdo / Empreendedor Individual**

Perfil:

- Trabalha sozinho ou com estrutura pequena.
- Precisa publicar com frequência no Instagram.
- Não possui tempo ou habilidade avançada em design.
- Deseja transformar ideias em posts com rapidez.
- Usa o Instagram como canal principal de aquisição, posicionamento ou relacionamento.

---

## 2. Escopo do MVP

### Incluído no MVP

- Conexão com perfil profissional do Instagram via Meta API.
- Configuração manual de Brand Kit.
- Upload de identidade visual com extração inteligente via IA.
- Geração de conteúdo visual em três formatos:
  - Post único.
  - Carrossel estruturado (2–10 slides).
  - Reel com roteiro por cenas (3–6 cenas).
- Geração automática de imagem por slide via DALL-E 3.
- Geração automática de legenda e hashtags.
- Preview e edição antes da publicação.
- Publicação direta no Instagram (feed e Reels).

### Fora do Escopo do MVP

- Multi-contas.
- Gestão de clientes.
- Convites por e-mail.
- Perfis Admin vs Cliente.
- Agendamento de posts.
- Analytics de performance.
- Biblioteca avançada de templates.
- Aprovação colaborativa.

---

## 3. User Stories

## Épico 1 — Conexão e Identidade

### US-01 — Conectar Perfil do Instagram

**Como criador de conteúdo,**  
eu quero conectar meu perfil profissional do Instagram via Meta API,  
**para que o sistema tenha permissão para publicar posts em meu nome de forma automatizada.**

#### Critérios de Aceite

- Dado que estou na tela de configurações, quando clico em **Conectar Instagram**, então sou redirecionado para o fluxo OAuth da Meta.
- O sistema deve salvar o token de acesso de forma criptografada no Supabase.
- O painel deve exibir claramente o status **Conectado** e o @handle do perfil vinculado.
- Deve haver um botão **Desconectar** que remova as credenciais do banco.
- O sistema deve validar se o token ainda é válido antes de tentar publicar qualquer conteúdo.

---

### US-02 — Configurar Brand Kit Manual

**Como criador de conteúdo,**  
eu quero definir minhas cores, logo e tom de voz,  
**para que a IA gere conteúdos que respeitem minha identidade de marca.**

#### Critérios de Aceite

- O sistema deve permitir a escolha de uma cor primária usando Hex Picker.
- O sistema deve permitir upload de logo em PNG ou SVG.
- Deve existir um seletor de tom de voz, como:
  - Profissional.
  - Casual.
  - Inspiracional.
- As configurações devem ser persistidas no banco de dados.
- O Brand Kit deve ser aplicado automaticamente como contexto para todas as gerações futuras de IA.

---

### US-03 — Upload de Identidade Visual com Extração via IA

**Como criador de conteúdo,**  
eu quero fazer upload dos materiais da minha identidade visual,  
**para que o sistema consiga entender minha marca e aplicar esse padrão nas criações futuras.**

#### Critérios de Aceite

- O sistema deve permitir upload de arquivos como:
  - Logo.
  - Manual de marca.
  - Referências visuais.
  - Prints de posts anteriores.
  - Imagens institucionais.
- O sistema deve aceitar formatos como PNG, JPG, SVG e PDF.
- Após o upload, o sistema deve analisar os arquivos com IA e extrair informações como:
  - Paleta de cores.
  - Estilo visual.
  - Tipografia sugerida.
  - Padrões de layout.
  - Tom visual predominante.
- O usuário deve conseguir revisar e editar as informações extraídas antes de salvar.
- As informações extraídas podem complementar ou sobrescrever o Brand Kit manual.
- Os arquivos devem ser armazenados no Supabase Storage.
- Os metadados extraídos devem ser armazenados no banco de dados.

---

## Épico 2 — Criação de Conteúdo com IA

### US-04 — Gerar Conteúdo Visual: Post Único, Carrossel ou Reel

**Como criador de conteúdo,**  
eu quero gerar posts únicos, carrosséis ou Reels a partir de um tema,  
**para que eu possa criar diferentes formatos de conteúdo para o Instagram com IA.**

#### Critérios de Aceite

- O usuário deve informar um tema em texto.
- O usuário deve escolher o formato do conteúdo:
  - Post único.
  - Carrossel (2–10 slides).
  - Reel (3–6 cenas).
- Para post único, o sistema deve gerar: título, texto principal e prompt visual.
- Para carrossel, a IA deve gerar por slide: título, texto de apoio e prompt visual.
- Para Reel, a IA deve gerar por cena: nome da cena (hook/desenvolvimento/CTA), roteiro/script e direção de câmera.
- O conteúdo deve respeitar Brand Kit e tom de voz.
- O sistema deve apresentar preview do conteúdo gerado com navegação entre slides/cenas.
- O usuário deve conseguir editar qualquer campo antes de aprovar.

---

### US-07 — Gerar Imagem por Slide via DALL-E 3

**Como criador de conteúdo,**  
eu quero gerar a imagem de cada slide com um clique,  
**para que eu não precise criar ou buscar imagens manualmente.**

#### Critérios de Aceite

- Cada slide com `visual_prompt` deve exibir o botão "Gerar imagem com IA".
- Ao clicar, o sistema envia o `visual_prompt` para o DALL-E 3 (1024×1024, proporção 1:1).
- A imagem gerada é salva permanentemente no Supabase Storage e vinculada ao slide.
- A imagem é exibida imediatamente no preview após geração.
- Em caso de falha na API, o sistema exibe mensagem de erro clara.

---

### US-08 — Criar e Publicar Reel

**Como criador de conteúdo,**  
eu quero criar um roteiro de Reel e publicá-lo no Instagram,  
**para que eu possa produzir conteúdo em vídeo com apoio de IA.**

#### Critérios de Aceite

- O usuário escolhe o tipo "Reel" e define o número de cenas (3–6).
- A IA gera: legenda, hashtags e roteiro completo por cena (script + direção).
- O usuário pode fazer upload do vídeo gravado (MP4 ou MOV, máx. 100 MB).
- Ao publicar, o sistema envia o vídeo para a Meta Graph API com `media_type=REELS`.
- O sistema aguarda o processamento (até 5 minutos de polling) e retorna o link do Reel publicado.

---

### US-05 — Gerar Legenda e Hashtags Inteligentes

**Como criador de conteúdo,**  
eu quero que o sistema escreva a legenda e sugira hashtags baseadas no conteúdo gerado,  
**para que o post esteja pronto para publicação com menos esforço manual.**

#### Critérios de Aceite

- A legenda deve ser gerada automaticamente usando o tom de voz configurado.
- A legenda deve estar contextualizada com o conteúdo visual criado.
- O sistema deve sugerir pelo menos 10 hashtags relevantes.
- As hashtags devem ser divididas por:
  - Nicho.
  - Alcance alto.
  - Alcance médio.
  - Alcance baixo.
- Deve haver contador de caracteres com limite de 2.200 caracteres do Instagram.
- O usuário deve conseguir editar a legenda antes da publicação.

---

## Épico 3 — Publicação Direct-to-Instagram

### US-06 — Publicação Instantânea no Instagram

**Como criador de conteúdo,**  
eu quero publicar o material gerado diretamente no Instagram com um clique,  
**para que eu não precise baixar e subir arquivos manualmente.**

#### Critérios de Aceite

- O botão **Publicar Agora** só deve ficar ativo após:
  - Geração completa da mídia.
  - Geração ou definição da legenda.
  - Aprovação do usuário.
- O sistema deve exibir um indicador de progresso durante o upload para a Meta API.
- O sistema deve publicar o conteúdo no perfil conectado.
- Após sucesso, o sistema deve fornecer um link direto para o post publicado.
- O sistema deve exibir mensagens claras em caso de erro, como:
  - Token expirado.
  - Falha de upload.
  - Permissão insuficiente.
  - Formato de mídia inválido.

---

## 4. Fluxo do Usuário

1. Usuário acessa a aplicação.
2. Usuário conecta o perfil profissional do Instagram.
3. Usuário configura o Brand Kit manualmente ou faz upload da identidade visual.
4. Sistema processa a identidade visual e sugere padrões da marca.
5. Usuário revisa e salva o Brand Kit.
6. Usuário informa o tema do conteúdo.
7. Usuário escolhe o formato:
   - Post único.
   - Carrossel.
   - Reel.
8. Sistema gera o conteúdo textual (slides/cenas, legenda, hashtags).
9. Usuário visualiza o preview e edita textos, se necessário.
10. Usuário clica em "Gerar imagem com IA" por slide (opcional, DALL-E 3).
11. Para Reel: usuário grava e faz upload do vídeo (MP4/MOV).
12. Usuário clica em **Publicar Agora**.
13. Sistema publica via Meta API (feed ou Reel).
14. Sistema exibe confirmação e link do post publicado.

---

## 5. Arquitetura de Alto Nível

### Frontend

**Tecnologia recomendada:** Next.js / React

Responsabilidades:

- Interface do usuário.
- Fluxo de conexão com Instagram.
- Configuração do Brand Kit.
- Upload de arquivos.
- Formulário de geração de conteúdo.
- Preview de post único e carrossel.
- Edição manual de textos.
- Ação de publicação.

---

### Backend

**Tecnologia recomendada:** Python + FastAPI

Responsabilidades:

- Expor endpoints REST para o frontend.
- Orquestrar chamadas para IA.
- Processar uploads de identidade visual.
- Extrair informações de imagens e PDFs.
- Integrar com Supabase.
- Integrar com Meta Graph API.
- Gerenciar tokens e credenciais com segurança.
- Validar payloads usando Pydantic.
- Centralizar regras de negócio.

#### Endpoints sugeridos

```txt
GET  /auth/instagram/connect
GET  /auth/instagram/callback
POST /auth/instagram/disconnect
GET  /auth/instagram/status

GET  /brand-kit
POST /brand-kit
POST /brand-kit/upload

POST /content/generate
GET  /content
GET  /content/{id}
PATCH /content/{id}
POST /content/upload-image
POST /content/upload-video
POST /content/{id}/slides/{slide_id}/generate-image

POST /instagram/publish/{project_id}

GET  /health
```

---

### Banco de Dados e Storage

**Tecnologia recomendada:** Supabase

Responsabilidades:

- Persistir dados do usuário.
- Armazenar tokens criptografados.
- Guardar configurações do Brand Kit.
- Armazenar metadados da identidade visual.
- Armazenar arquivos enviados pelo usuário via Supabase Storage.
- Registrar conteúdos gerados e status de publicação.

---

### Inteligência Artificial

Responsabilidades:

- Gerar estrutura textual de posts, carrosséis e Reels (gpt-4o).
- Gerar legendas e hashtags (gpt-4o).
- Analisar arquivos de identidade visual e extrair paleta, estilo e tipografia (gpt-4o Vision).
- Gerar imagens por slide a partir do visual_prompt (DALL-E 3, 1024×1024).
- Adaptar conteúdo ao tom de voz e Brand Kit configurados.

---

### Integrações Externas

#### Meta Graph API / Instagram API

Responsabilidades:

- OAuth para conexão do perfil profissional.
- Validação de permissões.
- Upload de mídia.
- Publicação no Instagram.
- Retorno do link do post publicado.

---

## 6. Modelo de Dados Inicial

### users

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do usuário |
| email | text | E-mail do usuário |
| created_at | timestamp | Data de criação |

### instagram_accounts

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador da conexão |
| user_id | uuid | Usuário dono da conexão |
| instagram_handle | text | @handle conectado |
| access_token_encrypted | text | Token criptografado |
| token_expires_at | timestamp | Validade do token |
| status | text | connected/disconnected/expired |
| created_at | timestamp | Data da conexão |

### brand_kits

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do Brand Kit |
| user_id | uuid | Usuário dono |
| primary_color | text | Cor primária HEX |
| logo_url | text | URL do logo |
| tone_of_voice | text | Tom de voz |
| extracted_palette | jsonb | Paleta extraída via IA |
| visual_style | text | Estilo visual identificado |
| typography_suggestion | text | Sugestão de tipografia |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

### content_projects

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do conteúdo |
| user_id | uuid | Usuário dono |
| type | text | single_post / carousel / reel |
| theme | text | Tema informado |
| slides_count | integer | Número de slides/cenas |
| status | text | draft / approved / publishing / published / failed |
| caption | text | Legenda gerada |
| hashtags | jsonb | Hashtags sugeridas |
| instagram_post_url | text | Link do post publicado |
| error_message | text | Mensagem de erro, se houver |
| created_at | timestamp | Data de criação |
| updated_at | timestamp | Data de atualização |

### content_slides

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do slide |
| content_id | uuid | Conteúdo relacionado |
| slide_order | integer | Ordem do slide |
| title | text | Título do slide |
| body | text | Texto de apoio |
| visual_prompt | text | Prompt visual sugerido |
| media_url | text | URL da mídia gerada |

---

## 7. Métricas de Sucesso

### Métricas do MVP

- Tempo médio para gerar um post.
- Percentual de usuários que conectam o Instagram com sucesso.
- Percentual de usuários que concluem a configuração do Brand Kit.
- Quantidade de conteúdos gerados por usuário.
- Taxa de publicação após geração.
- Taxa de edição manual antes da aprovação.
- Taxa de erro na publicação via Meta API.

### Indicadores desejados

- Geração de conteúdo em menos de 60 segundos.
- Redução do esforço manual de criação.
- Publicação concluída sem necessidade de download/upload manual.

---

## 8. Riscos e Premissas

### Riscos

- Limitações ou mudanças na Meta Graph API.
- Necessidade de permissões específicas para publicação no Instagram.
- Qualidade inconsistente dos conteúdos gerados por IA.
- Extração incorreta da identidade visual enviada pelo usuário.
- Falhas de publicação por token expirado ou permissões insuficientes.
- Complexidade na geração de mídia visual consistente.

### Premissas

- O usuário possui perfil profissional ou criador no Instagram.
- O usuário aceita revisar o conteúdo antes de publicar.
- O MVP será single-user, sem gestão multi-conta.
- O usuário deseja reduzir tempo de criação, mas ainda manter controle final sobre o conteúdo.
- O Brand Kit é um diferencial importante para gerar percepção de qualidade.

---

## 9. Roadmap Pós-MVP

- Agendamento de posts.
- Multi-contas.
- Gestão de clientes.
- Biblioteca de templates.
- Analytics de performance.
- Sugestão de calendário editorial.
- Reaproveitamento de conteúdos antigos.
- Geração automática de variações A/B.
- Histórico de publicações.
- Integração com Canva ou ferramentas de design.

---

## 10. Decisões Estratégicas

### Single-user primeiro

A decisão de remover multi-conta, admin/cliente e convites reduz a complexidade inicial de banco, autenticação e autorização.

### Brand Kit como parte central do produto

A consistência visual é uma das maiores dores em ferramentas de IA para criação de conteúdo. Por isso, o Brand Kit entra desde o MVP.

### FastAPI como backend

Python + FastAPI é recomendado para este MVP porque o produto depende fortemente de IA, processamento de arquivos, leitura de imagens, leitura de PDFs, extração de características visuais e orquestração de integrações.

### Supabase como base de dados e storage

Supabase reduz esforço inicial de infraestrutura e oferece autenticação, banco Postgres e storage em uma única plataforma.

### Publicação direta como diferencial

Publicar diretamente no Instagram reduz fricção e fecha o ciclo completo: ideia → criação → revisão → publicação.

---

## 11. Stack Recomendada

```txt
Frontend: Next.js / React (TypeScript, Pages Router)
Backend: Python + FastAPI
Banco de Dados: Supabase Postgres
Storage: Supabase Storage (buckets: brand-assets, content-media)
IA: OpenAI — gpt-4o (texto + visão) + dall-e-3 (geração de imagens)
Integração Social: Meta Graph API / Instagram API
Deploy Frontend: Vercel
Deploy Backend: Render
```

---

## 12. Próximos Passos Recomendados

1. Criar o SDD com arquitetura técnica detalhada.
2. Definir schemas reais do Supabase.
3. Criar contrato dos endpoints FastAPI.
4. Definir prompts de IA para:
   - Extração de identidade visual.
   - Geração de post único.
   - Geração de carrossel.
   - Geração de legenda e hashtags.
5. Desenhar fluxo técnico de OAuth com Meta API.
6. Criar backlog técnico com tasks por épico.
