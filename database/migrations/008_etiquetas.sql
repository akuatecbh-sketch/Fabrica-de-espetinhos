-- =====================================================================
-- MIGRATION 008 — ETIQUETAS DE PRODUTO
-- =====================================================================
-- Arquivo pedido em /database/migrations/008_etiquetas.sql.
-- (008_saude_sistema.sql já existia; este arquivo adiciona validade
-- em produto, o módulo etiquetas e o histórico de impressão.)
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS dias_validade INTEGER;

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_dias_validade_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_dias_validade_check
    CHECK (dias_validade IS NULL OR dias_validade >= 0);

COMMENT ON COLUMN produto.dias_validade IS
    'Dias de validade após a data de fabricação. NULL = sem sugestão automática.';

CREATE TABLE IF NOT EXISTS etiqueta_impressao (
    id                     SERIAL PRIMARY KEY,
    produto_id             INTEGER NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
    lote                   VARCHAR(80) NOT NULL,
    quantidade_etiquetas   INTEGER NOT NULL,
    data_fabricacao        DATE NOT NULL,
    data_validade          DATE,
    usuario_id             INTEGER NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    criado_em              TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT etiqueta_impressao_quantidade_check
        CHECK (quantidade_etiquetas > 0)
);

COMMENT ON TABLE etiqueta_impressao IS
    'Histórico de impressão de etiquetas (lote, quantidade e datas).';

CREATE INDEX IF NOT EXISTS idx_etiqueta_impressao_produto
    ON etiqueta_impressao (produto_id);

CREATE INDEX IF NOT EXISTS idx_etiqueta_impressao_lote
    ON etiqueta_impressao (lote);

CREATE INDEX IF NOT EXISTS idx_etiqueta_impressao_criado
    ON etiqueta_impressao (criado_em DESC);

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('etiquetas', 'Etiquetas', FALSE, 75)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('admin',        TRUE),
    ('gerente',      TRUE),
    ('financeiro',   FALSE),
    ('estoquista',   TRUE),
    ('operador_pdv', FALSE)
) AS p(perfil, pode)
WHERE m.chave = 'etiquetas'
ON CONFLICT (perfil, modulo_id) DO NOTHING;
