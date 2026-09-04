import Link from "next/link";
import type { ReactNode } from "react";
import { ContactRound, Landmark, Package, Store, Wallet } from "lucide-react";
import { obterDadosDashboard, type ResumoContas } from "@/lib/dashboard";
import { formatarDataHora, formatarPreco, formatarQuantidade } from "@/lib/format";
import { temAcessoMultiplo } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/sessao";
import { ContagemValor } from "./contagem-valor";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MODULOS = {
  caixa: {
    bg: "bg-ambar-bg",
    texto: "text-ambar-texto",
    icone: Wallet,
  },
  estoque: {
    bg: "bg-azul-bg",
    texto: "text-azul-texto",
    icone: Package,
  },
  pagar: {
    bg: "bg-coral-bg",
    texto: "text-coral-texto",
    icone: Landmark,
  },
  receber: {
    bg: "bg-verde-bg",
    texto: "text-verde-texto",
    icone: Landmark,
  },
  vendas: {
    bg: "bg-laranja-bg",
    texto: "text-laranja-texto",
    icone: Store,
  },
  rh: {
    bg: "bg-azul-bg",
    texto: "text-azul-texto",
    icone: ContactRound,
  },
} as const;

type Modulo = keyof typeof MODULOS;

function Card({
  titulo,
  href,
  modulo,
  className = "",
  children,
}: {
  titulo: string;
  href?: string;
  modulo: Modulo;
  className?: string;
  children: ReactNode;
}) {
  const tema = MODULOS[modulo];
  const Icone = tema.icone;
  const classe = `flex flex-col gap-3 rounded-lg border border-borda p-4 ${tema.bg} ${className}`;
  const conteudo = (
    <>
      <h2 className={`flex items-center gap-2 text-sm font-semibold ${tema.texto}`}>
        <Icone className="h-4 w-4 shrink-0" aria-hidden />
        {titulo}
      </h2>
      {children}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={classe}>
        {conteudo}
      </Link>
    );
  }

  return <div className={classe}>{conteudo}</div>;
}

function Linha({
  rotulo,
  valor,
  alerta,
  valorClassName,
}: {
  rotulo: string;
  valor: ReactNode;
  alerta?: boolean;
  valorClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-sm">
      <span className={alerta ? "text-vermelho-erro" : "text-texto-secundario"}>
        {rotulo}
      </span>
      <span
        className={
          alerta
            ? "font-medium text-vermelho-erro"
            : `font-medium ${valorClassName ?? "text-texto-primario"}`
        }
      >
        {valor}
      </span>
    </div>
  );
}

function CardContas({
  titulo,
  href,
  modulo,
  dados,
}: {
  titulo: string;
  href: string;
  modulo: "pagar" | "receber";
  dados: ResumoContas;
}) {
  const tema = MODULOS[modulo];

  if (!dados.temRegistro) {
    return (
      <Card titulo={titulo} href={href} modulo={modulo}>
        <p className="text-sm text-texto-secundario">Nenhum registro</p>
      </Card>
    );
  }

  const atrasadas = dados.qtdAtrasadas > 0;

  return (
    <Card titulo={titulo} href={href} modulo={modulo}>
      <Linha
        rotulo="Em aberto"
        valorClassName={tema.texto}
        valor={
          <ContagemValor
            valor={Number(dados.totalAberto)}
            className={`text-2xl font-semibold ${tema.texto}`}
          />
        }
      />
      <Linha
        rotulo="Vencem em 7 dias"
        valor={
          <span className="font-data text-texto-secundario">
            {dados.qtdProximos7} · {formatarPreco(dados.totalProximos7)}
          </span>
        }
      />
      <Linha
        rotulo="Atrasadas"
        valor={
          <span className="font-data">
            {dados.qtdAtrasadas} · {formatarPreco(dados.totalAtrasadas)}
          </span>
        }
        alerta={atrasadas}
      />
    </Card>
  );
}

