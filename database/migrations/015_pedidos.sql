-- =====================================================================
-- MIGRATION 015 — PEDIDOS (PRÉ-VENDA)
-- =====================================================================
-- Arquivo pedido em /database/migrations/015_pedidos.sql.
-- (015_nfe_emissao.sql já existia; este arquivo cria o módulo de
-- pedidos editáveis até conversão em venda.)
-- =====================================================================

CREATE SEQUENCE IF NOT EXISTS pedido_numero_seq;

CREATE TABLE IF NOT EXISTS pedido (
    id              SERIAL PRIMARY KEY,
    numero          INTEGER NOT NULL DEFAULT nextval('pedido_numero_seq'),
    cliente_id      INTEGER REFERENCES cliente(id),
    usuario_id      INTEGER NOT NULL REFERENCES usuario(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'aberto'
                    CHECK (status IN (
                        'aberto',
                        'enviado',
                        'convertido',
                        'cancelado'
                    )),
    observacao      TEXT,
    subtotal        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    desconto        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    token_publico   VARCHAR(36) UNIQUE,
    criado_em       TIMESTAMP NOT NULL DEFAULT now(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT now(),
    enviado_em      TIMESTAMP,
    cancelado_em    TIMESTAMP,
    UNIQUE (numero)
);

COMMENT ON TABLE pedido IS
    'Pedido de cliente (pré-venda). Editável em aberto e enviado; somente leitura após convertido ou cancelado.';
COMMENT ON COLUMN pedido.status IS
    'aberto, enviado, convertido ou cancelado.';
COMMENT ON COLUMN pedido.token_publico IS
    'UUID gerado ao marcar como enviado, para acesso público futuro.';

CREATE TABLE IF NOT EXISTS pedido_item (
    id                      SERIAL PRIMARY KEY,
    pedido_id               INTEGER NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    produto_id              INTEGER NOT NULL REFERENCES produto(id),
    quantidade              NUMERIC(12, 3) NOT NULL,
    preco_unitario          NUMERIC(12, 2) NOT NULL,
    desconto                NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal                NUMERIC(12, 2) NOT NULL,
    observacao              VARCHAR(200),
    vendido_em_pacote       BOOLEAN NOT NULL DEFAULT FALSE,
    quantidade_pacotes      INTEGER,
    preco_pacote_aplicado   NUMERIC(12, 2)
);

COMMENT ON TABLE pedido_item IS
    'Itens do pedido, com snapshot de preço e suporte a venda em pacote.';

ALTER TABLE pedido_item DROP CONSTRAINT IF EXISTS pedido_item_pacote_check;
ALTER TABLE pedido_item
    ADD CONSTRAINT pedido_item_pacote_check CHECK (
        (
            vendido_em_pacote = FALSE
            AND quantidade_pacotes IS NULL
            AND preco_pacote_aplicado IS NULL
        )
        OR (
            vendido_em_pacote = TRUE
            AND quantidade_pacotes >= 1
            AND preco_pacote_aplicado IS NOT NULL
        )
    );

CREATE INDEX IF NOT EXISTS idx_pedido_status
    ON pedido (status);

CREATE INDEX IF NOT EXISTS idx_pedido_cliente
    ON pedido (cliente_id);

CREATE INDEX IF NOT EXISTS idx_pedido_criado_em
    ON pedido (criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_pedido_item_pedido
    ON pedido_item (pedido_id);

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('pedidos', 'Pedidos', FALSE, 105)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('gerente',      TRUE),
    ('financeiro',   TRUE),
    ('estoquista',   FALSE),
    ('operador_pdv', TRUE)
) AS p(perfil, pode)
WHERE m.chave = 'pedidos'
ON CONFLICT (perfil, modulo_id) DO NOTHING;
