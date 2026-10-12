# PRD: Melhorias CreatorAI — v1.1
**Baseado em:** Feedback da usuária Bruna (designer de sobrancelhas) + análise técnica do código  
**Data:** 2026-08-09  
**Status:** Aguardando aprovação

---

## 1. Contexto e problema

A Bruna usa o CreatorAI para criar conteúdo para o Instagram. O fluxo principal já funciona bem: ela insere uma imagem e um tema, o app gera a legenda e publica diretamente no Instagram.

No entanto, quatro problemas recorrentes forçam retrabalho manual a cada uso:

1. Legendas saem genéricas quando o tema não é descrito com precisão suficiente — o app não "conhece" o nicho dela (design de sobrancelhas).
2. Hashtags geradas são excessivas (10–30), ela exclui metade manualmente toda vez.
3. Não é possível editar o tema de um projeto já criado — precisa recomeçar do zero.
4. Só uma legenda é gerada por vez — quando não agrada, reescreve manualmente.

Além disso, duas funcionalidades não funcionaram: geração de imagem (bug de frontend confirmado) e criação de Reels (limitação de fluxo não comunicada).

---

## 2. Objetivos

- Reduzir o tempo e esforço entre entrar no app e publicar um post.
- Eliminar a necessidade de retrabalho manual em hashtags e legendas.
- Permitir ajuste de projeto sem recomeçar do zero.
- Corrigir a geração de imagem e comunicar corretamente a limitação de Reels.

---

## 3. Não-objetivos desta versão

- Não cobre geração ou edição de vídeo para Reels.
- Não cobre integração com outras redes sociais além do Instagram.
- Não cobre agendamento de posts.
- Não cobre análise de métricas dos posts publicados.
- Não cobre redesign visual do app.

---

## 4. Usuário / Persona

**Bruna — Designer de sobrancelhas e henna**
- Nicho fixo e bem definido: design de sobrancelhas.
- Não tem afinidade com gestão de redes sociais — quer o fluxo mais rápido possível.
- Prefere posts limpos, com poucas hashtags.
- Usa o app com imagem já pronta + tema definido.

---

## 5. Escopo — Funcionalidades

| # | Funcionalidade | Tipo | Prioridade |
|---|----------------|------|------------|
| F1 | Contexto de nicho persistente no Brand Kit | Melhoria | Alta |
| F2 | Controle de quantidade de hashtags | Nova feature | Alta |
| F3 | Edição do tema/prompt do projeto | Correção | Alta |
| F4 | Geração de imagem (corrigir bug de frontend) | Bug fix | Alta |
| F5 | Múltiplas opções de legenda | Nova feature | Média |
| F6 | Comunicar limitação de Reels na UI | UX fix | Baixa |

---

## 6. Requisitos funcionais

### F1 — Contexto de nicho persistente

O app não possui campo de nicho no schema. A especialização hoje é implícita via `tone_of_voice` no Brand Kit.

**Requisito:** O usuário deve poder configurar o nicho/especialidade da conta uma única vez no Brand Kit, e esse valor deve ser injetado automaticamente em todas as gerações de legenda.

- O campo de nicho é persistente por conta de usuário.
- A geração combina: nicho + tom de voz + tema do projeto.
- `[CONFIRMAR COM USUÁRIO]` O nicho é sempre o mesmo para a conta ou pode variar por projeto?

---

### F2 — Controle de quantidade de hashtags

Hoje o sistema prompt pede entre 10–30 hashtags (hardcoded). A usuária quer menos.

**Requisito:** O usuário deve poder definir sua preferência de quantidade de hashtags (ex: poucas / médias / muitas), configurada no Brand Kit e aplicada a todas as gerações.

- Presets sugeridos: Poucas (3–5) / Médias (8–12) / Muitas (20–30).
- A quantidade escolhida deve ser respeitada na geração.
- `[CONFIRMAR COM USUÁRIO]` Prefere um número exato ou um preset?

---

