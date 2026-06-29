-- ============================================================
-- CreatorAI — Fase 3: Geração de Conteúdo
-- Executar no SQL Editor do Supabase (projeto: gmhdjmyryathesebprky)
-- ============================================================

-- ─── 1. content_projects ────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_projects (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID            NOT NULL,
    type                TEXT            NOT NULL CHECK (type IN ('single_post', 'carousel')),
    theme               TEXT            NOT NULL,
    slides_count        INTEGER         NOT NULL DEFAULT 1 CHECK (slides_count BETWEEN 1 AND 10),
    caption             TEXT,
    hashtags            JSONB           NOT NULL DEFAULT '[]'::jsonb,
    status              TEXT            NOT NULL DEFAULT 'draft'
                                            CHECK (status IN ('draft', 'approved', 'publishing', 'published', 'failed')),
    instagram_media_id  TEXT,
    instagram_post_url  TEXT,
    error_message       TEXT,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Índice para listagem por usuário (ordem cronológica inversa)
CREATE INDEX IF NOT EXISTS idx_content_projects_user_created
    ON content_projects (user_id, created_at DESC);

-- Índice para filtrar por status
CREATE INDEX IF NOT EXISTS idx_content_projects_status
    ON content_projects (user_id, status);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_content_projects_updated_at ON content_projects;
CREATE TRIGGER trg_content_projects_updated_at
    BEFORE UPDATE ON content_projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ─── 2. content_slides ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_slides (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      UUID        NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
    slide_order     INTEGER     NOT NULL CHECK (slide_order >= 1),
    title           TEXT,
    body            TEXT,
    visual_prompt   TEXT,
    media_url       TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_slide_order UNIQUE (project_id, slide_order)
);

-- Índice para busca dos slides de um projeto na ordem correta
CREATE INDEX IF NOT EXISTS idx_content_slides_project_order
    ON content_slides (project_id, slide_order ASC);


-- ─── 3. Comentários de documentação ─────────────────────────

COMMENT ON TABLE  content_projects                  IS 'Projetos de conteúdo gerados pela IA (posts únicos ou carrosséis).';
COMMENT ON COLUMN content_projects.type             IS 'single_post | carousel';
COMMENT ON COLUMN content_projects.theme            IS 'Tema/briefing informado pelo usuário.';
COMMENT ON COLUMN content_projects.slides_count     IS 'Número de slides (1 para single_post, 2-10 para carousel).';
COMMENT ON COLUMN content_projects.hashtags         IS 'Array JSON de strings: ["#tag1", "#tag2", ...]';
COMMENT ON COLUMN content_projects.status           IS 'draft → approved → publishing → published | failed';
COMMENT ON COLUMN content_projects.instagram_media_id IS 'ID do media container no Instagram após publicação.';

COMMENT ON TABLE  content_slides                    IS 'Slides individuais de um content_project.';
COMMENT ON COLUMN content_slides.visual_prompt      IS 'Prompt detalhado para geração futura de imagem via IA.';
COMMENT ON COLUMN content_slides.media_url          IS 'URL da imagem gerada/aprovada para este slide.';
