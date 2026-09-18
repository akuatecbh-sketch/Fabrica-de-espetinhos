-- =====================================================================
-- MIGRATION 021 — ÍNDICES DE PERFORMANCE
-- =====================================================================
-- Aplicado no banco via script Prisma ($executeRawUnsafe), um CREATE
-- INDEX por vez. CREATE INDEX CONCURRENTLY não pode rodar dentro de
-- $transaction nem de um bloco de migration com transação implícita.
-- Este arquivo documenta o DDL já aplicado.
-- =====================================================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venda_status_finalizado ON venda (status, finalizado_em);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_caixa_status ON caixa (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conta_pagar_status_vencimento ON conta_pagar (status, data_vencimento);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conta_receber_status_vencimento ON conta_receber (status, data_vencimento);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_produto_tipo_ativo ON produto (tipo, ativo);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venda_pagamento_venda_id ON venda_pagamento (venda_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_venda_pagamento_status ON venda_pagamento (status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ferias_status_periodo ON ferias (status, periodo_aquisitivo_fim);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pedido_cliente_status ON pedido (cliente_id, status);
