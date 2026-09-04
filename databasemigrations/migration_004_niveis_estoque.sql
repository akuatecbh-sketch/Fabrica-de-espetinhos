-- Cópia de database/migrations/004_niveis_estoque.sql

ALTER TABLE produto
    ADD COLUMN estoque_ideal NUMERIC(12,3),
    ADD COLUMN estoque_maximo NUMERIC(12,3);

COMMENT ON COLUMN produto.estoque_minimo IS
    'Ponto de alerta: abaixo disso, é preciso repor/produzir.';
COMMENT ON COLUMN produto.estoque_ideal IS
    'Quantidade que o gestor deseja manter em estoque em condições normais.';
COMMENT ON COLUMN produto.estoque_maximo IS
    'Teto de estoque — evita produção/compra excessiva.';

ALTER TABLE produto
    ADD CONSTRAINT chk_niveis_estoque CHECK (
        (estoque_ideal IS NULL OR estoque_minimo IS NULL OR estoque_ideal >= estoque_minimo)
        AND
        (estoque_maximo IS NULL OR estoque_ideal IS NULL OR estoque_maximo >= estoque_ideal)
    );
