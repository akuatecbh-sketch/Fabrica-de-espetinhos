-- =====================================================================
-- MIGRATION 006 — PAPÉIS E SENHA PROVISÓRIA
-- =====================================================================
-- (No plano original: 004_papeis_senha; 004 e 005 já existiam.)
-- Inclui super_admin no CHECK de perfil e marca senha temporária.
-- =====================================================================

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_perfil_check;

ALTER TABLE usuario
    ADD CONSTRAINT usuario_perfil_check
    CHECK (perfil IN (
        'super_admin',
        'admin',
        'gerente',
        'operador_pdv',
        'financeiro',
        'estoquista'
    ));

ALTER TABLE usuario
    ADD COLUMN IF NOT EXISTS senha_provisoria BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN usuario.senha_provisoria IS
    'Se true, o usuário deve definir uma senha definitiva no próximo login.';

CREATE UNIQUE INDEX IF NOT EXISTS usuario_um_super_admin
    ON usuario ((1))
    WHERE perfil = 'super_admin';
