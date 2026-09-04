import Link from "next/link";
import { formatarDataHora } from "@/lib/format";
import { rotuloPerfil } from "@/lib/acesso";
import { CardRegistro } from "../card-registro";
import { InativarUsuarioButton } from "./inativar-button";
import { RedefinirSenhaButton } from "./redefinir-senha-button";

type UsuarioLista = {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
  senha_provisoria: boolean;
  ultimo_login: Date | null;
  criadoPor: string;
  podeGerenciar: boolean;
};

function AcoesUsuario({ usuario }: { usuario: UsuarioLista }) {
  if (!usuario.podeGerenciar) return null;
  return (
    <>
      <Link
        href={`/usuarios/${usuario.id}/editar`}
        className="inline-flex min-h-11 items-center text-texto-primario underline-offset-2 hover:underline md:min-h-0"
      >
        Editar
      </Link>
      {usuario.ativo ? (
        <InativarUsuarioButton id={usuario.id} nome={usuario.nome} />
      ) : null}
      <RedefinirSenhaButton id={usuario.id} nome={usuario.nome} />
    </>
  );
}

export function ListaUsuarios({
  usuarios,
  vazio,
}: {
  usuarios: UsuarioLista[];
  vazio: string;
}) {
  if (usuarios.length === 0) {
    return <p className="text-sm text-texto-secundario">{vazio}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3 md:hidden">
        {usuarios.map((usuario) => (
          <li key={usuario.id}>
            <CardRegistro acoes={<AcoesUsuario usuario={usuario} />}>
              <p className="font-medium text-texto-primario">{usuario.nome}</p>
              <p className="text-sm text-texto-secundario">{usuario.email}</p>
              <p className="text-sm text-texto-primario">
                {rotuloPerfil(usuario.perfil)}
              </p>
              <p className="text-xs text-texto-secundario">
                {usuario.ativo ? "Ativo" : "Inativo"}
                {usuario.senha_provisoria ? " · Senha provisória" : ""}
              </p>
              <p className="text-xs text-texto-secundario">
                Último login{" "}
                {usuario.ultimo_login
                  ? formatarDataHora(usuario.ultimo_login)
                  : "nunca"}
              </p>
              <p className="text-xs text-texto-secundario">
                Criado por {usuario.criadoPor}
              </p>
            </CardRegistro>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded border border-zinc-200 bg-white md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2 font-medium">Nome</th>
              <th className="px-3 py-2 font-medium">E-mail</th>
              <th className="px-3 py-2 font-medium">Perfil</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Último login</th>
              <th className="px-3 py-2 font-medium">Criado por</th>
              <th className="px-3 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => (
              <tr
                key={usuario.id}
                className="border-b border-zinc-100 last:border-0"
              >
                <td className="px-3 py-2">{usuario.nome}</td>
                <td className="px-3 py-2">{usuario.email}</td>
                <td className="px-3 py-2">{rotuloPerfil(usuario.perfil)}</td>
                <td className="px-3 py-2">
                  {usuario.ativo ? (
                    <span className="rounded bg-verde-sucesso/10 px-2 py-0.5 text-xs font-medium text-verde-sucesso">
                      Ativo
                    </span>
                  ) : (
                    <span className="text-texto-secundario">Inativo</span>
                  )}
                  {usuario.senha_provisoria ? (
                    <span className="ml-2 text-xs text-texto-secundario">
                      Senha provisória
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  {usuario.ultimo_login
                    ? formatarDataHora(usuario.ultimo_login)
                    : "—"}
                </td>
                <td className="px-3 py-2">{usuario.criadoPor}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col items-start gap-2">
                    <AcoesUsuario usuario={usuario} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
