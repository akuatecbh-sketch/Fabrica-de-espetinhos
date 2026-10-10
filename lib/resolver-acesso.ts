export function resolverAcesso(params: {
  perfil: string;
  somenteSuperAdmin: boolean;
  excecao: boolean | undefined;
  perfilPode: boolean | undefined;
}) {
  if (params.somenteSuperAdmin) {
    return params.perfil === "super_admin";
  }
  if (params.excecao !== undefined) return params.excecao;
  return params.perfilPode ?? false;
}
