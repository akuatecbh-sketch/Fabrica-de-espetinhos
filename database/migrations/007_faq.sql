-- =====================================================================
-- MIGRATION 007 — FAQ / PALETA DE COMANDO
-- =====================================================================
-- Arquivo pedido em /database/migrations/007_faq.sql.
-- (007_criado_por_usuario.sql já existia; este arquivo cria faq_item.)
-- Perguntas de ajuda com módulo opcional (chave de `modulo`).
-- modulo_chave NULL = visível para qualquer usuário autenticado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS faq_item (
    id              SERIAL PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    palavras_chave  VARCHAR(500),
    resposta        TEXT NOT NULL,
    rota_destino    VARCHAR(200) NOT NULL,
    modulo_chave    VARCHAR(40) REFERENCES modulo(chave) ON DELETE SET NULL,
    ordem           INTEGER NOT NULL DEFAULT 0,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP NOT NULL DEFAULT NOW(),
    atualizado_em   TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE faq_item IS
    'Perguntas de ajuda da paleta de busca (Ctrl+K). Soft-delete via ativo.';
COMMENT ON COLUMN faq_item.modulo_chave IS
    'Chave de modulo. NULL = visível para qualquer usuário autenticado.';
COMMENT ON COLUMN faq_item.palavras_chave IS
    'Termos extras para busca, separados por vírgula.';
COMMENT ON COLUMN faq_item.rota_destino IS
    'Rota interna para a qual o resultado navega (ex.: /compras/nova).';

CREATE INDEX IF NOT EXISTS idx_faq_item_ativo_ordem
    ON faq_item (ativo, ordem);

CREATE INDEX IF NOT EXISTS idx_faq_item_modulo
    ON faq_item (modulo_chave);

INSERT INTO faq_item (titulo, palavras_chave, resposta, rota_destino, modulo_chave, ordem, ativo)
SELECT v.titulo, v.palavras_chave, v.resposta, v.rota_destino, v.modulo_chave, v.ordem, TRUE
FROM (VALUES
    (
        'Lançar nota fiscal de entrada',
        'nota fiscal, nfe, nf-e, xml, compra, fornecedor, entrada, mercadoria',
        'Registre a nota fiscal de entrada em Compras para dar entrada no estoque e gerar as contas a pagar.',
        '/compras/nova',
        'compras',
        10
    ),
    (
        'Abrir o PDV',
        'pdv, venda, terminal, aba, cupom',
        'Abra o ponto de venda para iniciar ou continuar vendas no terminal.',
        '/pdv',
        'pdv',
        20
    ),
    (
        'Abrir ou fechar o caixa',
        'caixa, abertura, fechamento, sangria, suprimento',
        'Controle a abertura, movimentações e o fechamento do caixa do dia.',
        '/caixa',
        'caixa',
        30
    ),
    (
        'Ver vendas do dia',
        'vendas, faturamento, cupom, relatorio',
        'Consulte as vendas finalizadas hoje, valores e formas de pagamento.',
        '/vendas/hoje',
        'vendas',
        40
    ),
    (
        'Consultar estoque',
        'estoque, saldo, insumo, produção, ajuste',
        'Acompanhe saldos, movimentações e a produção a partir das fichas técnicas.',
        '/estoque',
        'estoque',
        50
    ),
    (
        'Cadastrar produto',
        'produto, ficha técnica, cardápio, insumo',
        'Cadastre produtos, categorias e fichas técnicas usadas no PDV e no estoque.',
        '/produtos',
        'produtos',
        60
    ),
    (
        'Minha conta',
        'perfil, senha, nome, email',
        'Atualize seus dados de acesso e a senha da sua conta.',
        '/minha-conta',
        NULL,
        70
    )
) AS v(titulo, palavras_chave, resposta, rota_destino, modulo_chave, ordem)
WHERE NOT EXISTS (
    SELECT 1 FROM faq_item f WHERE f.titulo = v.titulo
);
