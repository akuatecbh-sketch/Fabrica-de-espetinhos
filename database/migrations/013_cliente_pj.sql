-- =====================================================================
-- MIGRATION 013 — CLIENTE PESSOA JURÍDICA
-- =====================================================================
-- Estende o cadastro de cliente com tipo PF/PJ, dados da empresa e
-- contato responsável pela compra. Clientes existentes ficam como
-- pessoa física.
-- =====================================================================

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS tipo_pessoa VARCHAR(10) NOT NULL DEFAULT 'fisica';

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS razao_social VARCHAR(150);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS nome_fantasia VARCHAR(150);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS cnpj CHAR(14);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS inscricao_estadual VARCHAR(20);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS inscricao_municipal VARCHAR(20);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS contato_nome VARCHAR(100);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS contato_cargo VARCHAR(80);

ALTER TABLE cliente
    ADD COLUMN IF NOT EXISTS contato_telefone VARCHAR(20);

ALTER TABLE cliente
    DROP CONSTRAINT IF EXISTS cliente_tipo_pessoa_check;

ALTER TABLE cliente
    ADD CONSTRAINT cliente_tipo_pessoa_check
    CHECK (tipo_pessoa IN ('fisica', 'juridica'));

ALTER TABLE cliente
    DROP CONSTRAINT IF EXISTS cliente_pj_dados_check;

ALTER TABLE cliente
    ADD CONSTRAINT cliente_pj_dados_check
    CHECK (
        (
            tipo_pessoa = 'fisica'
            AND cnpj IS NULL
            AND razao_social IS NULL
        )
        OR (
            tipo_pessoa = 'juridica'
            AND razao_social IS NOT NULL
            AND cnpj IS NOT NULL
            AND cpf IS NULL
            AND data_nascimento IS NULL
        )
    );

ALTER TABLE cliente
    DROP CONSTRAINT IF EXISTS cliente_cnpj_key;

ALTER TABLE cliente
    ADD CONSTRAINT cliente_cnpj_key UNIQUE (cnpj);

CREATE INDEX IF NOT EXISTS idx_cliente_tipo_pessoa ON cliente (tipo_pessoa);

COMMENT ON COLUMN cliente.tipo_pessoa IS
    'fisica (CPF) ou juridica (CNPJ).';
COMMENT ON COLUMN cliente.razao_social IS
    'Razão social do cliente PJ. Nulo para pessoa física.';
COMMENT ON COLUMN cliente.nome_fantasia IS
    'Nome fantasia do cliente PJ, se houver.';
COMMENT ON COLUMN cliente.cnpj IS
    'CNPJ com 14 dígitos. Nulo para pessoa física.';
COMMENT ON COLUMN cliente.contato_nome IS
    'Pessoa física responsável pela compra em nome da empresa.';
COMMENT ON COLUMN cliente.contato_cargo IS
    'Cargo do contato responsável pela compra.';
COMMENT ON COLUMN cliente.contato_telefone IS
    'Telefone do contato responsável pela compra.';
