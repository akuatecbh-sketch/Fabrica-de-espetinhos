-- =====================================================================
-- MIGRATION 028 — PRODUÇÃO (FICHA TÉCNICA → ESTOQUE)
-- =====================================================================
-- Registra produção de produto final, baixa insumos da ficha e dá
-- entrada no acabado. Cancelamento nunca apaga: só marca cancelada
-- e estorna o estoque.
--
-- Views (vw_fechamento_caixa_formas, vw_fechamento_caixa_total,
-- vw_faturamento_diario, vw_export_contabilidade_mensal): nenhuma
-- referencia movimentacao_estoque nem a coluna tipo. Índices da
-- tabela são (id) e (produto_id, criado_em). ALTER COLUMN tipo
-- VARCHAR(20)→VARCHAR(30) não exige DROP VIEW.
--
-- Tipos novos (VARCHAR precisa de 30: producao_saida_insumo tem 21):
--   producao_saida_insumo — baixa de insumo (e retirada do acabado
--                           no cancelamento)
--   producao_entrada      — entrada do acabado (e devolução do
--                           insumo no cancelamento)
-- Tipos antigos producao_consumo / producao_geracao permanecem no
-- CHECK, sem uso pela aplicação.
-- db push não replica CHECK nem índice.
-- =====================================================================

BEGIN;

ALTER TABLE movimentacao_estoque
    DROP CONSTRAINT IF EXISTS movimentacao_estoque_tipo_check;

ALTER TABLE movimentacao_estoque
    ALTER COLUMN tipo TYPE VARCHAR(30);

ALTER TABLE movimentacao_estoque
    ADD CONSTRAINT movimentacao_estoque_tipo_check
    CHECK (tipo IN (
        'entrada_compra',
        'saida_venda',
        'ajuste_positivo',
        'ajuste_negativo',
        'producao_consumo',
        'producao_geracao',
        'perda',
        'devolucao_venda',
        'producao_saida_insumo',
        'producao_entrada'
    ));

CREATE TABLE producao (
    id                  SERIAL PRIMARY KEY,
    produto_final_id    INTEGER NOT NULL REFERENCES produto(id),
    quantidade          NUMERIC(12,3) NOT NULL,
    data                DATE NOT NULL,
    observacao          TEXT,
    usuario_id          INTEGER NOT NULL REFERENCES usuario(id),
    status              VARCHAR(20) NOT NULL DEFAULT 'confirmada',
    custo_total         NUMERIC(12,4) NOT NULL DEFAULT 0,
    token_idempotencia  VARCHAR(64) NOT NULL,
    cancelada_em        TIMESTAMP,
    cancelada_por_id    INTEGER REFERENCES usuario(id),
    motivo_cancelamento TEXT,
    criado_em           TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT producao_quantidade_check CHECK (quantidade > 0),
    CONSTRAINT producao_custo_total_check CHECK (custo_total >= 0),
    CONSTRAINT producao_status_check CHECK (status IN ('confirmada', 'cancelada')),
    CONSTRAINT producao_token_idempotencia_key UNIQUE (token_idempotencia)
);

CREATE INDEX idx_producao_data ON producao (data);

COMMENT ON TABLE producao IS
    'Registro de produção: baixa insumos da ficha e entra o produto final.';
COMMENT ON COLUMN producao.quantidade IS
    'Quantidade produzida do produto final (sempre > 0).';
COMMENT ON COLUMN producao.custo_total IS
    'Soma do snapshot de custo dos insumos no momento da produção.';
COMMENT ON COLUMN producao.token_idempotencia IS
    'Token único do formulário para impedir produção duplicada no duplo clique.';
COMMENT ON COLUMN producao.status IS
    'confirmada ou cancelada. Cancelamento nunca apaga o registro.';

CREATE TABLE producao_item (
    id               SERIAL PRIMARY KEY,
    producao_id      INTEGER NOT NULL REFERENCES producao(id),
    insumo_id        INTEGER NOT NULL REFERENCES produto(id),
    quantidade       NUMERIC(12,4) NOT NULL,
    custo_unitario   NUMERIC(12,4) NOT NULL,
    custo_total      NUMERIC(12,4) NOT NULL,
    controla_estoque BOOLEAN NOT NULL,
    CONSTRAINT producao_item_quantidade_check CHECK (quantidade > 0),
    CONSTRAINT producao_item_custo_unitario_check CHECK (custo_unitario >= 0),
    CONSTRAINT producao_item_custo_total_check CHECK (custo_total >= 0),
    CONSTRAINT producao_item_producao_insumo_key UNIQUE (producao_id, insumo_id)
);

CREATE INDEX idx_producao_item_producao_id ON producao_item (producao_id);

COMMENT ON TABLE producao_item IS
    'Insumos consumidos em uma produção, com foto do custo unitário.';
COMMENT ON COLUMN producao_item.quantidade IS
    'quantidade_ficha × quantidade_produzida no momento da produção.';
COMMENT ON COLUMN producao_item.controla_estoque IS
    'Foto de produto.controla_estoque. false = listado, sem movimentação.';

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('producao', 'Produção', FALSE, 72),
    ('cancelar_producao', 'Cancelar produção', FALSE, 73)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('gerente',      TRUE),
    ('financeiro',   FALSE),
    ('estoquista',   TRUE),
    ('operador_pdv', FALSE)
) AS p(perfil, pode)
WHERE m.chave = 'producao'
ON CONFLICT (perfil, modulo_id) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('gerente',      TRUE),
    ('financeiro',   FALSE),
    ('estoquista',   FALSE),
    ('operador_pdv', FALSE)
) AS p(perfil, pode)
WHERE m.chave = 'cancelar_producao'
ON CONFLICT (perfil, modulo_id) DO NOTHING;

COMMIT;
