-- =====================================================================
-- MIGRATION 012 — TIPO DE CUPOM NA VENDA
-- =====================================================================
-- Escolha do operador no PDV: cupom fiscal (NFC-e), cupom não fiscal
-- ou nenhum. Vendas já finalizadas ficam como 'fiscal' (comportamento
-- anterior). 012_pacote_pdv.sql já existia neste repositório; este
-- arquivo segue o pedido 012_tipo_cupom.sql.
-- =====================================================================

ALTER TABLE venda
    ADD COLUMN IF NOT EXISTS tipo_cupom VARCHAR(20) NOT NULL DEFAULT 'fiscal';

ALTER TABLE venda DROP CONSTRAINT IF EXISTS venda_tipo_cupom_check;

ALTER TABLE venda ADD CONSTRAINT venda_tipo_cupom_check
    CHECK (tipo_cupom IN ('fiscal', 'nao_fiscal', 'nenhum'));

COMMENT ON COLUMN venda.tipo_cupom IS
    'fiscal = NFC-e; nao_fiscal = recibo sem valor fiscal; nenhum = sem impressão.';
