import Link from "next/link";
import type { ReactNode } from "react";
import {
  ContactRound,
  Landmark,
  Package,
  ShoppingBag,
  Store,
  Wallet,
} from "lucide-react";
import { obterDadosDashboard } from "@/lib/dashboard";
import { temAcessoMultiplo } from "@/lib/permissoes";
import { obterUsuarioSessao } from "@/lib/sessao";
import { ContagemValor } from "./contagem-valor";
import { DashboardGraficos } from "./dashboard-graficos";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const KPI = {
  vendas: {
    fundo: "bg-[#16A34A]",
    pulso: "pulso-kpi-verde",
    icone: Store,
  },
  caixa: {
    fundo: "bg-[#3B82F6]",
    pulso: "pulso-kpi-azul",
    icone: Wallet,
  },
  pagar: {
    fundo: "bg-[#EF4444]",
    pulso: "",
    icone: Landmark,
  },
  receber: {
    fundo: "bg-[#7C3AED]",
    pulso: "",
    icone: Landmark,
  },
  estoque: {
    fundo: "bg-[#F97316]",
    pulso: "pulso-kpi-laranja",
    icone: Package,
  },
  pedidos: {
    fundo: "bg-[#D97706]",
    pulso: "pulso-kpi-laranja",
    icone: ShoppingBag,
  },
} as const;

type KpiModulo = keyof typeof KPI;

function KpiCard({
  href,
  modulo,
  valor,
  rotulo,
  tipo = "moeda",
  vivo = false,
}: {
  href: string;
  modulo: KpiModulo;
  valor: number;
  rotulo: string;
  tipo?: "moeda" | "inteiro";
  vivo?: boolean;
}) {
  const tema = KPI[modulo];
  const Icone = tema.icone;
  const pulso = vivo && tema.pulso ? tema.pulso : "";
  return (
    <Link
      href={href}
      className={`flex h-full flex-col gap-3 rounded-xl p-4 text-white shadow-[0_4px_14px_rgb(15_23_42_/_0.14)] hover:brightness-105 ${tema.fundo} ${pulso}`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
        <Icone className="h-4 w-4 text-white" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col items-start">
        <ContagemValor
          valor={valor}
          tipo={tipo}
          className="text-2xl font-bold leading-none text-white"
        />
        <span className="mt-1.5 text-sm font-normal leading-snug text-white/90">
          {rotulo}
        </span>
      </div>
      <span className="mt-auto pt-1 text-sm font-medium text-white">
        Ver detalhes →
      </span>
    </Link>
  );
}

const MODULOS = {
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

export default async function DashboardPage() {
  const [usuario, dados] = await Promise.all([
    obterUsuarioSessao(),
    obterDadosDashboard(),
  ]);
  const acessos = await temAcessoMultiplo(usuario.id);
  const caixaAberto = dados.caixa != null;
  const verCaixa = Boolean(acessos.caixa);
  const verCadastro = Boolean(acessos.produtos);
  const verFinanceiro = Boolean(acessos.financeiro);
  const verRh = Boolean(acessos.funcionarios);
  const verVendas = Boolean(acessos.vendas);
  const verPedidos = Boolean(acessos.pedidos);

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
          <KpiCard
            href="/caixa"
            modulo="caixa"
            valor={
              caixaAberto && dados.caixa
                ? Number(dados.caixa.valor_abertura)
                : 0
            }
            rotulo="Valor de abertura"
            vivo={caixaAberto}
          />
        ) : null}

        {verCadastro ? (
          <KpiCard
            href="/produtos?filtro=estoque-baixo"
            modulo="estoque"
            valor={dados.estoqueBaixo.quantidade}
            tipo="inteiro"
            rotulo={
              dados.estoqueBaixo.quantidade === 1
                ? "Produto abaixo do mínimo"
                : "Produtos abaixo do mínimo"
            }
            vivo={dados.estoqueBaixo.quantidade > 0}
          />
        ) : null}

        {verPedidos ? (
          <KpiCard
            href="/pedidos?filtro=enviado"
            modulo="pedidos"
            valor={dados.pedidosEnviados}
            tipo="inteiro"
            rotulo={
              dados.pedidosEnviados === 1
                ? "Pedido aguardando resposta do cliente"
                : "Pedidos aguardando resposta do cliente"
            }
            vivo={dados.pedidosEnviados > 0}
          />
        ) : null}

        {verFinanceiro ? (
          <>
            <KpiCard
              href="/financeiro?aba=pagar&filtro=pendentes"
              modulo="pagar"
              valor={Number(dados.contasPagar.totalAberto)}
              rotulo="Contas a pagar"
            />
            <KpiCard
              href="/financeiro?aba=receber&filtro=pendentes"
              modulo="receber"
              valor={Number(dados.contasReceber.totalAberto)}
              rotulo="Contas a receber"
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
          <KpiCard
            href="/vendas/hoje"
            modulo="vendas"
            valor={Number(dados.vendasHoje.faturamentoBruto)}
            rotulo="Faturamento bruto"
          />
        ) : null}
      </div>

      <DashboardGraficos
        faturamento7Dias={dados.faturamento7Dias}
        vendasPorForma={dados.vendasPorForma}
      />
    </div>
  );
}
