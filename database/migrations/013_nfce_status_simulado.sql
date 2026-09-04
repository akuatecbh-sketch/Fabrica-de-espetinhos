-- =====================================================================
-- MIGRATION 013 — NFC-e STATUS SIMULADO
-- =====================================================================
-- Constraint confirmada no banco ANTES deste ALTER:
--   conname: nfce_status_check
--   CHECK (status IN (
--     'pendente','autorizada','rejeitada','cancelada','contingencia'
--   ))
-- Inclui 'simulado' para emissão sem FOCUS_NFE_TOKEN.
-- =====================================================================

ALTER TABLE nfce DROP CONSTRAINT IF EXISTS nfce_status_check;

ALTER TABLE nfce ADD CONSTRAINT nfce_status_check
    CHECK (status IN (
        'pendente',
        'autorizada',
        'rejeitada',
        'cancelada',
        'contingencia',
        'simulado'
    ));

COMMENT ON COLUMN nfce.status IS
    'pendente, autorizada, rejeitada, cancelada, contingencia ou simulado (sem token de gateway).';
