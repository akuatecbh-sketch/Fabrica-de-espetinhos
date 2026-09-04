-- =====================================================================
-- MIGRATION 003 — AJUSTES NO CADASTRO DE PRODUTOS
-- =====================================================================
-- 1. Código de barras dedicado (separado do "codigo" interno já existente)
-- 2. Níveis de estoque: ideal e máximo (além do mínimo já existente)
-- 3. Venda em pacote/atacado: quantidade por pacote e preço do pacote
-- =====================================================================

ALTER TABLE produto
    ADD COLUMN codigo_barras          VARCHAR(20) UNIQUE, -- EAN-13 gerado automaticamente se não informado
    ADD COLUMN estoque_ideal          NUMERIC(12,3),        -- quanto o gestor quer manter parado normalmente
    ADD COLUMN estoque_maximo         NUMERIC(12,3),        -- teto para não produzir/comprar demais
    ADD COLUMN quantidade_por_pacote  NUMERIC(12,3) NOT NULL DEFAULT 1, -- quantas unidades compõem 1 pacote
    ADD COLUMN preco_pacote           NUMERIC(12,2),         -- preço de venda do pacote fechado (já com eventual desconto atacado embutido)
    ADD COLUMN permite_venda_pacote   BOOLEAN NOT NULL DEFAULT FALSE;   -- se este produto pode ser vendido fechado, em pacote

COMMENT ON COLUMN produto.codigo IS 'Código interno / SKU, de uso livre do estabelecimento.';
COMMENT ON COLUMN produto.codigo_barras IS 'Código de barras (EAN-13). Gerado automaticamente no cadastro quando não informado, usando prefixo 2 (uso interno/restrito, reservado pela GS1).';
COMMENT ON COLUMN produto.estoque_minimo IS 'Ponto de alerta: abaixo disso, é preciso repor/produzir.';
COMMENT ON COLUMN produto.estoque_ideal IS 'Quantidade que o gestor deseja manter em estoque em condições normais.';
COMMENT ON COLUMN produto.estoque_maximo IS 'Teto de estoque — evita produção/compra excessiva.';
COMMENT ON COLUMN produto.preco_venda IS 'Preço de venda por unidade (unidade_medida_id).';
COMMENT ON COLUMN produto.quantidade_por_pacote IS 'Quantas unidades (na unidade_medida do produto) compõem um pacote fechado.';
COMMENT ON COLUMN produto.preco_pacote IS 'Preço de venda do pacote fechado. Comparado com preco_venda * quantidade_por_pacote para calcular o desconto de atacado implícito.';

-- Validação leve: quando os três níveis de estoque estiverem preenchidos,
-- garantir que fazem sentido em ordem (mínimo <= ideal <= máximo).
-- Usa CHECK condicional para não travar produtos que ainda não têm os
-- três campos preenchidos (ex: embalagens, produtos recém-cadastrados).
ALTER TABLE produto
    ADD CONSTRAINT chk_niveis_estoque CHECK (
        (estoque_ideal IS NULL OR estoque_minimo IS NULL OR estoque_ideal >= estoque_minimo)
        AND
        (estoque_maximo IS NULL OR estoque_ideal IS NULL OR estoque_maximo >= estoque_ideal)
    );

-- Validação leve: se o produto permite venda em pacote, quantidade_por_pacote
-- deve ser maior que 1 (senão não é "pacote", é a própria unidade) e
-- preco_pacote precisa estar preenchido.
ALTER TABLE produto
    ADD CONSTRAINT chk_venda_pacote CHECK (
        permite_venda_pacote = FALSE
        OR (quantidade_por_pacote > 1 AND preco_pacote IS NOT NULL)
    );
