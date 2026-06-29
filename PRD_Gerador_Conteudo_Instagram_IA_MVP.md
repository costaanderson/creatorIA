# PRD — Gerador de Conteúdo para Instagram com IA (MVP)

## 1. Visão do Produto

### Objetivo

Criar uma aplicação que permita a criadores de conteúdo gerar e publicar posts no Instagram automaticamente usando IA, reduzindo o tempo de produção de conteúdo e mantendo consistência visual com a marca.

### Proposta de Valor

- Criar posts únicos ou carrosséis em poucos segundos.
- Garantir consistência visual com a identidade da marca.
- Reduzir esforço manual de design, copywriting e publicação.
- Permitir publicação direta no Instagram após revisão do usuário.

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
- Geração de conteúdo visual em dois formatos:
  - Post único.
  - Carrossel estruturado.
- Geração automática de legenda e hashtags.
- Preview e edição antes da publicação.
- Publicação direta no Instagram.

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

### US-04 — Gerar Conteúdo Visual: Post Único ou Carrossel

**Como criador de conteúdo,**  
eu quero gerar posts únicos ou carrosséis a partir de um tema,  
**para que eu possa criar diferentes formatos de conteúdo para o Instagram com IA.**

#### Critérios de Aceite

- O usuário deve informar um tema em texto.
- O usuário deve escolher o formato do conteúdo:
  - Post único.
  - Carrossel.
- Para post único, o sistema deve gerar:
  - Título.
  - Texto principal.
  - Sugestão visual.
- Para carrossel, o usuário deve definir a quantidade de slides entre 2 e 10.
- Para carrossel, a IA deve gerar:
  - Título por slide.
  - Texto de apoio por slide.
  - Estrutura narrativa entre os slides.
- O conteúdo deve respeitar:
  - Brand Kit.
  - Tom de voz.
  - Identidade visual extraída.
- O sistema deve apresentar preview do conteúdo gerado.
- No caso de carrossel, o preview deve permitir navegação em formato swipe.
- O usuário deve conseguir editar o texto de qualquer slide ou do post único antes de aprovar.

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
8. Sistema gera o conteúdo visual e textual.
9. Usuário visualiza o preview.
10. Usuário edita textos, se necessário.
11. Sistema gera legenda e hashtags.
12. Usuário revisa e aprova.
13. Usuário clica em **Publicar Agora**.
14. Sistema publica via Meta API.
15. Sistema exibe confirmação e link do post publicado.

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
POST /auth/instagram/connect
POST /auth/instagram/callback
POST /auth/instagram/disconnect
GET  /auth/instagram/status

POST /brand-kit/upload
POST /brand-kit/manual
GET  /brand-kit
PUT  /brand-kit

POST /content/generate
PUT  /content/{content_id}/slides/{slide_id}
POST /content/{content_id}/caption

POST /instagram/publish
GET  /instagram/publication-status/{publication_id}
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

- Gerar estrutura textual de posts e carrosséis.
- Gerar legendas.
- Sugerir hashtags.
- Analisar arquivos de identidade visual.
- Extrair paleta de cores e padrões visuais.
- Adaptar conteúdo ao tom de voz configurado.

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

### generated_contents

| Campo | Tipo | Descrição |
|---|---|---|
| id | uuid | Identificador do conteúdo |
| user_id | uuid | Usuário dono |
| content_type | text | single_post/carousel |
| theme | text | Tema informado |
| status | text | draft/generated/approved/published/error |
| caption | text | Legenda gerada |
| hashtags | jsonb | Hashtags sugeridas |
| publication_url | text | Link do post publicado |
| created_at | timestamp | Data de criação |

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
Frontend: Next.js / React
Backend: Python + FastAPI
Banco de Dados: Supabase Postgres
Storage: Supabase Storage
IA: OpenAI ou modelo multimodal equivalente
Integração Social: Meta Graph API / Instagram API
Deploy Frontend: Vercel
Deploy Backend: Render, Railway, Fly.io ou Google Cloud Run
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
