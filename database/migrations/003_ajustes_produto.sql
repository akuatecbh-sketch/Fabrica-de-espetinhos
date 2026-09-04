-- =====================================================================
-- MIGRATION 003 — AJUSTES DE PRODUTO
-- =====================================================================
-- Adiciona código de barras EAN-13 (gerado automaticamente na aplicação
-- quando o operador deixa o campo em branco no cadastro).
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN codigo_barras CHAR(13) UNIQUE;

COMMENT ON COLUMN produto.codigo_barras IS
    'EAN-13 interno (prefixo 2 + empresa 00001 + sequencial) ou informado pelo operador';