export default async function DashboardPage() {
  const [usuario, dados] = await Promise.all([
    obterUsuarioSessao(),
    obterDadosDashboard(),
  ]);
  const acessos = await temAcessoMultiplo(usuario.id);
  const caixaAberto = dados.caixa != null;
  const estoqueBaixo = dados.estoqueBaixo.quantidade > 0;
  const verCaixa = Boolean(acessos.caixa);
  const verCadastro = Boolean(acessos.produtos);
  const verEstoque = Boolean(acessos.estoque);
  const verFinanceiro = Boolean(acessos.financeiro);
  const verRh = Boolean(acessos.funcionarios);
  const verVendas = Boolean(acessos.vendas);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Números do dia, atualizados a cada carregamento da página.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {verCaixa ? (
        <Card titulo="Caixa" href="/caixa" modulo="caixa">
          {caixaAberto && dados.caixa ? (
            <>
              <span className="inline-flex w-fit rounded-full bg-gradiente-brasa px-2 py-0.5 text-xs font-medium text-white pulso-brasa">
                Caixa aberto
              </span>
              <Linha
                rotulo="Abertura"
                valor={formatarDataHora(dados.caixa.data_abertura)}
              />
              <Linha
                rotulo="Valor de abertura"
                valorClassName="text-ambar-texto"
                valor={
                  <span className="font-data text-2xl font-semibold text-ambar-texto">
                    {formatarPreco(dados.caixa.valor_abertura)}
                  </span>
                }
              />
              <span className="mt-1 text-sm text-texto-secundario">
                Ir para o caixa
              </span>
            </>
          ) : (
            <>
              <p className="text-sm text-texto-secundario">
                Nenhum caixa aberto no momento
              </p>
              <span className="mt-1 text-sm font-medium text-ambar-texto">
                Abrir um novo caixa
              </span>
            </>
          )}
        </Card>
        ) : null}

        {verCadastro ? (
        <Card titulo="Estoque baixo" modulo="estoque">
          {estoqueBaixo ? (
            <>
              <p className="text-sm text-texto-secundario">
                <span className="font-data text-2xl font-semibold text-azul-texto">
                  {dados.estoqueBaixo.quantidade}
                </span>{" "}
                {dados.estoqueBaixo.quantidade === 1
                  ? "produto abaixo do mínimo"
                  : "produtos abaixo do mínimo"}
              </p>
              <ul className="flex flex-col gap-2">
                {dados.estoqueBaixo.criticos.map((produto) => (
                  <li
                    key={produto.id}
                    className="flex items-baseline justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0 break-words text-texto-secundario">
                      {produto.nome}
                    </span>
                    <span className="font-data shrink-0 text-texto-secundario">
                      {formatarQuantidade(produto.estoque_atual)} /{" "}
                      {formatarQuantidade(produto.estoque_minimo)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-texto-secundario">Nenhum registro</p>
          )}
          <div className="mt-1 flex flex-wrap gap-3 text-sm">
            <Link
              href="/produtos?filtro=estoque-baixo"
              className="font-medium text-azul-texto underline-offset-2 hover:underline"
            >
              Ver todos
            </Link>
            {verEstoque ? (
              <Link
                href="/estoque?aba=movimentacoes"
                className="text-texto-secundario underline-offset-2 hover:underline"
              >
                Ver movimentações
              </Link>
            ) : null}
          </div>
        </Card>
        ) : null}

        {verFinanceiro ? (
          <>
        <CardContas
          titulo="Contas a pagar"
          href="/financeiro?aba=pagar&filtro=pendentes"
          modulo="pagar"
          dados={dados.contasPagar}
        />
        <CardContas
          titulo="Contas a receber"
          href="/financeiro?aba=receber&filtro=pendentes"
          modulo="receber"
          dados={dados.contasReceber}
        />
          </>
        ) : null}

        {verRh ? (
        <Card titulo="RH" href="/funcionarios" modulo="rh">
          <Linha
            rotulo="Aniversariantes do mês"
            valor={
              <ContagemValor
                valor={dados.rh.aniversariantesMes}
                tipo="inteiro"
                className="text-2xl font-semibold text-azul-texto"
              />
            }
          />
          <Linha
            rotulo="Férias com prazo apertado"
            valor={
              <ContagemValor
                valor={dados.rh.feriasPrazo}
                tipo="inteiro"
                className={`text-2xl font-semibold ${
                  dados.rh.feriasPrazo > 0
                    ? "text-vermelho-erro"
                    : "text-azul-texto"
                }`}
              />
            }
            alerta={dados.rh.feriasPrazo > 0}
          />
        </Card>
        ) : null}

        {verVendas ? (
        <Card titulo="Vendas de hoje" href="/vendas/hoje" modulo="vendas" className="md:col-span-2 lg:col-span-3 xl:col-span-1">
          <Linha
            rotulo="Vendas finalizadas"
            valor={
              <ContagemValor
                valor={dados.vendasHoje.quantidade}
                tipo="inteiro"
                className="text-2xl font-semibold text-laranja-texto"
              />
            }
          />
          <Linha
            rotulo="Faturamento bruto"
            valor={
              <ContagemValor
                valor={Number(dados.vendasHoje.faturamentoBruto)}
                className="text-2xl font-semibold text-laranja-texto"
              />
            }
          />
          <Linha
            rotulo="Faturamento líquido"
            valor={
              <ContagemValor
                valor={Number(dados.vendasHoje.faturamentoLiquido)}
                className="text-2xl font-semibold text-laranja-texto"
              />
            }
          />
        </Card>
        ) : null}
      </div>
    </div>
  );
}