### F3 — Edição do tema/prompt do projeto

O endpoint `PATCH /{project_id}` existe mas não expõe o campo `theme` como editável.

**Requisito:** O usuário deve poder editar o tema de um projeto já criado, sem criar um novo projeto.

- Após editar o tema, o app deve oferecer a opção de regenerar a legenda com o novo tema.
- `[ASSUMIR / CONFIRMAR COM USUÁRIO]` A legenda anterior é descartada ao regenerar ou mantida para comparação?

---

### F4 — Geração de imagem (bug fix)

O backend de geração de imagem via DALL-E 3 está implementado e funcional (`POST /{project_id}/slides/{slide_id}/generate-image`). O problema é no frontend.

**Requisito:** O botão de gerar imagem deve chamar o endpoint correto com os parâmetros necessários e exibir o resultado ao usuário.

- O `visual_prompt` do slide deve estar preenchido antes da chamada.
- O estado de loading deve ser exibido durante a geração (pode levar alguns segundos).
- Em caso de erro, exibir mensagem clara ao usuário.

---

### F5 — Múltiplas opções de legenda

Hoje a geração retorna sempre uma legenda. A usuária gostaria de escolher entre pelo menos 2 opções.

**Requisito:** A geração deve retornar 2 opções de legenda para o usuário escolher qual publicar.

- As duas opções são geradas no mesmo contexto (nicho + tema + imagem).
- O usuário escolhe uma opção — a não escolhida é descartada.
- `[CONFIRMAR COM DEV]` Impacto no custo de tokens (GPT-4o): avaliar se é 1 chamada com 2 saídas ou 2 chamadas separadas.
- `[ASSUMIR / CONFIRMAR COM USUÁRIO]` 2 opções é suficiente ou prefere 3?

---

### F6 — Comunicar limitação de Reels

O backend de publicação de Reels existe mas exige um vídeo MP4 já gravado. A usuária tentou criar um Reel como se fosse um post de imagem.

**Requisito:** Quando o tipo "Reel" for selecionado, o app deve comunicar claramente que é necessário fazer upload de um arquivo de vídeo MP4, e guiar o usuário no fluxo correto.

- Exibir mensagem explicativa ao selecionar o tipo Reel.
- Exibir área de upload de vídeo MP4 (já implementada no backend via `POST /upload-video`).

---

## 7. Critérios de aceite

- [ ] Campo de nicho/especialidade existe no Brand Kit e é salvo corretamente.
- [ ] Legenda gerada para nicho "design de sobrancelhas" é específica ao nicho, sem mencionar outras áreas.
- [ ] Usuário pode selecionar quantidade de hashtags (ou preset) e o resultado respeita essa escolha.
- [ ] O campo `theme` de um projeto pode ser editado via interface sem criar novo projeto.
- [ ] Após editar o tema, o app oferece opção de regenerar a legenda.
- [ ] Botão de gerar imagem funciona, exibe loading e mostra o resultado.
- [ ] A geração retorna 2 opções de legenda e o usuário pode escolher uma.
- [ ] Selecionar tipo "Reel" exibe instrução clara sobre necessidade de upload de vídeo.

---

## 8. Riscos e dependências

| Risco | Mitigação |
|-------|-----------|
| Gerar 2 legendas dobra custo de tokens GPT-4o | Avaliar custo antes de implementar F5; considerar 1 chamada com 2 saídas |
| Nicho mal configurado pode piorar a qualidade das legendas | Validar com a Bruna após implementação com seu nicho real |
| Migration do campo `niche` no Supabase pode impactar Brand Kits existentes | Tornar o campo nullable com valor padrão vazio |
| Bug de imagem pode ter causa raiz diferente da esperada (ex: CORS, token expirado) | Investigar o console do browser antes de alterar o frontend |

---

## 9. Métricas de sucesso

- Redução do tempo entre entrar no app e publicar (relato qualitativo da usuária).
- Redução da frequência de ajuste manual de hashtags e legenda.
- `[CONFIRMAR COM USUÁRIO]` Se há interesse em medir formalmente ou feedback qualitativo é suficiente.

