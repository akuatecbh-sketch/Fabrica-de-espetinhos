-- =====================================================================
-- SISTEMA DE GESTÃO - FÁBRICA DE ESPETINHOS
-- Modelo de dados completo (PostgreSQL)
-- =====================================================================
-- Ordem dos módulos segue a ordem de dependência das FOREIGN KEYs:
--   1. Usuários / Acesso
--   2. RH (Funcionários, Férias)
--   3. Estoque / Produtos / Ficha Técnica
--   4. Fornecedores / Compras / Nota Fiscal de Entrada
--   5. Clientes
--   6. PDV / Vendas (com suporte a vendas simultâneas)
--   7. Financeiro (Contas a Pagar/Receber, Caixa) -- referencia vendas
-- =====================================================================


-- =====================================================================
-- 1. USUÁRIOS / ACESSO
-- =====================================================================

CREATE TABLE usuario (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    email           VARCHAR(150) UNIQUE NOT NULL,
    senha_hash      VARCHAR(255) NOT NULL,
    perfil          VARCHAR(30) NOT NULL CHECK (perfil IN ('admin','gerente','operador_pdv','financeiro','estoquista')),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP NOT NULL DEFAULT now(),
    ultimo_login    TIMESTAMP
);


-- =====================================================================
-- 2. RECURSOS HUMANOS
-- =====================================================================

CREATE TABLE funcionario (
    id                  SERIAL PRIMARY KEY,
    usuario_id          INTEGER REFERENCES usuario(id), -- se ele também acessa o sistema (ex: operador de PDV)
    nome                VARCHAR(150) NOT NULL,
    cpf                 CHAR(11) UNIQUE NOT NULL,
    rg                  VARCHAR(20),
    data_nascimento     DATE NOT NULL,
    telefone            VARCHAR(20),
    email               VARCHAR(150),
    endereco            VARCHAR(255),
    cargo               VARCHAR(80) NOT NULL,
    salario             NUMERIC(10,2) NOT NULL,
    data_admissao       DATE NOT NULL,
    data_demissao       DATE,
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_funcionario_aniversario ON funcionario (EXTRACT(MONTH FROM data_nascimento), EXTRACT(DAY FROM data_nascimento));

CREATE TABLE ferias (
    id                          SERIAL PRIMARY KEY,
    funcionario_id              INTEGER NOT NULL REFERENCES funcionario(id),
    periodo_aquisitivo_inicio   DATE NOT NULL,
    periodo_aquisitivo_fim      DATE NOT NULL,
    data_inicio_programada      DATE,
    data_fim_programada         DATE,
    dias_gozados                INTEGER,
    dias_vendidos               INTEGER DEFAULT 0, -- venda de 1/3 das férias (abono pecuniário)
    status                      VARCHAR(20) NOT NULL DEFAULT 'pendente'
                                CHECK (status IN ('pendente','programada','gozada','vencida')),
    observacao                  TEXT
);


-- =====================================================================
-- 3. ESTOQUE / PRODUTOS / FICHA TÉCNICA
-- =====================================================================

CREATE TABLE unidade_medida (
    id          SERIAL PRIMARY KEY,
    sigla       VARCHAR(10) UNIQUE NOT NULL,  -- kg, un, l, g, pct
    descricao   VARCHAR(50) NOT NULL
);

CREATE TABLE categoria_produto (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(80) NOT NULL,
    tipo    VARCHAR(20) NOT NULL CHECK (tipo IN ('insumo','produto_final','embalagem','revenda'))
);

CREATE TABLE produto (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(30) UNIQUE, -- código interno / código de barras
    nome                VARCHAR(150) NOT NULL,
    categoria_id        INTEGER NOT NULL REFERENCES categoria_produto(id),
    tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('insumo','produto_final','embalagem','revenda')),
    unidade_medida_id   INTEGER NOT NULL REFERENCES unidade_medida(id),
    controla_estoque    BOOLEAN NOT NULL DEFAULT TRUE,
    estoque_minimo      NUMERIC(12,3) DEFAULT 0,
    estoque_atual       NUMERIC(12,3) NOT NULL DEFAULT 0,
    preco_custo_medio   NUMERIC(12,4) DEFAULT 0, -- calculado por média ponderada nas entradas
    preco_venda         NUMERIC(12,2), -- só aplicável a produto_final / revenda
    ativo               BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em           TIMESTAMP NOT NULL DEFAULT now()
);

-- Ficha técnica: define quais insumos (e em que quantidade) compõem um produto final
-- Ex: "Espetinho de Carne" consome 0,150 kg de carne + 1 un de espeto (embalagem)
CREATE TABLE ficha_tecnica (
    id                  SERIAL PRIMARY KEY,
    produto_final_id    INTEGER NOT NULL REFERENCES produto(id),
    insumo_id           INTEGER NOT NULL REFERENCES produto(id),
    quantidade          NUMERIC(12,4) NOT NULL, -- quantidade do insumo por unidade do produto final
    UNIQUE (produto_final_id, insumo_id)
);

