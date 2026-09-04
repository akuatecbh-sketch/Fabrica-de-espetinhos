-- =====================================================================
-- MIGRATION 006 — PERMISSÕES POR MÓDULO
-- =====================================================================
-- Arquivo pedido em /database/migrations/006_permissoes.sql.
-- (006_papeis_senha.sql já existia; este arquivo é o catálogo de
-- permissões. A cópia sequencial é 009_permissoes.sql.)
-- Catálogo de módulos + permissão por perfil, com exceção por usuário.
-- permissao_usuario sempre vence. somente_super_admin ignora o restante.
-- Semente reproduz o acesso que já existia no código, com o ajuste do
-- financeiro: caixa, vendas, financeiro, clientes, fornecedores
-- (sem pdv e sem estoque).
-- =====================================================================

CREATE TABLE IF NOT EXISTS modulo (
    id                   SERIAL PRIMARY KEY,
    chave                VARCHAR(40) UNIQUE NOT NULL,
    nome                 VARCHAR(80) NOT NULL,
    somente_super_admin  BOOLEAN NOT NULL DEFAULT FALSE,
    ordem                INTEGER NOT NULL DEFAULT 0
);

COMMENT ON TABLE modulo IS
    'Catálogo de módulos da aplicação. A chave é o identificador usado no código.';
COMMENT ON COLUMN modulo.somente_super_admin IS
    'Se true, só super_admin acessa — ignora permissao_perfil e permissao_usuario.';

CREATE TABLE IF NOT EXISTS permissao_perfil (
    id            SERIAL PRIMARY KEY,
    perfil        VARCHAR(30) NOT NULL,
    modulo_id     INTEGER NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
    pode_acessar  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (perfil, modulo_id)
);

COMMENT ON TABLE permissao_perfil IS
    'Acesso padrão de um perfil a um módulo, quando não há exceção por usuário.';

CREATE TABLE IF NOT EXISTS permissao_usuario (
    id            SERIAL PRIMARY KEY,
    usuario_id    INTEGER NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    modulo_id     INTEGER NOT NULL REFERENCES modulo(id) ON DELETE CASCADE,
    pode_acessar  BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (usuario_id, modulo_id)
);

COMMENT ON TABLE permissao_usuario IS
    'Exceção por usuário. Se existir, vence o valor de permissao_perfil.';

CREATE INDEX IF NOT EXISTS idx_permissao_perfil_perfil
    ON permissao_perfil (perfil);
CREATE INDEX IF NOT EXISTS idx_permissao_usuario_usuario
    ON permissao_usuario (usuario_id);

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('dashboard',    'Dashboard',           FALSE, 10),
    ('produtos',     'Produtos',            FALSE, 20),
    ('clientes',     'Clientes',            FALSE, 30),
    ('fornecedores', 'Fornecedores',        FALSE, 40),
    ('usuarios',     'Usuários',            FALSE, 50),
    ('funcionarios', 'Funcionários',        FALSE, 60),
    ('estoque',      'Estoque',             FALSE, 70),
    ('compras',      'Compras',             FALSE, 80),
    ('pdv',          'PDV',                 FALSE, 90),
    ('caixa',        'Caixa',               FALSE, 100),
    ('vendas',       'Vendas',              FALSE, 110),
    ('financeiro',   'Financeiro',          FALSE, 120),
    ('saude',        'Saúde do sistema',    TRUE,  130)
ON CONFLICT (chave) DO NOTHING;

WITH perfils AS (
    SELECT unnest(ARRAY[
        'super_admin',
        'admin',
        'gerente',
        'financeiro',
        'estoquista',
        'operador_pdv'
    ]) AS perfil
),
liberado (perfil, chave) AS (
    VALUES
        -- super_admin: todos, inclusive saúde
        ('super_admin', 'dashboard'),
        ('super_admin', 'produtos'),
        ('super_admin', 'clientes'),
        ('super_admin', 'fornecedores'),
        ('super_admin', 'usuarios'),
        ('super_admin', 'funcionarios'),
        ('super_admin', 'estoque'),
        ('super_admin', 'compras'),
        ('super_admin', 'pdv'),
        ('super_admin', 'caixa'),
        ('super_admin', 'vendas'),
        ('super_admin', 'financeiro'),
        ('super_admin', 'saude'),

        -- admin / gerente: todos, menos saúde
        ('admin', 'dashboard'),
        ('admin', 'produtos'),
        ('admin', 'clientes'),
        ('admin', 'fornecedores'),
        ('admin', 'usuarios'),
        ('admin', 'funcionarios'),
        ('admin', 'estoque'),
        ('admin', 'compras'),
        ('admin', 'pdv'),
        ('admin', 'caixa'),
        ('admin', 'vendas'),
        ('admin', 'financeiro'),

        ('gerente', 'dashboard'),
        ('gerente', 'produtos'),
        ('gerente', 'clientes'),
        ('gerente', 'fornecedores'),
        ('gerente', 'usuarios'),
        ('gerente', 'funcionarios'),
        ('gerente', 'estoque'),
        ('gerente', 'compras'),
        ('gerente', 'pdv'),
        ('gerente', 'caixa'),
        ('gerente', 'vendas'),
        ('gerente', 'financeiro'),

        -- financeiro: caixa, vendas, financeiro, clientes, fornecedores
        ('financeiro', 'dashboard'),
        ('financeiro', 'caixa'),
        ('financeiro', 'vendas'),
        ('financeiro', 'financeiro'),
        ('financeiro', 'clientes'),
        ('financeiro', 'fornecedores'),

        -- estoquista
        ('estoquista', 'dashboard'),
        ('estoquista', 'produtos'),
        ('estoquista', 'estoque'),
        ('estoquista', 'compras'),

        -- operador PDV
        ('operador_pdv', 'dashboard'),
        ('operador_pdv', 'pdv'),
        ('operador_pdv', 'caixa'),
        ('operador_pdv', 'vendas')
)
INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT
    p.perfil,
    m.id,
    EXISTS (
        SELECT 1
        FROM liberado l
        WHERE l.perfil = p.perfil
          AND l.chave = m.chave
    )
FROM perfils p
CROSS JOIN modulo m
ON CONFLICT (perfil, modulo_id) DO NOTHING;
