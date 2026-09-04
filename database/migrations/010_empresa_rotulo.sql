-- =====================================================================
-- MIGRATION 010 — DADOS DA EMPRESA (RÓTULO / IDENTIDADE)
-- =====================================================================
-- Arquivo pedido em /database/migrations/010_empresa_rotulo.sql.
-- (010_definido_por_permissao.sql já existia; este arquivo cria a
-- tabela singleton empresa, o módulo correspondente e libera acesso
-- só para super_admin e gerente.)
-- =====================================================================

CREATE TABLE IF NOT EXISTS empresa (
    id              INTEGER PRIMARY KEY DEFAULT 1
                    CHECK (id = 1),
    razao_social    VARCHAR(150) NOT NULL,
    nome_fantasia   VARCHAR(150),
    cnpj            CHAR(14),
    endereco        VARCHAR(255),
    telefone        VARCHAR(20),
    email           VARCHAR(150),
    logo_url        VARCHAR(255),
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE empresa IS
    'Dados cadastrais da empresa (singleton, id sempre 1).';
COMMENT ON COLUMN empresa.logo_url IS
    'Caminho relativo da logomarca em /uploads/empresa/.';

INSERT INTO modulo (chave, nome, somente_super_admin, ordem) VALUES
    ('empresa', 'Empresa', FALSE, 18)
ON CONFLICT (chave) DO NOTHING;

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT p.perfil, m.id, p.pode
FROM modulo m
CROSS JOIN (VALUES
    ('super_admin',  TRUE),
    ('admin',        FALSE),
    ('gerente',      TRUE),
    ('financeiro',   FALSE),
    ('estoquista',   FALSE),
    ('operador_pdv', FALSE)
) AS p(perfil, pode)
WHERE m.chave = 'empresa'
ON CONFLICT (perfil, modulo_id) DO NOTHING;

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS peso_aproximado_g NUMERIC(12, 1);

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS ingredientes TEXT;

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS contem_alergenicos TEXT;

ALTER TABLE produto
    ADD COLUMN IF NOT EXISTS pode_conter_tracos TEXT;

ALTER TABLE produto
    DROP CONSTRAINT IF EXISTS produto_peso_aproximado_g_check;

ALTER TABLE produto
    ADD CONSTRAINT produto_peso_aproximado_g_check
    CHECK (peso_aproximado_g IS NULL OR peso_aproximado_g > 0);

COMMENT ON COLUMN produto.peso_aproximado_g IS
    'Peso fixo informativo em gramas para o rótulo. Não se aplica quando vendido_por_peso.';
COMMENT ON COLUMN produto.ingredientes IS
    'Lista de ingredientes impressa no rótulo, se preenchida.';
COMMENT ON COLUMN produto.contem_alergenicos IS
    'Declaração de alergênicos (ex.: Contém leite e derivados).';
COMMENT ON COLUMN produto.pode_conter_tracos IS
    'Declaração de traços (ex.: Pode conter traços de amendoim).';

INSERT INTO modelo_etiqueta (
    nome, tipo, largura_mm, altura_mm,
    colunas_por_folha, linhas_por_folha,
    margem_superior_mm, margem_esquerda_mm,
    espaco_horizontal_mm, espaco_vertical_mm,
    ativo, ordem
) VALUES
    (
        'Pimaco 6081 (25,4 x 101,6mm, 20/folha A4)',
        'folha_a4',
        101.6, 25.4,
        2, 10,
        21.2, 4.0,
        2.5, 0,
        TRUE, 30
    )
ON CONFLICT (nome) DO NOTHING;
