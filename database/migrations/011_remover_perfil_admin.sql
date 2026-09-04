-- =====================================================================
-- MIGRATION 011 — REMOVE O PERFIL RESIDUAL "admin"
-- =====================================================================
-- O perfil "admin" deveria ter saído quando o super_admin foi
-- introduzido, mas ficou para trás na renumeração 004 → 006.
-- Esta migration: desativa admin@local (normalizando o valor),
-- apaga as permissões órfãs e aperta os CHECKs.
-- =====================================================================

UPDATE usuario
SET perfil = 'super_admin', ativo = false
WHERE email = 'admin@local';

DELETE FROM permissao_perfil WHERE perfil = 'admin';

ALTER TABLE usuario DROP CONSTRAINT IF EXISTS usuario_perfil_check;
ALTER TABLE usuario ADD CONSTRAINT usuario_perfil_check
    CHECK (perfil IN ('super_admin','gerente','operador_pdv','financeiro','estoquista'));

ALTER TABLE permissao_perfil DROP CONSTRAINT IF EXISTS permissao_perfil_perfil_check;
ALTER TABLE permissao_perfil ADD CONSTRAINT permissao_perfil_perfil_check
    CHECK (perfil IN ('super_admin','gerente','operador_pdv','financeiro','estoquista'));
