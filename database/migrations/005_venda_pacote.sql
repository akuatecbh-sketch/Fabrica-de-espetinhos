-- =====================================================================
-- MIGRATION 005 — VENDA EM PACOTE / ATACADO
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN quantidade_por_pacote NUMERIC(12,3) NOT NULL DEFAULT 1,
    ADD COLUMN preco_pacote NUMERIC(12,2),
    ADD COLUMN permite_venda_pacote BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN produto.quantidade_por_pacote IS
    'Quantas unidades (na unidade_medida do produto) compõem um pacote fechado.';
COMMENT ON COLUMN produto.preco_pacote IS
    'Preço de venda do pacote fechado.';
COMMENT ON COLUMN produto.permite_venda_pacote IS
    'Se este produto pode ser vendido fechado, em pacote.';

ALTER TABLE produto
    ADD CONSTRAINT chk_venda_pacote CHECK (
        permite_venda_pacote = FALSE
        OR (quantidade_por_pacote > 1 AND preco_pacote IS NOT NULL)
    );
