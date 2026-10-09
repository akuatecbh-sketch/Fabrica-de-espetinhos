-- =====================================================================
-- MIGRATION 032 — CONFIRMAÇÃO DE ENTREGA / RECEBIMENTO DO PEDIDO
-- =====================================================================
-- Registro no sistema (opção B): data/hora, quem recebeu e quem registrou.
-- Sem imagem de assinatura (LGPD / tamanho).
-- =====================================================================

BEGIN;

ALTER TABLE pedido
  ADD COLUMN IF NOT EXISTS entregue_em TIMESTAMP,
  ADD COLUMN IF NOT EXISTS recebido_por_nome VARCHAR(150),
  ADD COLUMN IF NOT EXISTS registrado_por_id INTEGER REFERENCES usuario(id);

COMMENT ON COLUMN pedido.entregue_em IS
  'Data/hora em que a loja registrou o recebimento pelo cliente.';
COMMENT ON COLUMN pedido.recebido_por_nome IS
  'Nome de quem recebeu (informado na confirmação).';
COMMENT ON COLUMN pedido.registrado_por_id IS
  'Usuário logado que registrou a confirmação.';

COMMIT;
