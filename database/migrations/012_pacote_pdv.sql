-- =====================================================================
-- MIGRATION 012 — VENDA EM PACOTE NO PDV
-- =====================================================================
-- (Pedido como 011_pacote_pdv; 011_remover_perfil_admin.sql já existia.)
-- Grava no item se a venda foi em pacote/atacado, quantos pacotes e o
-- preço do pacote no momento da venda. quantidade continua em
-- unidades-base para a baixa de estoque.
-- =====================================================================

ALTER TABLE venda_item
    ADD COLUMN IF NOT EXISTS vendido_em_pacote BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE venda_item
    ADD COLUMN IF NOT EXISTS quantidade_pacotes INTEGER;

ALTER TABLE venda_item
    ADD COLUMN IF NOT EXISTS preco_pacote_aplicado NUMERIC(12, 2);

COMMENT ON COLUMN venda_item.vendido_em_pacote IS
    'Se true, o item foi vendido em pacote/atacado.';
COMMENT ON COLUMN venda_item.quantidade_pacotes IS
    'Quantidade de pacotes vendidos. Null se vendido por unidade.';
COMMENT ON COLUMN venda_item.preco_pacote_aplicado IS
    'Preço do pacote no momento da venda (snapshot).';

ALTER TABLE venda_item DROP CONSTRAINT IF EXISTS venda_item_pacote_check;
ALTER TABLE venda_item
    ADD CONSTRAINT venda_item_pacote_check CHECK (
        (
            vendido_em_pacote = FALSE
            AND quantidade_pacotes IS NULL
            AND preco_pacote_aplicado IS NULL
        )
        OR (
            vendido_em_pacote = TRUE
            AND quantidade_pacotes >= 1
            AND preco_pacote_aplicado IS NOT NULL
        )
    );
