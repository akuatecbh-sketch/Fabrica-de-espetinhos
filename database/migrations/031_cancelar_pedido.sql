-- =====================================================================
-- MIGRATION 031 — PERMISSÃO CANCELAR PEDIDO
-- =====================================================================
-- Ação destrutiva separada do módulo pedidos (análoga a cancelar_venda).
-- Não altera colunas de pedido: motivo fica na auditoria.
-- =====================================================================

BEGIN;

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('cancelar_pedido', 'Cancelar pedidos', FALSE, 106)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('proprietario', TRUE),
    ('gerente',      TRUE),
    ('financeiro',   FALSE),
    ('estoquista',   FALSE),
    ('operador_pdv', FALSE)
) AS p(perfil, pode)
WHERE m.chave = 'cancelar_pedido'
ON CONFLICT (perfil, modulo_id) DO NOTHING;

COMMIT;