---

---

# SPECS TÉCNICAS DE IMPLEMENTAÇÃO

> Organizado por fase de entrega. Cada fase é independente e pode ser validada separadamente.

---

## FASE 1 — Quick wins (baixo esforço, alto impacto) ✅ CONCLUÍDA
**Meta:** Corrigir o que trava o uso hoje sem mudar a arquitetura.

---

### [F3] Edição do tema do projeto ✅

**Arquivo:** `backend/app/models/schemas.py`
- [x] Adicionar campo opcional `theme: Optional[str] = None` ao `ContentUpdateRequest`

**Arquivo:** `backend/app/api/routes/content.py` (linha 205)
- [x] Incluir `theme` no dicionário de campos editáveis do `PATCH /{project_id}`

**Arquivo:** `frontend/lib/api.ts`
- [x] Adicionar `theme?: string` à interface `ContentUpdateRequest`

**Arquivo:** `frontend/components/ContentPreview.tsx`
- [x] Adicionar `theme` ao `EditState` e ao `initEditState`
- [x] Adicionar campo "Tema do conteúdo" no tab de edição
- [x] Incluir `theme` no payload do `handleSave`

> Nota: botão "Regenerar legenda" adiado para Fase 2+ — requer endpoint novo no backend.

---

### [F4] Corrigir erro silencioso na geração de imagem ✅

**Arquivo:** `frontend/components/ContentPreview.tsx`
- [x] Substituir `alert()` por estado de erro inline por slide (`slideImageErrors`)
- [x] Exibir mensagem de erro abaixo do botão quando a geração falha
- [x] Adicionar botão "Gerar novamente" quando a imagem já existe (permite regeração)

> Nota: a infraestrutura (endpoint, função `generateSlideImage`) estava correta.
> O erro era silenciado pelo `alert()` — agora o usuário vê a mensagem inline.
> Se o erro persistir, verificar o token JWT no console do browser.

---

### [F6] Comunicar limitação de Reels na UI ✅

**Arquivo:** `frontend/components/ContentGeneratorForm.tsx`
- [x] Reescrever o bloco `reelInfo` explicando que a IA gera o roteiro e o usuário grava o vídeo
- [x] Manter lista de requisitos técnicos (resolução, formato, tamanho)

---

## FASE 2 — Brand Kit melhorado
**Meta:** O app passa a "conhecer" o nicho da Bruna e respeitar sua preferência de hashtags.

---

### [F1] Campo de nicho no Brand Kit

**Banco de dados (Supabase):**
- [ ] Adicionar coluna `niche TEXT` à tabela `brand_kits` (nullable, default `''`)

**Arquivo:** `backend/app/services/ai_service.py` (linhas 48–84)
- [ ] Buscar campo `niche` do Brand Kit junto com `tone_of_voice`
- [ ] Incluir o nicho no system prompt:
  ```
  - Nicho/Especialidade: {niche}
  ```
- [ ] Posicionar antes do tom de voz no prompt para dar contexto ao modelo

**Arquivo:** `backend/app/services/supabase_service.py`
- [ ] Garantir que o campo `niche` é retornado na query de Brand Kit

**Arquivo:** `frontend/` (tela de Brand Kit — `[IDENTIFICAR ARQUIVO]`)
- [ ] Adicionar campo de input "Nicho / Especialidade" no formulário do Brand Kit
- [ ] Placeholder sugerido: ex. "Design de sobrancelhas", "Maquiagem artística"
- [ ] Salvar via endpoint de atualização de Brand Kit existente

---

### [F2] Controle de quantidade de hashtags

**Banco de dados (Supabase):**
- [ ] Adicionar coluna `hashtag_preset TEXT` à tabela `brand_kits`
  - Valores aceitos: `'few'` (3–5), `'medium'` (8–12), `'many'` (20–30)
  - Default: `'medium'`

