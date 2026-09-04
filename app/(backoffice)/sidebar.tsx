"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  CircleHelp,
  ClipboardList,
  ContactRound,
  Folder,
  LayoutDashboard,
  KeyRound,
  Landmark,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Receipt,
  ShieldAlert,
  Store,
  Truck,
  UserCog,
  Users,
  Wallet,
  Tag,
  Warehouse,
  Building2,
} from "lucide-react";
import { rotuloPerfil } from "@/lib/acesso";
import { CHAVE_POR_HREF, type MapaAcessos } from "@/lib/permissoes-rotas";
import { FaqBuscaBotao } from "./faq-busca";
import { sair } from "./sair-action";

const CADASTROS = [
  { href: "/empresa", label: "Empresa", icone: Building2 },
  { href: "/produtos", label: "Produtos", icone: Package },
  { href: "/clientes", label: "Clientes", icone: Users },
  { href: "/fornecedores", label: "Fornecedores", icone: Truck },
  { href: "/usuarios", label: "Usuários", icone: UserCog },
  { href: "/funcionarios", label: "Funcionários", icone: ContactRound },
] as const;

const PRINCIPAIS = [
  { href: "/estoque", label: "Estoque", icone: Warehouse },
  { href: "/etiquetas", label: "Etiquetas", icone: Tag },
  { href: "/compras", label: "Compras", icone: ClipboardList },
  { href: "/pdv", label: "PDV", icone: Store },
  { href: "/caixa", label: "Caixa", icone: Wallet },
  { href: "/vendas/hoje", label: "Vendas", icone: Receipt },
  { href: "/financeiro", label: "Financeiro", icone: Landmark },
  { href: "/saude", label: "Saúde do sistema", icone: ShieldAlert },
] as const;

const ITEM_PERMISSOES = {
  href: "/permissoes",
  label: "Permissões",
  icone: KeyRound,
} as const;

const ITEM_AJUDA = {
  href: "/ajuda/gerenciar",
  label: "Perguntas de ajuda",
  icone: CircleHelp,
} as const;

function rotaAtiva(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function classeItem(ativo: boolean, recolhida: boolean) {
  const base = recolhida
    ? "relative flex items-center gap-2 rounded px-2.5 py-1.5 lg:justify-center lg:p-2 lg:gap-0"
    : "relative flex items-center gap-2 rounded px-2.5 py-1.5";
  return ativo
    ? `${base} bg-laranja-bg text-sm font-medium text-brasa`
    : `${base} text-sm text-texto-secundario hover:bg-fundo-hover hover:text-texto-primario`;
}

function IndicadorAtivo({ ativo }: { ativo: boolean }) {
  if (!ativo) return null;
  return (
    <span
      aria-hidden
      className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-gradiente-brasa"
    />
  );
}

function Tooltip({ texto, visivel }: { texto: string; visivel: boolean }) {
  if (!visivel) return null;
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 hidden -translate-y-1/2 whitespace-nowrap rounded border border-borda bg-superficie px-2 py-1 text-xs font-medium text-texto-primario shadow lg:group-hover:block"
    >
      {texto}
    </span>
  );
}

function ItemLink({
  href,
  label,
  icone: Icone,
  ativo,
  recolhida,
  onNavegar,
}: {
  href: string;
  label: string;
  icone: typeof LayoutDashboard;
  ativo: boolean;
  recolhida: boolean;
  onNavegar?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      onClick={onNavegar}
      className={`group ${classeItem(ativo, recolhida)}`}
    >
      <IndicadorAtivo ativo={ativo} />
      <Icone
        className={`h-4 w-4 shrink-0 ${
          ativo
            ? "text-brasa"
            : "text-texto-secundario group-hover:text-texto-primario"
        }`}
      />
      <span className={recolhida ? "lg:hidden" : undefined}>{label}</span>
      {recolhida ? <Tooltip texto={label} visivel /> : null}
    </Link>
  );
}

function itemPermitido(href: string, acessos: MapaAcessos) {
  const chave = CHAVE_POR_HREF[href];
  if (!chave) return false;
  return Boolean(acessos[chave]);
}

