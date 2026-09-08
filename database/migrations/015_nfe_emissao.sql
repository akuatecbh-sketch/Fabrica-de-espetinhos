-- =====================================================================
-- MIGRATION 015 — EMISSÃO DE NF-e MODELO 55
-- =====================================================================
-- Venda pode escolher tipo_cupom = 'nfe' (exclusivo de cliente PJ).
-- Tabelas nfe / nfe_item registram a nota e o imposto por item,
-- inclusive em modo simulado (sem FOCUS_NFE_TOKEN).
-- =====================================================================

ALTER TABLE venda DROP CONSTRAINT IF EXISTS venda_tipo_cupom_check;

ALTER TABLE venda ADD CONSTRAINT venda_tipo_cupom_check
    CHECK (tipo_cupom IN ('fiscal', 'nao_fiscal', 'nenhum', 'nfe'));

COMMENT ON COLUMN venda.tipo_cupom IS
    'fiscal = NFC-e; nfe = NF-e modelo 55 (PJ); nao_fiscal = recibo sem valor fiscal; nenhum = sem impressão.';

CREATE TABLE IF NOT EXISTS nfe (
    id                      SERIAL PRIMARY KEY,
    venda_id                INTEGER UNIQUE NOT NULL REFERENCES venda(id),
    cliente_id              INTEGER REFERENCES cliente(id),
    chave_acesso            CHAR(44) UNIQUE,
    numero                  INTEGER,
    serie                   INTEGER,
    protocolo_autorizacao   VARCHAR(50),
    status                  VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN (
            'pendente',
            'autorizada',
            'rejeitada',
            'cancelada',
            'contingencia',
            'simulado'
        )),
    xml_url                 VARCHAR(255),
    danfe_url               VARCHAR(255),
    data_emissao            TIMESTAMP,
    mensagem_sefaz          TEXT,
    valor_total             NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_icms              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_ipi               NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_pis               NUMERIC(12, 2) NOT NULL DEFAULT 0,
    valor_cofins            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    criado_em               TIMESTAMP NOT NULL DEFAULT now()
);

COMMENT ON TABLE nfe IS
    'NF-e modelo 55 emitida (ou simulada) a partir de uma venda para cliente PJ.';
COMMENT ON COLUMN nfe.status IS
    'pendente, autorizada, rejeitada, cancelada, contingencia ou simulado (sem token de gateway).';

CREATE TABLE IF NOT EXISTS nfe_item (
    id                  SERIAL PRIMARY KEY,
    nfe_id              INTEGER NOT NULL REFERENCES nfe(id) ON DELETE CASCADE,
    produto_id          INTEGER NOT NULL REFERENCES produto(id),
    descricao           VARCHAR(120) NOT NULL,
    quantidade          NUMERIC(12, 3) NOT NULL,
    valor_unitario      NUMERIC(12, 2) NOT NULL,
    valor_total         NUMERIC(12, 2) NOT NULL,
    ncm                 CHAR(8) NOT NULL,
    cfop                CHAR(4) NOT NULL,
    origem_mercadoria   CHAR(1),
    cst_csosn           VARCHAR(4) NOT NULL,
    aliquota_icms       NUMERIC(5, 2) NOT NULL DEFAULT 0,
    valor_icms          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    aliquota_ipi        NUMERIC(5, 2) NOT NULL DEFAULT 0,
    valor_ipi           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    aliquota_pis        NUMERIC(5, 2) NOT NULL DEFAULT 0,
    valor_pis           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    aliquota_cofins     NUMERIC(5, 2) NOT NULL DEFAULT 0,
    valor_cofins        NUMERIC(12, 2) NOT NULL DEFAULT 0
);

COMMENT ON TABLE nfe_item IS
    'Itens da NF-e com classificação fiscal e imposto discriminado para conferência.';

CREATE INDEX IF NOT EXISTS idx_nfe_data_emissao
    ON nfe (data_emissao DESC NULLS LAST, id DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_item_nfe
    ON nfe_item (nfe_id);

CREATE INDEX IF NOT EXISTS idx_nfe_cliente
    ON nfe (cliente_id);
