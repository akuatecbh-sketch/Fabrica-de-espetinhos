-- =====================================================================
-- MIGRATION 010 — QUEM DEFINIU A EXCEÇÃO DE PERMISSÃO
-- =====================================================================

ALTER TABLE permissao_usuario
    ADD COLUMN IF NOT EXISTS definido_por_id INTEGER REFERENCES usuario(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_permissao_usuario_definido_por
    ON permissao_usuario (definido_por_id);

COMMENT ON COLUMN permissao_usuario.definido_por_id IS
    'Usuário que concedeu ou revogou esta exceção.';
