-- =====================================================================
-- MIGRATION 002 — TAXAS DE MAQUININHA (DÉBITO / CRÉDITO / PIX)
-- =====================================================================
-- Objetivo:
--   1. Tabela editável com as taxas cobradas pela operadora de cartão,
--      com controle de vigência (histórico não se altera quando a taxa muda).
--   2. Registrar em cada pagamento o percentual efetivamente aplicado
--      (snapshot), o valor da taxa e o valor líquido recebido.
--   3. Fornecer views prontas para a tela de fechamento de caixa e para
--      exportação à contabilidade.
--   4. Gerar automaticamente uma despesa (conta_pagar) com o total de
--      taxas do dia, mantendo a receita bruta intacta nos relatórios
--      fiscais (a taxa é despesa financeira, não abatimento de receita).
-- =====================================================================


-- =====================================================================
-- 1. TABELA EDITÁVEL DE TAXAS
-- =====================================================================

CREATE TABLE taxa_cartao (
    id                  SERIAL PRIMARY KEY,
    forma_pagamento_id  INTEGER NOT NULL REFERENCES forma_pagamento(id),
    adquirente          VARCHAR(60) NOT NULL DEFAULT 'Padrão', -- nome da operadora/máquina (Stone, Cielo, Rede...), útil se houver mais de uma maquininha
    numero_parcelas     INTEGER NOT NULL DEFAULT 1,            -- 1 = débito/pix/crédito à vista; >1 = crédito parcelado
    percentual          NUMERIC(5,2) NOT NULL CHECK (percentual >= 0 AND percentual <= 100),
    vigencia_inicio     DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_fim        DATE,                                   -- NULL = taxa vigente atualmente
    usuario_id          INTEGER REFERENCES usuario(id),         -- quem cadastrou/alterou
    criado_em           TIMESTAMP NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMP NOT NULL DEFAULT now(),
    CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);

-- Garante que não existam 2 taxas "vigentes" (sem data fim) para a mesma
-- combinação de forma de pagamento + adquirente + parcelas
CREATE UNIQUE INDEX idx_taxa_cartao_vigente
    ON taxa_cartao (forma_pagamento_id, adquirente, numero_parcelas)
    WHERE vigencia_fim IS NULL;

-- Regra de uso (aplicação): ao editar uma taxa na tela do financeiro,
-- NUNCA fazer UPDATE no percentual de um registro existente. Em vez disso:
--   1. UPDATE na taxa vigente atual: SET vigencia_fim = CURRENT_DATE - 1
--   2. INSERT de uma nova linha com o novo percentual e vigencia_inicio = CURRENT_DATE
-- Isso preserva o histórico e garante que vendas antigas nunca "mudem de valor".


-- =====================================================================
-- 2. SNAPSHOT DA TAXA EM CADA PAGAMENTO
-- =====================================================================

ALTER TABLE venda_pagamento
    ADD COLUMN numero_parcelas          INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN taxa_cartao_id           INTEGER REFERENCES taxa_cartao(id), -- rastreabilidade: qual taxa foi usada
    ADD COLUMN taxa_percentual_aplicada NUMERIC(5,2) NOT NULL DEFAULT 0,    -- "foto" do % no momento da venda
    ADD COLUMN valor_taxa               NUMERIC(12,2) NOT NULL DEFAULT 0,   -- valor * taxa_percentual_aplicada / 100
    ADD COLUMN valor_liquido            NUMERIC(12,2) NOT NULL DEFAULT 0;   -- valor - valor_taxa

-- Lógica de preenchimento (aplicação, no momento da finalização da venda):
--   1. Buscar em taxa_cartao a linha vigente (vigencia_fim IS NULL, ou a
--      data da venda dentro do intervalo vigencia_inicio/vigencia_fim)
--      para a forma_pagamento_id + numero_parcelas escolhidos.
--   2. Copiar taxa_cartao_id e percentual para taxa_percentual_aplicada.
--   3. valor_taxa = ROUND(valor * taxa_percentual_aplicada / 100, 2)
--   4. valor_liquido = valor - valor_taxa
--   5. Para dinheiro/fiado, taxa_percentual_aplicada = 0 (sem custo de maquininha).


-- =====================================================================
-- 3. VIEWS PARA FECHAMENTO DE CAIXA E CONFERÊNCIA GERENCIAL
-- =====================================================================

