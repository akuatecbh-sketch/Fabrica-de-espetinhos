import Link from "next/link";
import {
  BarChart3,
  Landmark,
  LineChart,
  Package,
  Percent,
  Receipt,
  Scale,
  ShoppingBag,
  Users,
  Warehouse,
} from "lucide-react";
import { exigirAcesso, temAcessoMultiplo } from "@/lib/permissoes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const CARDS = [
  {
    titulo: "Resumo Financeiro",
    descricao: "DRE do mês, receitas e despesas.",
    href: "/financeiro?aba=resumo",
    modulo: "financeiro",
    icone: Landmark,
  },
  {
    titulo: "Faturamento",
    descricao: "Faturamento bruto e líquido do período.",
    href: "/financeiro?aba=faturamento",
    modulo: "financeiro",
    icone: LineChart,
  },
  {
    titulo: "Vendas de Hoje",
    descricao: "Vendas finalizadas no dia, com itens e pagamentos.",
    href: "/vendas/hoje",
    modulo: "vendas",
    icone: Receipt,
  },
  {
    titulo: "Estoque — Visão Geral",
    descricao: "Saldos, mínimo, ideal e excesso.",
    href: "/estoque?aba=geral",
    modulo: "estoque",
    icone: Warehouse,
  },
  {
    titulo: "Movimentações de Estoque",
    descricao: "Entradas, saídas e ajustes.",
    href: "/estoque?aba=movimentacoes",
    modulo: "estoque",
    icone: Package,
  },
  {
    titulo: "Inventário Físico",
    descricao: "Contagem física e conferência de saldo.",
    href: "/relatorios/inventario",
    modulo: "relatorios",
    icone: Scale,
  },
  {
    titulo: "Produtos Mais Vendidos",
    descricao: "Ranking por quantidade e valor no período.",
    href: "/relatorios/produtos-mais-vendidos",
    modulo: "relatorios",
    icone: ShoppingBag,
  },
  {
    titulo: "Margem por Produto",
    descricao: "Receita, custo e margem de cada item.",
    href: "/relatorios/margem",
    modulo: "relatorios",
    icone: BarChart3,
  },
  {
    titulo: "Comissões",
    descricao: "Comissão de vendedor por período.",
    href: "/relatorios/comissoes",
    modulo: "relatorios",
    icone: Percent,
  },
  {
    titulo: "Clientes",
    descricao: "Cadastro e histórico de clientes.",
    href: "/clientes",
    modulo: "clientes",
    icone: Users,
  },
] as const;

export default async function RelatoriosPage() {
  const usuario = await exigirAcesso("relatorios");
  const acessos = await temAcessoMultiplo(usuario.id);
  const cards = CARDS.filter((card) => acessos[card.modulo]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Atalhos para os painéis e relatórios do sistema.
        </p>
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-texto-secundario">
          Nenhum relatório disponível para o seu perfil.
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => {
            const Icone = card.icone;
            return (
              <li key={card.href}>
                <Link
                  href={card.href}
                  className="flex h-full flex-col gap-2 rounded-lg border border-borda bg-superficie p-4 hover:border-zinc-300 hover:bg-zinc-50"
                >
                  <span className="flex items-center gap-2 font-medium text-texto-primario">
                    <Icone className="h-4 w-4 shrink-0 text-brasa" aria-hidden />
                    {card.titulo}
                  </span>
                  <span className="text-sm text-texto-secundario">
                    {card.descricao}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