-- Toda entrada/saída de estoque passa por aqui (auditoria completa)
CREATE TABLE movimentacao_estoque (
    id              SERIAL PRIMARY KEY,
    produto_id      INTEGER NOT NULL REFERENCES produto(id),
    tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada_compra','saida_venda','ajuste_positivo','ajuste_negativo','producao_consumo','producao_geracao','perda')),
    quantidade      NUMERIC(12,3) NOT NULL, -- sempre positivo; o "tipo" define o sinal
    saldo_anterior  NUMERIC(12,3) NOT NULL,
    saldo_atual     NUMERIC(12,3) NOT NULL,
    origem_tipo     VARCHAR(30), -- 'nota_fiscal_entrada', 'venda', 'ajuste_manual'
    origem_id       INTEGER,     -- id do registro de origem (ex: venda_id)
    usuario_id      INTEGER REFERENCES usuario(id),
    observacao      TEXT,
    criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimentacao_produto ON movimentacao_estoque (produto_id, criado_em);


-- =====================================================================
-- 4. FORNECEDORES / COMPRAS / NOTA FISCAL DE ENTRADA
-- =====================================================================

CREATE TABLE fornecedor (
    id              SERIAL PRIMARY KEY,
    razao_social    VARCHAR(150) NOT NULL,
    nome_fantasia   VARCHAR(150),
    cnpj_cpf        VARCHAR(18) UNIQUE NOT NULL,
    inscricao_estadual VARCHAR(20),
    telefone        VARCHAR(20),
    email           VARCHAR(150),
    endereco        VARCHAR(255),
    contato_nome    VARCHAR(100),
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE nota_fiscal_entrada (
    id                  SERIAL PRIMARY KEY,
    fornecedor_id       INTEGER NOT NULL REFERENCES fornecedor(id),
    numero              VARCHAR(20) NOT NULL,
    serie               VARCHAR(10),
    chave_acesso        CHAR(44) UNIQUE, -- chave da NF-e, se importada via XML
    data_emissao        DATE NOT NULL,
    data_entrada         DATE NOT NULL DEFAULT CURRENT_DATE,
    valor_produtos      NUMERIC(12,2) NOT NULL,
    valor_frete         NUMERIC(12,2) DEFAULT 0,
    valor_desconto      NUMERIC(12,2) DEFAULT 0,
    valor_total         NUMERIC(12,2) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'lancada'
                        CHECK (status IN ('lancada','conferida','cancelada')),
    xml_url             VARCHAR(255), -- caminho/armazenamento do XML original
    usuario_id          INTEGER REFERENCES usuario(id),
    criado_em           TIMESTAMP NOT NULL DEFAULT now(),
    UNIQUE (fornecedor_id, numero, serie)
);

CREATE TABLE nota_fiscal_entrada_item (
    id                      SERIAL PRIMARY KEY,
    nota_fiscal_entrada_id  INTEGER NOT NULL REFERENCES nota_fiscal_entrada(id) ON DELETE CASCADE,
    produto_id              INTEGER NOT NULL REFERENCES produto(id),
    quantidade              NUMERIC(12,3) NOT NULL,
    valor_unitario          NUMERIC(12,4) NOT NULL,
    valor_total             NUMERIC(12,2) NOT NULL,
    lote                    VARCHAR(50),
    data_validade           DATE
);


-- =====================================================================
-- 5. CLIENTES
-- =====================================================================

CREATE TABLE cliente (
    id              SERIAL PRIMARY KEY,
    nome            VARCHAR(150) NOT NULL,
    cpf             CHAR(11) UNIQUE,
    telefone        VARCHAR(20),
    email           VARCHAR(150),
    endereco        VARCHAR(255), -- útil se houver delivery
    data_nascimento DATE,
    criado_em       TIMESTAMP NOT NULL DEFAULT now()
);


-- =====================================================================
-- 6. PDV / VENDAS — com suporte a vendas simultâneas no mesmo terminal
-- =====================================================================
-- Conceito-chave: cada venda é um registro independente com status próprio.
-- O operador pode ter N vendas com status 'aberta' ao mesmo tempo no mesmo
-- terminal/computador (cada uma representada como uma "aba" na interface).
-- A baixa de estoque e o lançamento financeiro só ocorrem na finalização
-- de CADA venda individualmente — não há bloqueio entre vendas paralelas.

CREATE TABLE forma_pagamento (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(40) NOT NULL,  -- Dinheiro, Cartão Crédito, Cartão Débito, Pix
    tipo    VARCHAR(20) NOT NULL CHECK (tipo IN ('dinheiro','credito','debito','pix','fiado'))
);

CREATE TABLE terminal_pdv (
    id              SERIAL PRIMARY KEY,
    identificador   VARCHAR(50) UNIQUE NOT NULL, -- ex: "PDV-01"
    descricao       VARCHAR(100)
);

-- Sessão de caixa (abertura/fechamento) — criada aqui pois venda a referencia
CREATE TABLE caixa (
    id                          SERIAL PRIMARY KEY,
    usuario_abertura_id         INTEGER NOT NULL REFERENCES usuario(id),
    usuario_fechamento_id       INTEGER REFERENCES usuario(id),
    valor_abertura              NUMERIC(12,2) NOT NULL DEFAULT 0,
    valor_fechamento_informado  NUMERIC(12,2),  -- valor contado fisicamente
    valor_fechamento_sistema    NUMERIC(12,2),  -- valor calculado pelo sistema
    diferenca                   NUMERIC(12,2),  -- informado - sistema (sobra/falta)
    data_abertura                TIMESTAMP NOT NULL DEFAULT now(),
    data_fechamento               TIMESTAMP,
    status                       VARCHAR(20) NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','fechado'))
);

CREATE TABLE venda (
    id                  SERIAL PRIMARY KEY,
    numero              SERIAL, -- número sequencial visível ao cliente (cupom)
    terminal_id         INTEGER REFERENCES terminal_pdv(id),
    caixa_id            INTEGER REFERENCES caixa(id),
    cliente_id          INTEGER REFERENCES cliente(id), -- opcional, venda pode ser sem cliente identificado
    operador_id         INTEGER NOT NULL REFERENCES usuario(id),
    aba_rotulo          VARCHAR(30), -- rótulo da aba na tela do operador, ex: "Cliente balcão", "Fila 2"

    status              VARCHAR(20) NOT NULL DEFAULT 'aberta'
                        CHECK (status IN ('aberta','em_espera','aguardando_pagamento','finalizada','cancelada')),
    -- aberta               -> carrinho sendo montado ativamente pelo operador
    -- em_espera            -> operador trocou de aba; cliente ausente (foi buscar carteira etc.)
    -- aguardando_pagamento -> itens fechados, aguardando confirmação da forma de pagamento
    -- finalizada           -> venda concluída, estoque baixado, caixa lançado
    -- cancelada            -> venda abortada, nenhum efeito em estoque/caixa

    subtotal            NUMERIC(12,2) NOT NULL DEFAULT 0,
    desconto             NUMERIC(12,2) NOT NULL DEFAULT 0,
    total                NUMERIC(12,2) NOT NULL DEFAULT 0,

    criado_em           TIMESTAMP NOT NULL DEFAULT now(),
    atualizado_em       TIMESTAMP NOT NULL DEFAULT now(), -- atualizado a cada alteração do carrinho
    finalizado_em       TIMESTAMP
);

CREATE INDEX idx_venda_status_terminal ON venda (terminal_id, status);

CREATE TABLE venda_item (
    id              SERIAL PRIMARY KEY,
    venda_id        INTEGER NOT NULL REFERENCES venda(id) ON DELETE CASCADE,
    produto_id      INTEGER NOT NULL REFERENCES produto(id),
    quantidade      NUMERIC(12,3) NOT NULL,
    preco_unitario  NUMERIC(12,2) NOT NULL, -- preço no momento da venda (histórico, não referencia produto.preco_venda)
    desconto        NUMERIC(12,2) NOT NULL DEFAULT 0,
    subtotal        NUMERIC(12,2) NOT NULL,
    observacao      VARCHAR(200) -- ex: "sem cebola", "ponto da carne"
);

CREATE TABLE venda_pagamento (
    id                  SERIAL PRIMARY KEY,
    venda_id            INTEGER NOT NULL REFERENCES venda(id) ON DELETE CASCADE,
    forma_pagamento_id  INTEGER NOT NULL REFERENCES forma_pagamento(id),
    valor               NUMERIC(12,2) NOT NULL,
    troco               NUMERIC(12,2) DEFAULT 0,
    status              VARCHAR(20) NOT NULL DEFAULT 'confirmado' CHECK (status IN ('pendente','confirmado','estornado')),
    autorizacao_id      VARCHAR(100), -- retorno da maquininha/adquirente, se integrado
    criado_em           TIMESTAMP NOT NULL DEFAULT now()
);
-- Uma venda pode ter mais de um pagamento (ex: parte no cartão + parte em dinheiro)

CREATE TABLE movimentacao_caixa (
    id                  SERIAL PRIMARY KEY,
    caixa_id            INTEGER NOT NULL REFERENCES caixa(id),
    tipo                VARCHAR(20) NOT NULL CHECK (tipo IN ('venda','sangria','suprimento','estorno')),
    forma_pagamento_id  INTEGER REFERENCES forma_pagamento(id),
    valor               NUMERIC(12,2) NOT NULL,
    origem_tipo         VARCHAR(30), -- 'venda', 'sangria_manual'
    origem_id           INTEGER,
    usuario_id          INTEGER REFERENCES usuario(id),
    observacao          TEXT,
    criado_em           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE nfce (
    id              SERIAL PRIMARY KEY,
    venda_id        INTEGER UNIQUE NOT NULL REFERENCES venda(id),
    chave_acesso    CHAR(44) UNIQUE,
    numero          INTEGER,
    serie           INTEGER,
    protocolo_autorizacao VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','autorizada','rejeitada','cancelada','contingencia')),
    xml_url         VARCHAR(255),
    danfe_url       VARCHAR(255),
    data_emissao     TIMESTAMP,
    mensagem_sefaz   TEXT
);


-- =====================================================================
-- 7. FINANCEIRO
-- =====================================================================

CREATE TABLE categoria_financeira (
    id      SERIAL PRIMARY KEY,
    nome    VARCHAR(80) NOT NULL,     -- ex: Aluguel, Energia, Insumos, Salários, Vendas
    tipo    VARCHAR(20) NOT NULL CHECK (tipo IN ('custo_fixo','custo_variavel','receita'))
);

CREATE TABLE conta_pagar (
    id                      SERIAL PRIMARY KEY,
    fornecedor_id           INTEGER REFERENCES fornecedor(id),
    funcionario_id          INTEGER REFERENCES funcionario(id), -- para folha de pagamento, se lançada aqui
    categoria_id            INTEGER NOT NULL REFERENCES categoria_financeira(id),
    nota_fiscal_entrada_id  INTEGER REFERENCES nota_fiscal_entrada(id),
    descricao               VARCHAR(200) NOT NULL,
    valor                   NUMERIC(12,2) NOT NULL,
    data_vencimento         DATE NOT NULL,
    data_pagamento          DATE,
    status                  VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','paga','atrasada','cancelada')),
    recorrente              BOOLEAN NOT NULL DEFAULT FALSE, -- true para custos fixos mensais recorrentes
    criado_em               TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE conta_receber (
    id                  SERIAL PRIMARY KEY,
    cliente_id          INTEGER REFERENCES cliente(id),
    venda_id            INTEGER REFERENCES venda(id), -- ex: venda "fiado"
    descricao           VARCHAR(200) NOT NULL,
    valor               NUMERIC(12,2) NOT NULL,
    data_vencimento     DATE NOT NULL,
    data_recebimento    DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','recebida','atrasada','cancelada')),
    criado_em           TIMESTAMP NOT NULL DEFAULT now()
);


-- =====================================================================
-- REGRAS DE NEGÓCIO IMPORTANTES (implementar na aplicação, não só no BD)
-- =====================================================================
-- 1. Baixa de estoque só ocorre quando venda.status muda para 'finalizada'.
--    Nesse momento: para cada venda_item, se o produto tiver ficha_tecnica,
--    dar baixa nos insumos (produto composto); senão, dar baixa direta no
--    próprio produto. Cada baixa gera um registro em movimentacao_estoque.
--
-- 2. Uma venda 'em_espera' ou 'aberta' NÃO reserva estoque. Isso é proposital
--    e simples de operar; se o negócio evoluir e precisar de reserva de
--    estoque entre carrinhos abertos, criar uma tabela de "reserva_estoque"
--    vinculada à venda_item com expiração automática.
--
-- 3. O mesmo terminal_pdv pode ter várias vendas com status IN
--    ('aberta','em_espera') simultaneamente — a interface deve listar todas
--    as vendas do operador nesse estado como abas navegáveis. Cada aba
--    corresponde a um registro venda_id diferente; não há "trava" de UI
--    nem de banco impedindo abrir uma nova enquanto outra está pendente.
--
-- 4. venda.total = subtotal - desconto = SUM(venda_item.subtotal) - desconto.
--    Recalcular a cada alteração de item (trigger ou lógica de aplicação).
--
-- 5. Ao finalizar: SUM(venda_pagamento.valor) deve ser >= venda.total
--    (troco = diferença, quando forma_pagamento = dinheiro).
--
-- 6. Fechamento de caixa: valor_fechamento_sistema é calculado somando
--    movimentacao_caixa do tipo 'venda' + 'suprimento' - 'sangria' desde a
--    abertura; diferença = valor_fechamento_informado - valor_fechamento_sistema.
-- =====================================================================
