-- =====================================================================
-- MIGRATION 020 — FRETE COMO ITEM DE SERVIÇO
-- =====================================================================
-- Inclui o tipo 'servico' em categoria/produto e cadastra o produto
-- "Frete" (sem controle de estoque). nfe_item passa a aceitar NCM/CFOP/
-- CST nulos para itens de serviço.
-- =====================================================================

ALTER TABLE categoria_produto
    DROP CONSTRAINT IF EXISTS categoria_produto_tipo_check;

ALTER TABLE categoria_produto
    ADD CONSTRAINT categoria_produto_tipo_check
    CHECK (tipo IN ('insumo', 'produto_final', 'embalagem', 'revenda', 'servico'));

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_tipo_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_tipo_check
    CHECK (tipo IN ('insumo', 'produto_final', 'embalagem', 'revenda', 'servico'));

COMMENT ON COLUMN produto.tipo IS
    'insumo, produto_final, embalagem, revenda ou servico (ex.: Frete).';

ALTER TABLE nfe_item
    ALTER COLUMN ncm DROP NOT NULL;

ALTER TABLE nfe_item
    ALTER COLUMN cfop DROP NOT NULL;

ALTER TABLE nfe_item
    ALTER COLUMN cst_csosn DROP NOT NULL;

COMMENT ON COLUMN nfe_item.ncm IS
    'NCM do item. Nulo em itens de serviço (tipo servico).';
COMMENT ON COLUMN nfe_item.cfop IS
    'CFOP do item. Nulo em itens de serviço (tipo servico).';
COMMENT ON COLUMN nfe_item.cst_csosn IS
    'CST/CSOSN do item. Nulo em itens de serviço (tipo servico).';

INSERT INTO unidade_medida (sigla, descricao)
SELECT 'un', 'Unidade'
WHERE NOT EXISTS (
    SELECT 1 FROM unidade_medida WHERE lower(sigla) IN ('un', 'und', 'unid')
);

INSERT INTO categoria_produto (nome, tipo)
SELECT 'Serviços', 'servico'
WHERE NOT EXISTS (
    SELECT 1 FROM categoria_produto WHERE tipo = 'servico'
);

UPDATE produto
SET
    tipo = 'servico',
    controla_estoque = FALSE,
    ativo = TRUE
WHERE nome = 'Frete';

INSERT INTO produto (
    codigo,
    nome,
    categoria_id,
    tipo,
    unidade_medida_id,
    controla_estoque,
    estoque_minimo,
    estoque_atual,
    preco_custo_medio,
    preco_venda,
    ativo,
    permite_venda_pacote,
    quantidade_por_pacote
)
SELECT
    'FRETE',
    'Frete',
    (
        SELECT id
        FROM categoria_produto
        WHERE tipo = 'servico'
        ORDER BY id
        LIMIT 1
    ),
    'servico',
    (
        SELECT id
        FROM unidade_medida
        WHERE lower(sigla) IN ('un', 'und', 'unid')
        ORDER BY id
        LIMIT 1
    ),
    FALSE,
    0,
    0,
    0,
    NULL,
    TRUE,
    FALSE,
    1
WHERE NOT EXISTS (
    SELECT 1 FROM produto WHERE nome = 'Frete'
);
