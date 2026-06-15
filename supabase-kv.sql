-- =============================================================================
-- 4x4 Mundo Afora CRM — Tabela KV (JSON no Postgres)
-- Cada coleção do app (clients, suppliers, expeditions, payables, leads...)
-- é guardada como UM documento JSON sob a sua chave.
-- =============================================================================

CREATE TABLE IF NOT EXISTS kv_collections (
  name       TEXT PRIMARY KEY,
  data       JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Segurança: liga RLS sem nenhuma policy. Isso bloqueia totalmente o acesso
-- via chave pública (anon). O app acessa pelo servidor com a chave SECRETA
-- (service role), que ignora RLS — então só o backend lê/grava.
ALTER TABLE kv_collections ENABLE ROW LEVEL SECURITY;
