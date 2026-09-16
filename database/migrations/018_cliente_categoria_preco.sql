-- =====================================================================
-- MIGRATION 018 — CATEGORIA DE PREÇO DO CLIENTE
-- =====================================================================
-- varejo (padrão) / atacado / repasse. Define qual preço do produto
-- usar nas vendas para este cliente.
-- =====================================================================

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS categoria_preco VARCHAR(20) NOT NULL DEFAULT 'varejo';

ALTER TABLE cliente
    DROP CONSTRAINT IF EXISTS cliente_categoria_preco_check;

ALTER TABLE cliente
    ADD CONSTRAINT cliente_categoria_preco_check
    CHECK (categoria_preco IN ('varejo', 'atacado', 'repasse'));

COMMENT ON COLUMN cliente.categoria_preco IS
    'varejo (padrão), atacado ou repasse.';
