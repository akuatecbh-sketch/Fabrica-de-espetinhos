-- =====================================================================
-- MIGRATION 014 — CLASSIFICAÇÃO FISCAL DO PRODUTO (NF-e MODELO 55)
-- =====================================================================
-- Campos opcionais no cadastro geral. Devem ser preenchidos com
-- orientação do contador antes de emitir NF-e.
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS ncm CHAR(8);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS cfop_padrao CHAR(4);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS origem_mercadoria CHAR(1);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS cst_csosn VARCHAR(4);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS aliquota_icms NUMERIC(5, 2);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS aliquota_ipi NUMERIC(5, 2);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS aliquota_pis NUMERIC(5, 2);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS aliquota_cofins NUMERIC(5, 2);

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_origem_mercadoria_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_origem_mercadoria_check
    CHECK (origem_mercadoria IS NULL OR origem_mercadoria IN (
        '0', '1', '2', '3', '4', '5', '6', '7', '8'
    ));

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_ncm_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_ncm_check
    CHECK (ncm IS NULL OR ncm ~ '^[0-9]{8}$');

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_cfop_padrao_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_cfop_padrao_check
    CHECK (cfop_padrao IS NULL OR cfop_padrao ~ '^[0-9]{4}$');

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_aliquotas_fiscais_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_aliquotas_fiscais_check
    CHECK (
        (aliquota_icms IS NULL OR (aliquota_icms >= 0 AND aliquota_icms <= 100))
        AND (aliquota_ipi IS NULL OR (aliquota_ipi >= 0 AND aliquota_ipi <= 100))
        AND (aliquota_pis IS NULL OR (aliquota_pis >= 0 AND aliquota_pis <= 100))
        AND (aliquota_cofins IS NULL OR (aliquota_cofins >= 0 AND aliquota_cofins <= 100))
    );

COMMENT ON COLUMN produto.ncm IS
    'Nomenclatura Comum do Mercosul, 8 dígitos. Opcional até a emissão de NF-e.';
COMMENT ON COLUMN produto.cfop_padrao IS
    'CFOP padrão de 4 dígitos para venda deste produto.';
COMMENT ON COLUMN produto.origem_mercadoria IS
    'Origem ICMS (0 a 8) conforme tabela do SEFAZ.';
COMMENT ON COLUMN produto.cst_csosn IS
    'CST (regime normal) ou CSOSN (Simples Nacional).';
COMMENT ON COLUMN produto.aliquota_icms IS
    'Alíquota de ICMS em percentual (0 a 100).';
COMMENT ON COLUMN produto.aliquota_ipi IS
    'Alíquota de IPI em percentual (0 a 100).';
COMMENT ON COLUMN produto.aliquota_pis IS
    'Alíquota de PIS em percentual (0 a 100).';
COMMENT ON COLUMN produto.aliquota_cofins IS
    'Alíquota de COFINS em percentual (0 a 100).';
