-- =====================================================================
-- MIGRATION 024 — LOG DE AUDITORIA GERAL
-- =====================================================================
-- Neste projeto o catálogo de módulos é a tabela "modulo" (não existe
-- modulo_sistema / nome_exibicao / rota). Os INSERTs de permissão
-- foram mapeados para modulo + permissao_perfil, no mesmo padrão da 022.
-- =====================================================================

CREATE TABLE log_auditoria (
    id              SERIAL PRIMARY KEY,
    usuario_id      INTEGER REFERENCES usuario(id),
    acao            VARCHAR(60) NOT NULL,
    entidade_tipo   VARCHAR(40) NOT NULL,
    entidade_id     INTEGER,
    valor_anterior  JSONB,
    valor_novo      JSONB,
    criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_log_auditoria_entidade ON log_auditoria (entidade_tipo, entidade_id);
CREATE INDEX idx_log_auditoria_usuario ON log_auditoria (usuario_id, criado_em);

COMMENT ON TABLE log_auditoria IS 'Registro genérico de ações sensíveis do sistema, para investigar "quem alterou o quê" além do que já é coberto por movimentacao_estoque e movimentacao_caixa.';

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('auditoria', 'Auditoria', FALSE, 18)
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
WHERE m.chave = 'auditoria'
ON CONFLICT (perfil, modulo_id) DO NOTHING;
