export function validarNovaSenha(senha: string, confirmacao?: string) {
  if (senha.length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }
  if (confirmacao != null && senha !== confirmacao) {
    return "A confirmação não confere com a nova senha.";
  }
  return null;
}
