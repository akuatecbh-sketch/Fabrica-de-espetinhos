import { MinhaContaForm } from "./minha-conta-form";

export const dynamic = "force-dynamic";

export default function MinhaContaPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Minha conta</h1>
        <p className="mt-1 text-sm text-texto-secundario">
          Troque sua senha a qualquer momento.
        </p>
      </div>
      <MinhaContaForm />
    </div>
  );
}