**Arquivo:** `backend/app/services/ai_service.py` (linhas 64–65)
- [ ] Substituir range hardcoded de hashtags pelo valor do preset:
  ```python
  hashtag_ranges = {
      'few': (3, 5),
      'medium': (8, 12),
      'many': (20, 30),
  }
  min_h, max_h = hashtag_ranges.get(brand_kit.get('hashtag_preset', 'medium'), (8, 12))
  ```
- [ ] Atualizar o system prompt para usar `min_h` e `max_h` dinamicamente

**Arquivo:** `backend/app/services/supabase_service.py`
- [ ] Garantir que `hashtag_preset` é retornado na query de Brand Kit

**Arquivo:** `frontend/` (tela de Brand Kit — `[IDENTIFICAR ARQUIVO]`)
- [ ] Adicionar seletor de preset: Poucas (3–5) / Médias (8–12) / Muitas (20–30)
- [ ] Exibir descrição de cada opção para orientar o usuário

---

## FASE 3 — Múltiplas opções de legenda
**Meta:** Usuária escolhe entre 2 legendas geradas, reduzindo reescritas manuais.

> ⚠️ Confirmar custo de tokens com o dev antes de iniciar esta fase.

---

### [F5] Geração de 2 opções de legenda

**Abordagem recomendada:** 1 chamada ao GPT-4o pedindo 2 legendas no mesmo JSON.

**Arquivo:** `backend/app/services/ai_service.py`
- [ ] Alterar o JSON esperado na resposta do GPT-4o para incluir `caption_options`:
  ```json
  {
    "caption_options": ["legenda opção 1", "legenda opção 2"],
    "hashtags": [...],
    "slides": [...]
  }
  ```
- [ ] Atualizar o system prompt para pedir explicitamente 2 variações de legenda
- [ ] Atualizar `_validate_and_build()` para lidar com `caption_options`

**Arquivo:** `backend/app/models/schemas.py`
- [ ] Adicionar campo `caption_options: Optional[list[str]] = None` ao response model
- [ ] Manter campo `caption` (legenda escolhida após seleção do usuário)

**Arquivo:** `backend/app/api/routes/content.py`
- [ ] Retornar `caption_options` na resposta do `POST /content/generate`
- [ ] Criar endpoint `POST /{project_id}/select-caption` ou reutilizar o `PATCH`:
  - Recebe a opção escolhida e salva como `caption` definitivo no projeto

**Arquivo:** `frontend/` (tela de preview — `[IDENTIFICAR ARQUIVO]`)
- [ ] Exibir as 2 opções de legenda lado a lado (ou em tabs)
- [ ] Botão "Usar esta" em cada opção — confirma a escolha e salva
- [ ] A opção não escolhida é descartada sem ação adicional

---

## Ordem de entrega sugerida

```
Fase 1 (1–2 dias)
├── F3: Edição do tema       → backend simples + UI
├── F4: Bug de imagem        → investigar + corrigir frontend
└── F6: Aviso de Reels       → UI only

Fase 2 (2–3 dias)
├── F1: Campo de nicho       → migration + prompt + UI
└── F2: Controle hashtags    → migration + prompt + UI

Fase 3 (2–3 dias)
└── F5: 2 opções de legenda  → prompt + schema + UI
```

---

## Arquivos-chave para referência

| Arquivo | Responsabilidade |
|---------|-----------------|
| `backend/app/services/ai_service.py` | System prompt, geração de legenda e hashtags |
| `backend/app/api/routes/content.py` | Endpoints de criação, edição e geração de imagem |
| `backend/app/models/schemas.py` | Modelos Pydantic (request/response) |
| `backend/app/services/supabase_service.py` | Queries ao banco de dados |
| `backend/app/services/publishing_service.py` | Publicação no Instagram (posts e Reels) |
| `backend/app/services/image_service.py` | Geração de imagem via DALL-E 3 |
| `frontend/` | `[MAPEAR COMPONENTES]` nos arquivos de frontend |
