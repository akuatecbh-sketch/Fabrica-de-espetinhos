-- =====================================================================
-- MIGRATION 007 — CRIADO_POR E MÚLTIPLOS SUPER ADMIN
-- =====================================================================

DROP INDEX IF EXISTS usuario_um_super_admin;

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS criado_por_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_criado_por ON usuario (criado_por_id);

COMMENT ON COLUMN usuario.criado_por_id IS
    'Usuário que cadastrou este registro.';
