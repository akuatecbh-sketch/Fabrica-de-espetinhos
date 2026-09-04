import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AcessoNegadoPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight">Acesso negado</h1>
      <p className="text-sm text-texto-secundario">
        Você não tem permissão para acessar esta página.
      </p>
      <Link
        href="/"
        className="w-fit text-sm font-medium text-texto-primario underline-offset-2 hover:underline"
      >
        Voltar para o dashboard
      </Link>
    </div>
  );
}
