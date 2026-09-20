-- =====================================================================
-- MIGRATION 022 — RELATÓRIOS + INVENTÁRIO FÍSICO
-- =====================================================================
-- Módulo "relatorios" (hub /relatorios) e tabelas de inventário físico
-- para a tela /relatorios/inventario.
-- =====================================================================

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('relatorios', 'Relatórios', FALSE, 125)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('gerente',      TRUE),
    ('financeiro',   TRUE),
    ('estoquista',   TRUE),
    ('operador_pdv', FALSE)
) AS p(perfil, pode)
WHERE m.chave = 'relatorios'
ON CONFLICT (perfil, modulo_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS inventario (
    id              SERIAL PRIMARY KEY,
    status          VARCHAR(20) NOT NULL DEFAULT 'aberto'
                    CHECK (status IN ('aberto', 'em_contagem', 'finalizado', 'cancelado')),
    observacao      VARCHAR(500),
    usuario_id      INTEGER NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    finalizado_em   TIMESTAMP
);

COMMENT ON TABLE inventario IS
    'Contagem física de estoque (inventário).';
COMMENT ON COLUMN inventario.status IS
    'aberto, em_contagem, finalizado ou cancelado.';

CREATE INDEX IF NOT EXISTS idx_inventario_status
    ON inventario (status);

CREATE INDEX IF NOT EXISTS idx_inventario_criado_em
    ON inventario (criado_em DESC);

CREATE TABLE IF NOT EXISTS inventario_item (
    id                   SERIAL PRIMARY KEY,
    inventario_id        INTEGER NOT NULL REFERENCES inventario(id) ON DELETE CASCADE,
    produto_id           INTEGER NOT NULL REFERENCES produto(id) ON DELETE RESTRICT,
    estoque_sistema      NUMERIC(12, 3) NOT NULL,
    quantidade_contada   NUMERIC(12, 3),
    UNIQUE (inventario_id, produto_id)
);

COMMENT ON TABLE inventario_item IS
    'Item da contagem física: saldo do sistema no momento da inclusão e quantidade conferida.';

CREATE INDEX IF NOT EXISTS idx_inventario_item_inventario
    ON inventario_item (inventario_id);

CREATE INDEX IF NOT EXISTS idx_inventario_item_produto
    ON inventario_item (produto_id);
