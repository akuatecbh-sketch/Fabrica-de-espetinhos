-- =====================================================================
-- MIGRATION 030 — PERFIL PROPRIETARIO
-- =====================================================================
-- Dono da empresa-cliente, entre super_admin e gerente.
-- Acesso a todos os módulos, exceto somente_super_admin (Saúde/backups).
-- CHECKs de usuario.perfil e permissao_perfil.perfil passam a aceitar
-- 'proprietario'. Não altera usuários existentes.
-- =====================================================================

BEGIN;

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_perfil_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_perfil_check
    CHECK (perfil IN (
        'super_admin',
        'proprietario',
        'gerente',
        'operador_pdv',
        'financeiro',
        'estoquista'
    ));

ALTER TABLE permissao_perfil DROP CONSTRAINT IF EXISTS permissao_perfil_perfil_check;
ALTER TABLE permissao_perfil ADD CONSTRAINT permissao_perfil_perfil_check
    CHECK (perfil IN (
        'super_admin',
        'proprietario',
        'gerente',
        'operador_pdv',
        'financeiro',
        'estoquista'
    ));

COMMENT ON COLUMN usuario.perfil IS
    'super_admin, proprietario, gerente, operador_pdv, financeiro ou estoquista.';

COMMENT ON COLUMN permissao_perfil.perfil IS
    'Perfil do padrão de acesso. Inclui proprietario (tudo menos somente_super_admin).';

INSERT INTO permissao_perfil (perfil, modulo_id, pode_acessar)
SELECT
    'proprietario',
    m.id,
    NOT m.somente_super_admin
FROM modulo m
ON CONFLICT (perfil, modulo_id) DO UPDATE
SET pode_acessar = EXCLUDED.pode_acessar;

COMMIT;
