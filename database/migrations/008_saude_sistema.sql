-- =====================================================================
-- MIGRATION 008 — SAÚDE DO SISTEMA
-- =====================================================================
-- (No plano original: 005_saude_sistema; 005 já era venda_pacote.)
-- Registro das execuções diárias do script scripts/verificacao-saude.ts
-- =====================================================================

CREATE TABLE IF NOT EXISTS verificacao_saude_execucao (
    id                   SERIAL PRIMARY KEY,
    iniciado_em          TIMESTAMP NOT NULL DEFAULT now(),
    finalizado_em        TIMESTAMP,
    total_verificacoes   INTEGER NOT NULL DEFAULT 0,
    total_ok             INTEGER NOT NULL DEFAULT 0,
    total_avisos         INTEGER NOT NULL DEFAULT 0,
    total_erros          INTEGER NOT NULL DEFAULT 0,
    correcoes_aplicadas  INTEGER NOT NULL DEFAULT 0,
    status_geral         VARCHAR(20) NOT NULL DEFAULT 'ok'
                         CHECK (status_geral IN ('ok', 'atencao', 'erro'))
);

COMMENT ON TABLE verificacao_saude_execucao IS
    'Uma linha por execução do script de verificação de saúde.';

CREATE TABLE IF NOT EXISTS verificacao_saude_item (
    id                  SERIAL PRIMARY KEY,
    execucao_id         INTEGER NOT NULL REFERENCES verificacao_saude_execucao(id) ON DELETE CASCADE,
    codigo              VARCHAR(80) NOT NULL,
    titulo              VARCHAR(150) NOT NULL,
    categoria           VARCHAR(40) NOT NULL
                        CHECK (categoria IN ('integridade', 'fluxo_sintetico')),
    resultado           VARCHAR(20) NOT NULL
                        CHECK (resultado IN ('ok', 'aviso', 'erro')),
    mensagem            TEXT NOT NULL,
    correcao_aplicada   BOOLEAN NOT NULL DEFAULT FALSE,
    detalhes            JSONB,
    criado_em           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verificacao_saude_item_execucao
    ON verificacao_saude_item (execucao_id);

COMMENT ON TABLE verificacao_saude_item IS
    'Resultado de cada verificação dentro de uma execução.';
COMMENT ON COLUMN verificacao_saude_item.correcao_aplicada IS
    'True quando o script corrigiu automaticamente com base em fonte de verdade.';
