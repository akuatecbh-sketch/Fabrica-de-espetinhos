-- =====================================================================
-- MIGRATION 026 — INSTAGRAM DA EMPRESA
-- =====================================================================

ALTER TABLE empresa
    ADD COLUMN IF NOT EXISTS instagram VARCHAR(60);

COMMENT ON COLUMN empresa.instagram IS 'Perfil do Instagram da loja, exibido no cupom. NULL = não mostrar.';
