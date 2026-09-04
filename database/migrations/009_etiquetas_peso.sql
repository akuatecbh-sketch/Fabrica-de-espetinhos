-- =====================================================================
-- MIGRATION 009 — ETIQUETAS: PESO, ACONDICIONAMENTO E MODELOS
-- =====================================================================
-- Arquivo pedido em /database/migrations/009_etiquetas_peso.sql.
-- (009_permissoes.sql já existia; este arquivo adiciona venda por peso,
-- data de acondicionamento e modelos de etiqueta térmico/Pimaco.)
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS vendido_por_peso BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN produto.vendido_por_peso IS
    'TRUE = preco_venda é R$/kg; a etiqueta calcula o preço pelo peso do pacote.';

CREATE TABLE IF NOT EXISTS modelo_etiqueta (
    id                      SERIAL PRIMARY KEY,
    nome                    VARCHAR(120) NOT NULL,
    tipo                    VARCHAR(20) NOT NULL,
    largura_mm              NUMERIC(8, 2) NOT NULL,
    altura_mm               NUMERIC(8, 2) NOT NULL,
    colunas_por_folha       INTEGER NOT NULL DEFAULT 1,
    linhas_por_folha        INTEGER NOT NULL DEFAULT 1,
    margem_superior_mm      NUMERIC(8, 2) NOT NULL DEFAULT 0,
    margem_esquerda_mm      NUMERIC(8, 2) NOT NULL DEFAULT 0,
    espaco_horizontal_mm    NUMERIC(8, 2) NOT NULL DEFAULT 0,
    espaco_vertical_mm      NUMERIC(8, 2) NOT NULL DEFAULT 0,
    ativo                   BOOLEAN NOT NULL DEFAULT TRUE,
    ordem                   INTEGER NOT NULL DEFAULT 0,
    criado_em               TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT modelo_etiqueta_tipo_check
        CHECK (tipo IN ('termica_rolo', 'folha_a4')),
    CONSTRAINT modelo_etiqueta_dimensoes_check
        CHECK (largura_mm > 0 AND altura_mm > 0),
    CONSTRAINT modelo_etiqueta_grade_check
        CHECK (colunas_por_folha > 0 AND linhas_por_folha > 0)
);

COMMENT ON TABLE modelo_etiqueta IS
    'Formatos de impressão: rolo térmico (uma coluna) ou folha A4 (grade Pimaco).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_modelo_etiqueta_nome
    ON modelo_etiqueta (nome);

INSERT INTO modelo_etiqueta (
    nome, tipo, largura_mm, altura_mm,
    colunas_por_folha, linhas_por_folha,
    margem_superior_mm, margem_esquerda_mm,
    espaco_horizontal_mm, espaco_vertical_mm,
    ativo, ordem
) VALUES
    (
        'Térmica 50 × 30 mm (rolo)',
        'termica_rolo',
        50, 30,
        1, 1,
        0, 0, 0, 0,
        TRUE, 10
    ),
    (
        'Pimaco 6180 (25,4 x 66,7mm, 30/folha A4)',
        'folha_a4',
        66.7, 25.4,
        3, 10,
        13.5, 2.5,
        2.5, 0,
        TRUE, 20
    )
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE etiqueta_impressao
    ADD COLUMN IF NOT EXISTS modelo_etiqueta_id INTEGER
        REFERENCES modelo_etiqueta(id) ON DELETE RESTRICT;

ALTER TABLE etiqueta_impressao
    ADD COLUMN IF NOT EXISTS data_acondicionamento DATE;

ALTER TABLE etiqueta_impressao
    ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(12, 3);

ALTER TABLE etiqueta_impressao
    ADD COLUMN IF NOT EXISTS preco_calculado NUMERIC(12, 2);

UPDATE etiqueta_impressao ei
SET modelo_etiqueta_id = (
    SELECT m.id FROM modelo_etiqueta m
    WHERE m.tipo = 'termica_rolo'
    ORDER BY m.ordem, m.id
    LIMIT 1
)
WHERE ei.modelo_etiqueta_id IS NULL;

UPDATE etiqueta_impressao
SET data_acondicionamento = data_fabricacao
WHERE data_acondicionamento IS NULL;

UPDATE etiqueta_impressao ei
SET preco_calculado = p.preco_venda
FROM produto p
WHERE ei.produto_id = p.id
  AND ei.preco_calculado IS NULL;

ALTER TABLE etiqueta_impressao
    ALTER COLUMN modelo_etiqueta_id SET NOT NULL;

ALTER TABLE etiqueta_impressao
    ALTER COLUMN data_acondicionamento SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_etiqueta_impressao_modelo
    ON etiqueta_impressao (modelo_etiqueta_id);

COMMENT ON COLUMN etiqueta_impressao.peso_kg IS
    'Peso do pacote em kg quando o produto é vendido por peso. NULL = venda por unidade.';

COMMENT ON COLUMN etiqueta_impressao.preco_calculado IS
    'Preço impresso na etiqueta: peso × R$/kg, ou preco_venda se for por unidade.';
