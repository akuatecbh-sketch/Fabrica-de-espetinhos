-- Cópia de database/migrations/005_venda_pacote.sql

ALTER TABLE produto
    ADD COLUMN quantidade_por_pacote NUMERIC(12,3) NOT NULL DEFAULT 1,
    ADD COLUMN preco_pacote NUMERIC(12,2),
    ADD COLUMN permite_venda_pacote BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE produto
    ADD CONSTRAINT chk_venda_pacote CHECK (
        permite_venda_pacote = FALSE
        OR (quantidade_por_pacote > 1 AND preco_pacote IS NOT NULL)
    );
