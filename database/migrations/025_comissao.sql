-- =====================================================================
-- MIGRATION 025 — COMISSÃO DE VENDEDOR
-- =====================================================================

ALTER TABLE funcionario
    ADD COLUMN percentual_comissao NUMERIC(5,2);

COMMENT ON COLUMN funcionario.percentual_comissao IS 'Percentual de comissão sobre vendas realizadas por este funcionário (via usuario.id vinculado em venda.operador_id). NULL = não recebe comissão.';
