-- =====================================================================
-- MIGRATION 019 — CATEGORIA DE PREÇO NA VENDA E NO PEDIDO
-- =====================================================================
-- tipo_preco no cabeçalho (editável pelo operador).
-- tipo_preco_aplicado no item: snapshot no momento da inclusão.
-- =====================================================================

ALTER TABLE venda
    ADD COLUMN IF NOT EXISTS tipo_preco VARCHAR(20) NOT NULL DEFAULT 'varejo';

ALTER TABLE pedido
    ADD COLUMN IF NOT EXISTS tipo_preco VARCHAR(20) NOT NULL DEFAULT 'varejo';

ALTER TABLE venda_item
    ADD COLUMN IF NOT EXISTS tipo_preco_aplicado VARCHAR(20) NOT NULL DEFAULT 'varejo';

ALTER TABLE pedido_item
    ADD COLUMN IF NOT EXISTS tipo_preco_aplicado VARCHAR(20) NOT NULL DEFAULT 'varejo';

ALTER TABLE venda
    DROP CONSTRAINT IF EXISTS venda_tipo_preco_check;
ALTER TABLE venda
    ADD CONSTRAINT venda_tipo_preco_check
    CHECK (tipo_preco IN ('varejo', 'atacado', 'repasse'));

ALTER TABLE pedido
    DROP CONSTRAINT IF EXISTS pedido_tipo_preco_check;
ALTER TABLE pedido
    ADD CONSTRAINT pedido_tipo_preco_check
    CHECK (tipo_preco IN ('varejo', 'atacado', 'repasse'));

ALTER TABLE venda_item
    DROP CONSTRAINT IF EXISTS venda_item_tipo_preco_aplicado_check;
ALTER TABLE venda_item
    ADD CONSTRAINT venda_item_tipo_preco_aplicado_check
    CHECK (tipo_preco_aplicado IN ('varejo', 'atacado', 'repasse'));

ALTER TABLE pedido_item
    DROP CONSTRAINT IF EXISTS pedido_item_tipo_preco_aplicado_check;
ALTER TABLE pedido_item
    ADD CONSTRAINT pedido_item_tipo_preco_aplicado_check
    CHECK (tipo_preco_aplicado IN ('varejo', 'atacado', 'repasse'));

COMMENT ON COLUMN venda.tipo_preco IS
    'Categoria de preço da venda (varejo, atacado ou repasse). Não recalcula itens já adicionados.';
COMMENT ON COLUMN pedido.tipo_preco IS
    'Categoria de preço do pedido (varejo, atacado ou repasse). Não recalcula itens já adicionados.';
COMMENT ON COLUMN venda_item.tipo_preco_aplicado IS
    'Categoria vigente no momento em que o item foi adicionado.';
COMMENT ON COLUMN pedido_item.tipo_preco_aplicado IS
    'Categoria vigente no momento em que o item foi adicionado.';
