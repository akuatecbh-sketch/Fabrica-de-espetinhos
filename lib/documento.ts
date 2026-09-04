export function soDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

function todosIguais(digitos: string) {
  return /^(\d)\1+$/.test(digitos);
}

function digitoVerificador(base: string, pesos: number[]) {
  const soma = base.split("").reduce((total, digito, indice) => {
    return total + Number(digito) * pesos[indice];
  }, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

export function validarCpf(valor: string) {
  const digitos = soDigitos(valor);
  if (digitos.length !== 11) return false;
  if (todosIguais(digitos)) return false;
  const dv1 = digitoVerificador(digitos.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = digitoVerificador(
    digitos.slice(0, 9) + String(dv1),
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return digitos === `${digitos.slice(0, 9)}${dv1}${dv2}`;
}

export function validarCnpj(valor: string) {
  const digitos = soDigitos(valor);
  if (digitos.length !== 14) return false;
  if (todosIguais(digitos)) return false;
  const dv1 = digitoVerificador(
    digitos.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  const dv2 = digitoVerificador(
    digitos.slice(0, 12) + String(dv1),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );
  return digitos === `${digitos.slice(0, 12)}${dv1}${dv2}`;
}

export function validarCnpjCpf(valor: string) {
  const digitos = soDigitos(valor);
  if (digitos.length === 11) return validarCpf(digitos);
  if (digitos.length === 14) return validarCnpj(digitos);
  return false;
}

export function validarEmail(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

export function mascaraCpf(valor: string) {
  const digitos = soDigitos(valor).slice(0, 11);
  return digitos
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function mascaraCnpj(valor: string) {
  const digitos = soDigitos(valor).slice(0, 14);
  return digitos
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function mascaraCnpjCpf(valor: string) {
  const digitos = soDigitos(valor).slice(0, 14);
  if (digitos.length <= 11) return mascaraCpf(digitos);
  return mascaraCnpj(digitos);
}

export function mascaraTelefone(valor: string) {
  const digitos = soDigitos(valor).slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  return digitos
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

export function formatarCpf(valor: string | null | undefined) {
  if (!valor) return "—";
  const digitos = soDigitos(valor);
  if (digitos.length !== 11) return valor.trim() || "—";
  return mascaraCpf(digitos);
}

export function formatarCnpjCpf(valor: string | null | undefined) {
  if (!valor) return "—";
  const digitos = soDigitos(valor);
  if (digitos.length === 11) return mascaraCpf(digitos);
  if (digitos.length === 14) return mascaraCnpj(digitos);
  return valor.trim() || "—";
}

export function formatarTelefone(valor: string | null | undefined) {
  if (!valor) return "—";
  const digitos = soDigitos(valor);
  if (digitos.length < 10) return valor.trim() || "—";
  return mascaraTelefone(digitos);
}
