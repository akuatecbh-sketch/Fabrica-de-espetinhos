-- =====================================================================
-- MIGRATION 027 — CANCELAR VENDA FINALIZADA
-- =====================================================================
-- Permite cancelar venda já finalizada com motivo, autor e horário;
-- devolver estoque (tipo novo devolucao_venda); e módulo de permissão.
-- O CHECK de movimentacao_estoque.tipo precisa ser recriado via SQL
-- (db push não replica CHECK).
-- =====================================================================

ALTER TABLE venda
    ADD COLUMN cancelada_em TIMESTAMP,
    ADD COLUMN cancelada_por_id INTEGER REFERENCES usuario(id),
    ADD COLUMN motivo_cancelamento TEXT;

COMMENT ON COLUMN venda.cancelada_em IS
    'Preenchido ao cancelar uma venda que já estava finalizada.';
COMMENT ON COLUMN venda.cancelada_por_id IS
    'Usuário que cancelou a venda finalizada.';
COMMENT ON COLUMN venda.motivo_cancelamento IS
    'Motivo obrigatório do cancelamento de venda finalizada.';

ALTER TABLE movimentacao_estoque DROP CONSTRAINT IF EXISTS movimentacao_estoque_tipo_check;

ALTER TABLE movimentacao_estoque ADD CONSTRAINT movimentacao_estoque_tipo_check
    CHECK (tipo IN (
        'entrada_compra',
        'saida_venda',
        'ajuste_positivo',
        'ajuste_negativo',
        'producao_consumo',
        'producao_geracao',
        'perda',
        'devolucao_venda'
    ));

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('cancelar_venda', 'Cancelar vendas finalizadas', FALSE, 115)
ON CONFLICT (chave) DO NOTHING;

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
WHERE m.chave = 'cancelar_venda'
ON CONFLICT (perfil, modulo_id) DO NOTHING;
