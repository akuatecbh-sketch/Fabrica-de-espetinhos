-- =====================================================================
-- MIGRATION 016 — VÍNCULO PEDIDO → VENDA
-- =====================================================================
-- Grava a venda gerada ao converter um pedido (botão "Vender").
-- =====================================================================

ALTER TABLE pedido
    ADD COLUMN IF NOT EXISTS venda_id INTEGER UNIQUE REFERENCES venda(id);

COMMENT ON COLUMN pedido.venda_id IS
    'Venda criada na conversão do pedido. Preenchido quando status = convertido.';

CREATE INDEX IF NOT EXISTS idx_pedido_venda
    ON pedido (venda_id);