export function Sidebar({
  recolhida,
  menuAberto,
  perfil,
  nome,
  acessos,
  onAlternar,
  onFecharMenu,
}: {
  recolhida: boolean;
  menuAberto: boolean;
  perfil: string;
  nome: string;
  acessos: MapaAcessos;
  onAlternar: () => void;
  onFecharMenu: () => void;
}) {
  const pathname = usePathname();
  const cadastrosVisiveis = CADASTROS.filter((item) =>
    itemPermitido(item.href, acessos),
  );
  const principaisVisiveis = [
    ...PRINCIPAIS.filter((item) => itemPermitido(item.href, acessos)),
    ...(perfil === "super_admin" ? [ITEM_PERMISSOES] : []),
    ...(perfil === "super_admin" || perfil === "gerente" ? [ITEM_AJUDA] : []),
  ];
  const verDashboard = itemPermitido("/", acessos);
  const cadastroAtivo = cadastrosVisiveis.some((item) =>
    rotaAtiva(pathname, item.href),
  );
  const [cadastrosAberto, setCadastrosAberto] = useState(true);
  const [submenuAberto, setSubmenuAberto] = useState(false);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuId = useId();

  useEffect(() => {
    if (cadastroAtivo) setCadastrosAberto(true);
  }, [cadastroAtivo]);

  useEffect(() => {
    setSubmenuAberto(false);
  }, [pathname, recolhida]);

  useEffect(() => {
    if (!submenuAberto) return;

    function fecharFora(evento: MouseEvent) {
      if (
        submenuRef.current &&
        !submenuRef.current.contains(evento.target as Node)
      ) {
        setSubmenuAberto(false);
      }
    }

    function fecharEsc(evento: KeyboardEvent) {
      if (evento.key === "Escape") setSubmenuAberto(false);
    }

    document.addEventListener("mousedown", fecharFora);
    document.addEventListener("keydown", fecharEsc);
    return () => {
      document.removeEventListener("mousedown", fecharFora);
      document.removeEventListener("keydown", fecharEsc);
    };
  }, [submenuAberto]);

  return (
    <aside
      className={`print-ocultar fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-borda bg-superficie transition-transform duration-200 lg:visible lg:pointer-events-auto lg:translate-x-0 lg:transition-[width] ${
        menuAberto
          ? "max-lg:translate-x-0"
          : "max-lg:invisible max-lg:pointer-events-none max-lg:-translate-x-full"
      } ${recolhida ? "lg:w-16 lg:overflow-visible" : "lg:w-56"}`}
    >
      <Link
        href="/"
        aria-label="Fábrica de Espetinhos"
        onClick={onFecharMenu}
        className={`group relative border-b border-borda text-sm font-semibold tracking-tight text-texto-primario ${
          recolhida
            ? "flex items-center px-4 py-4 lg:justify-center lg:px-2"
            : "px-4 py-4"
        }`}
      >
        <span className={recolhida ? "lg:hidden" : undefined}>
          Fábrica de Espetinhos
        </span>
        {recolhida ? (
          <span className="hidden lg:inline">FE</span>
        ) : null}
        <Tooltip texto="Fábrica de Espetinhos" visivel={recolhida} />
      </Link>

      <nav
        className={`flex flex-1 flex-col gap-4 overflow-y-auto p-3 ${
          recolhida ? "lg:overflow-visible lg:p-2" : ""
        }`}
      >
        <div>
          <FaqBuscaBotao recolhida={recolhida} />
        </div>
        {verDashboard ? (
        <ul className="flex flex-col gap-0.5">
          <li>
            <ItemLink
              href="/"
              label="Dashboard"
              icone={LayoutDashboard}
              ativo={rotaAtiva(pathname, "/")}
              recolhida={recolhida}
              onNavegar={onFecharMenu}
            />
          </li>
        </ul>
        ) : null}

        {recolhida && cadastrosVisiveis.length > 0 ? (
          <div ref={submenuRef} className="relative hidden lg:block">
            <button
              type="button"
              aria-label="Cadastros"
              aria-expanded={submenuAberto}
              aria-controls={submenuId}
              onClick={() => setSubmenuAberto((aberto) => !aberto)}
              className={`group w-full ${classeItem(cadastroAtivo, true)}`}
            >
              <IndicadorAtivo ativo={cadastroAtivo} />
              <Folder
                className={`h-4 w-4 shrink-0 ${
                  cadastroAtivo ? "text-brasa" : "text-texto-secundario"
                }`}
              />
              {submenuAberto ? null : <Tooltip texto="Cadastros" visivel />}
            </button>
            {submenuAberto ? (
              <ul
                id={submenuId}
                className="absolute top-0 left-full z-50 ml-2 min-w-44 rounded-md border border-borda bg-superficie p-1 shadow-lg"
              >
                {cadastrosVisiveis.map((item) => {
                  const Icone = item.icone;
                  const ativo = rotaAtiva(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={classeItem(ativo, false)}
                        onClick={onFecharMenu}
                      >
                        <IndicadorAtivo ativo={ativo} />
                        <Icone className="h-4 w-4 shrink-0" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ) : null}

        {cadastrosVisiveis.length > 0 ? (
        <div className={recolhida ? "lg:hidden" : undefined}>
          <button
            type="button"
            onClick={() => setCadastrosAberto((aberto) => !aberto)}
            className="flex w-full items-center justify-between px-2.5 py-1 text-xs font-semibold tracking-wide text-texto-secundario uppercase"
          >
            Cadastros
            <ChevronDown
              className={`h-4 w-4 transition-transform ${cadastrosAberto ? "" : "-rotate-90"}`}
            />
          </button>
          {cadastrosAberto ? (
            <ul className="mt-1 flex flex-col gap-0.5">
              {cadastrosVisiveis.map((item) => {
                const Icone = item.icone;
                return (
                  <li key={item.href}>
                    <ItemLink
                      href={item.href}
                      label={item.label}
                      icone={Icone}
                      ativo={rotaAtiva(pathname, item.href)}
                      recolhida={false}
                      onNavegar={onFecharMenu}
                    />
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        ) : null}

        <ul className="flex flex-col gap-0.5">
          {principaisVisiveis.map((item) => {
            const Icone = item.icone;
            return (
              <li key={item.href}>
                <ItemLink
                  href={item.href}
                  label={item.label}
                  icone={Icone}
                  ativo={rotaAtiva(pathname, item.href)}
                  recolhida={recolhida}
                  onNavegar={onFecharMenu}
                />
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-borda p-2">
        <Link
          href="/minha-conta"
          onClick={onFecharMenu}
          title="Minha conta"
          className={`group mb-1 w-full ${classeItem(rotaAtiva(pathname, "/minha-conta"), recolhida)}`}
        >
          <span className={recolhida ? "lg:hidden" : "min-w-0 truncate"}>
            <span className="block truncate text-sm font-medium text-texto-primario">
              {nome}
            </span>
            <span className="block truncate text-xs text-texto-secundario">
              {rotuloPerfil(perfil)}
            </span>
          </span>
          {recolhida ? (
            <>
              <span className="hidden text-xs font-medium lg:inline">
                {nome.split(" ")[0]?.slice(0, 2).toUpperCase()}
              </span>
              <Tooltip texto={`${nome} · ${rotuloPerfil(perfil)}`} visivel />
            </>
          ) : (
            <span className="ml-auto shrink-0 text-xs text-texto-secundario">
              Conta
            </span>
          )}
        </Link>
        <form action={sair}>
          <button
            type="submit"
            title="Sair"
            aria-label="Sair"
            className={`group w-full ${classeItem(false, recolhida)}`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className={recolhida ? "lg:hidden" : undefined}>Sair</span>
            {recolhida ? <Tooltip texto="Sair" visivel /> : null}
          </button>
        </form>
        <div className="mt-1 hidden lg:block">
          <button
            type="button"
            onClick={onAlternar}
            title={recolhida ? "Expandir menu" : "Recolher menu"}
            aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            className={`group w-full ${classeItem(false, recolhida)}`}
          >
            {recolhida ? (
              <>
                <PanelLeftOpen className="h-4 w-4 shrink-0" />
                <span className="lg:hidden">Expandir</span>
                <Tooltip texto="Expandir menu" visivel />
              </>
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                Recolher
              </>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
