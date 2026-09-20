-- =====================================================================
-- MIGRATION 023 — INVENTÁRIO: CONTAGEM E AJUSTES
-- =====================================================================
-- Renomeia inventario → inventario_contagem, adiciona descrição,
-- status em_andamento/finalizado e campos de diferença/ajuste no item.
-- =====================================================================

ALTER TABLE IF EXISTS inventario RENAME TO inventario_contagem;

ALTER INDEX IF EXISTS idx_inventario_status
    RENAME TO idx_inventario_contagem_status;
ALTER INDEX IF EXISTS idx_inventario_criado_em
    RENAME TO idx_inventario_contagem_criado_em;

ALTER TABLE inventario_contagem
    ADD COLUMN IF NOT EXISTS descricao VARCHAR(200);

UPDATE inventario_contagem
SET descricao = COALESCE(NULLIF(BTRIM(descricao), ''), NULLIF(BTRIM(observacao), ''), 'Contagem')
WHERE descricao IS NULL OR BTRIM(descricao) = '';

ALTER TABLE inventario_contagem
    ALTER COLUMN descricao SET DEFAULT '';

ALTER TABLE inventario_contagem
    ALTER COLUMN descricao SET NOT NULL;

ALTER TABLE inventario_contagem
    DROP COLUMN IF EXISTS observacao;

ALTER TABLE inventario_contagem
    DROP CONSTRAINT IF EXISTS inventario_status_check;
ALTER TABLE inventario_contagem
    DROP CONSTRAINT IF EXISTS inventario_contagem_status_check;

UPDATE inventario_contagem
SET status = 'em_andamento'
WHERE status IN ('aberto', 'em_contagem');

ALTER TABLE inventario_contagem
    ALTER COLUMN status SET DEFAULT 'em_andamento';

ALTER TABLE inventario_contagem
    ADD CONSTRAINT inventario_contagem_status_check
    CHECK (status IN ('em_andamento', 'finalizado', 'cancelado'));

ALTER TABLE inventario_item
    ADD COLUMN IF NOT EXISTS diferenca NUMERIC(12, 3);

ALTER TABLE inventario_item
    ADD COLUMN IF NOT EXISTS ajuste_aplicado BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON TABLE inventario_contagem IS
    'Sessão de inventário físico (contagem comparada ao estoque do sistema).';
COMMENT ON COLUMN inventario_contagem.status IS
    'em_andamento, finalizado ou cancelado.';
COMMENT ON COLUMN inventario_item.diferenca IS
    'quantidade_contada - estoque_sistema. NULL enquanto o item não foi contado.';
COMMENT ON COLUMN inventario_item.ajuste_aplicado IS
    'true depois que a diferença gerou movimentacao_estoque e atualizou estoque_atual.';