-- Resumo por forma de pagamento dentro de um caixa (tela de fechamento do operador)
CREATE VIEW vw_fechamento_caixa_formas AS
SELECT
    c.id                    AS caixa_id,
    c.data_abertura::date   AS data_caixa,
    fp.nome                 AS forma_pagamento,
    vp.numero_parcelas,
    COUNT(vp.id)             AS qtd_transacoes,
    SUM(vp.valor)            AS valor_bruto,
    SUM(vp.valor_taxa)       AS valor_taxa,
    SUM(vp.valor_liquido)    AS valor_liquido
FROM venda_pagamento vp
JOIN venda v          ON v.id = vp.venda_id
JOIN caixa c          ON c.id = v.caixa_id
JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
WHERE vp.status = 'confirmado'
  AND v.status = 'finalizada'
GROUP BY c.id, c.data_abertura::date, fp.nome, vp.numero_parcelas;

-- Totalizador único por caixa: o número que o operador vê ao fechar
CREATE VIEW vw_fechamento_caixa_total AS
SELECT
    caixa_id,
    data_caixa,
    SUM(valor_bruto)   AS faturamento_bruto,
    SUM(valor_taxa)    AS total_taxas,
    SUM(valor_liquido) AS faturamento_liquido
FROM vw_fechamento_caixa_formas
GROUP BY caixa_id, data_caixa;

-- Faturamento diário consolidado (todos os caixas do dia) — visão do gestor
CREATE VIEW vw_faturamento_diario AS
SELECT
    date_trunc('day', v.finalizado_em)::date AS data,
    fp.nome                                   AS forma_pagamento,
    SUM(vp.valor)                             AS valor_bruto,
    SUM(vp.valor_taxa)                        AS valor_taxa,
    SUM(vp.valor_liquido)                     AS valor_liquido
FROM venda_pagamento vp
JOIN venda v           ON v.id = vp.venda_id
JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
WHERE vp.status = 'confirmado'
  AND v.status = 'finalizada'
GROUP BY date_trunc('day', v.finalizado_em)::date, fp.nome
ORDER BY data DESC;

-- Base pronta para exportar à contabilidade (mensal, por forma de pagamento)
CREATE VIEW vw_export_contabilidade_mensal AS
SELECT
    date_trunc('month', v.finalizado_em)::date AS mes_referencia,
    fp.nome                                     AS forma_pagamento,
    COUNT(vp.id)                                AS qtd_transacoes,
    SUM(vp.valor)                               AS receita_bruta,
    SUM(vp.valor_taxa)                          AS despesa_taxa_maquininha,
    SUM(vp.valor_liquido)                       AS valor_liquido_recebido
FROM venda_pagamento vp
JOIN venda v           ON v.id = vp.venda_id
JOIN forma_pagamento fp ON fp.id = vp.forma_pagamento_id
WHERE vp.status = 'confirmado'
  AND v.status = 'finalizada'
GROUP BY date_trunc('month', v.finalizado_em)::date, fp.nome
ORDER BY mes_referencia DESC;


-- =====================================================================
-- 4. LANÇAMENTO AUTOMÁTICO DA DESPESA DE TAXA NO FECHAMENTO DO CAIXA
-- =====================================================================
-- Por que fazer isso: para a contabilidade, a receita da venda é o valor
-- BRUTO (é o que consta no NFC-e). A taxa da maquininha é uma despesa
-- financeira separada. Lançando-a como conta_pagar, o DRE fica correto:
-- Receita bruta (vendas) − Despesas (incluindo taxa de cartão) = Resultado.
-- O gestor ainda enxerga o "valor líquido recebido" pelas views acima,
-- sem que isso precise se misturar com o valor de receita reconhecido.

-- Sugestão de categoria a cadastrar uma única vez:
-- INSERT INTO categoria_financeira (nome, tipo) VALUES ('Taxas de Cartão/Maquininha', 'custo_variavel');

-- Lógica (executar na aplicação, ao fechar o caixa — status 'fechado'):
--   1. total_taxas := SELECT total_taxas FROM vw_fechamento_caixa_total WHERE caixa_id = :id
--   2. Se total_taxas > 0:
--        INSERT INTO conta_pagar (categoria_id, descricao, valor, data_vencimento, status, criado_em)
--        VALUES (
--            (SELECT id FROM categoria_financeira WHERE nome = 'Taxas de Cartão/Maquininha'),
--            'Taxas de maquininha - Caixa #' || :caixa_id || ' - ' || :data_caixa,
--            total_taxas,
--            :data_caixa, -- ou a data de repasse da operadora, se preferir
--            'aberta',
--            now()
--        );
--   Isso pode virar 'paga' automaticamente se o débito da taxa for feito
--   direto pela operadora (não passa pelo caixa físico), ou ficar 'aberta'
--   se for pago manualmente depois.
-- =====================================================================
