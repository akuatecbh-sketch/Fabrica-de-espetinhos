-- =====================================================================
-- MIGRATION 029 — PIX DA EMPRESA E OBSERVAÇÃO NO CUPOM
-- =====================================================================
-- empresa: chave PIX cadastrada em Dados da Empresa.
-- venda: observação do cupom (até 200) e snapshot do PIX no momento
-- da finalização (reimpressão igual ao original).
-- Só ADD COLUMN + CHECK. Views não leem essas colunas.
-- db push não replica CHECK.
-- =====================================================================

BEGIN;

ALTER TABLE empresa
    ADD COLUMN IF NOT EXISTS pix_tipo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pix_chave VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pix_beneficiario VARCHAR(150);

ALTER TABLE empresa DROP CONSTRAINT IF EXISTS empresa_pix_tipo_check;
ALTER TABLE empresa ADD CONSTRAINT empresa_pix_tipo_check
    CHECK (pix_tipo IS NULL OR pix_tipo IN (
        'cpf_cnpj',
        'telefone',
        'email',
        'aleatoria'
    ));

COMMENT ON COLUMN empresa.pix_tipo IS
    'Tipo da chave PIX: cpf_cnpj, telefone, email ou aleatoria. NULL = sem PIX.';
COMMENT ON COLUMN empresa.pix_chave IS
    'Chave PIX vigente. Vazia/NULL = não imprime PIX no cupom.';
COMMENT ON COLUMN empresa.pix_beneficiario IS
    'Nome do beneficiário impresso no cupom, se preenchido.';

ALTER TABLE venda
    ADD COLUMN IF NOT EXISTS observacao_cupom TEXT,
    ADD COLUMN IF NOT EXISTS pix_tipo VARCHAR(20),
    ADD COLUMN IF NOT EXISTS pix_chave VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pix_beneficiario VARCHAR(150);

ALTER TABLE venda DROP CONSTRAINT IF EXISTS venda_observacao_cupom_check;
ALTER TABLE venda ADD CONSTRAINT venda_observacao_cupom_check
    CHECK (observacao_cupom IS NULL OR char_length(observacao_cupom) <= 200);

ALTER TABLE venda DROP CONSTRAINT IF EXISTS venda_pix_tipo_check;
ALTER TABLE venda ADD CONSTRAINT venda_pix_tipo_check
    CHECK (pix_tipo IS NULL OR pix_tipo IN (
        'cpf_cnpj',
        'telefone',
        'email',
        'aleatoria'
    ));

COMMENT ON COLUMN venda.observacao_cupom IS
    'Observação impressa no cupom desta venda. NULL = sem obs. Máximo 200.';
COMMENT ON COLUMN venda.pix_tipo IS
    'Snapshot do tipo da chave PIX no momento da finalização.';
COMMENT ON COLUMN venda.pix_chave IS
    'Snapshot da chave PIX no momento da finalização.';
COMMENT ON COLUMN venda.pix_beneficiario IS
    'Snapshot do beneficiário PIX no momento da finalização.';

COMMIT;
