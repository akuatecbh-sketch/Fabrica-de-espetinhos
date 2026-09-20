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
