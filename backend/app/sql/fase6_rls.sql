-- Fase 6 — Ativar RLS em todas as tabelas e criar políticas de isolamento por user_id
-- Executar no SQL Editor do Supabase (projeto InstagramCreator)

-- ─── instagram_connections ────────────────────────────────────────────────────
ALTER TABLE instagram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_connections"
  ON instagram_connections FOR ALL
  USING (auth.uid() = user_id);

-- ─── brand_kits ───────────────────────────────────────────────────────────────
ALTER TABLE brand_kits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_brand_kits"
  ON brand_kits FOR ALL
  USING (auth.uid() = user_id);

-- ─── brand_assets ─────────────────────────────────────────────────────────────
ALTER TABLE brand_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_brand_assets"
  ON brand_assets FOR ALL
  USING (auth.uid() = user_id);

-- ─── content_projects ─────────────────────────────────────────────────────────
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_projects"
  ON content_projects FOR ALL
  USING (auth.uid() = user_id);

-- ─── content_slides ───────────────────────────────────────────────────────────
-- Slides não têm user_id direto: acesso é permitido se o projeto pai pertence ao usuário
ALTER TABLE content_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_slides"
  ON content_slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM content_projects
      WHERE content_projects.id = content_slides.project_id
        AND content_projects.user_id = auth.uid()
    )
  );
