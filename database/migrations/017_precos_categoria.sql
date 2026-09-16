-- =====================================================================
-- MIGRATION 017 — PREÇOS POR CATEGORIA (VAREJO / ATACADO / REPASSE)
-- =====================================================================
-- preco_venda continua sendo o preço de varejo (padrão).
-- preco_atacado e preco_repasse são opcionais; NULL = usar preco_venda.
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS preco_atacado NUMERIC(12, 2),
    ADD COLUMN IF NOT EXISTS preco_repasse NUMERIC(12, 2);

COMMENT ON COLUMN produto.preco_venda IS
    'Preço de varejo (padrão). Usado também quando atacado ou repasse não estão preenchidos.';
COMMENT ON COLUMN produto.preco_atacado IS
    'Preço de atacado. NULL = usar preco_venda.';
COMMENT ON COLUMN produto.preco_repasse IS
    'Preço de repasse. NULL = usar preco_venda.';
