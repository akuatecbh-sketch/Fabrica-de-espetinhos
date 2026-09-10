-- =====================================================================
-- MIGRATION 016 — SITUAÇÃO "APROVADO" NO PEDIDO
-- =====================================================================
-- Estágio intermediário de acompanhamento (Aberto / Enviado / Aprovado).
-- Não altera token_publico nem conversão em venda.
-- (016_pedido_venda.sql já existia; este arquivo só amplia o CHECK de status.)
-- =====================================================================

DO $$
DECLARE
  nome text;
BEGIN
  SELECT conname INTO nome
  FROM pg_constraint
  WHERE conrelid = 'pedido'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%status%aberto%';
  IF nome IS NOT NULL THEN
    EXECUTE format('ALTER TABLE pedido DROP CONSTRAINT %I', nome);
  END IF;
END $$;

ALTER TABLE pedido
  ADD CONSTRAINT pedido_status_check
  CHECK (status IN (
    'aberto',
    'enviado',
    'aprovado',
    'convertido',
    'cancelado'
  ));

COMMENT ON COLUMN pedido.status IS
    'aberto, enviado, aprovado, convertido ou cancelado.';
COMMENT ON TABLE pedido IS
    'Pedido de cliente (pré-venda). Editável em aberto, enviado e aprovado; somente leitura após convertido ou cancelado.';
