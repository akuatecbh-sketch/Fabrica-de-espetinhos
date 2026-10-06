import { prisma } from "@/lib/prisma";

export type RegistroAuditoria = {
  usuarioId: number | null;
  acao: string;
  entidadeTipo: string;
  entidadeId?: number | null;
  valorAnterior?: unknown;
  valorNovo?: unknown;
};

export async function registrarAuditoria(params: RegistroAuditoria) {
  try {
    await prisma.log_auditoria.create({
      data: {
        usuario_id: params.usuarioId,
        acao: params.acao.slice(0, 60),
        entidade_tipo: params.entidadeTipo.slice(0, 40),
        entidade_id: params.entidadeId ?? null,
        valor_anterior:
          params.valorAnterior === undefined
            ? undefined
            : (params.valorAnterior as object),
        valor_novo:
          params.valorNovo === undefined
            ? undefined
            : (params.valorNovo as object),
      },
    });
  } catch (erro) {
    console.error("Falha ao registrar auditoria", erro);
  }
}

function motivoDoValor(valorNovo: unknown) {
  if (valorNovo && typeof valorNovo === "object" && "motivo" in valorNovo) {
    return String((valorNovo as { motivo: unknown }).motivo ?? "");
  }
  return "";
}

export function rotuloAcaoAuditoria(
  acao: string,
  valorNovo?: unknown,
  entidadeId?: number | null,
) {
  if (acao === "login.falha") {
    const motivo = motivoDoValor(valorNovo);
    if (motivo === "senha_incorreta") return "Falha de login: senha incorreta";
    if (motivo === "inativo") return "Falha de login: usuário inativo";
    if (motivo === "usuario_nao_encontrado") {
      return "Falha de login: usuário não encontrado";
    }
    if (motivo === "erro_banco") return "Falha de login: serviço indisponível";
    return "Falha de login";
  }
  if (acao === "permissao_perfil.alterar") return "Alteração de permissão do perfil";
  if (acao === "permissao_usuario.alterar") {
    return "Alteração de permissão do usuário";
  }
  if (acao === "usuario.criar") return "Usuário criado";
  if (acao === "usuario.alterar_perfil") return "Alteração de perfil do usuário";
  if (acao === "produto.atualizar_preco") return "Atualização de preço do produto";
  if (acao === "producao.criar") {
    const n = Number(entidadeId ?? 0);
    const rotulo = Number.isInteger(n) && n > 0 ? String(n) : "?";
    return `Produção #${rotulo} registrada`;
  }
  if (acao === "producao.cancelar") {
    const motivo = motivoDoValor(valorNovo);
    const n = Number(entidadeId ?? 0);
    const rotulo = Number.isInteger(n) && n > 0 ? String(n) : "?";
    return motivo
      ? `Produção #${rotulo} cancelada: ${motivo}`
      : `Produção #${rotulo} cancelada`;
  }
  if (acao === "venda.cancelar") {
    const motivo = motivoDoValor(valorNovo);
    let numero: unknown;
    if (valorNovo && typeof valorNovo === "object" && "numero" in valorNovo) {
      numero = (valorNovo as { numero: unknown }).numero;
    }
    const n = Number(numero ?? entidadeId ?? 0);
    const rotulo = Number.isInteger(n) && n > 0 ? String(n) : "?";
    return motivo
      ? `Venda #${rotulo} cancelada: ${motivo}`
      : `Venda #${rotulo} cancelada`;
  }
  return acao;
}
