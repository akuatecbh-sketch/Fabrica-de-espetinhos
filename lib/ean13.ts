const PREFIXO_INTERNO = "2";
const CODIGO_EMPRESA = "00001";

export function digitoVerificadorEan13(dozeDigitos: string) {
  let soma = 0;
  for (let i = 0; i < 12; i++) {
    const posicaoDaDireita = 12 - i;
    const peso = posicaoDaDireita % 2 === 1 ? 3 : 1;
    soma += Number(dozeDigitos[i]) * peso;
  }
  return String((10 - (soma % 10)) % 10);
}

export function montarEan13(sequencial: number) {
  const seq = String(sequencial).padStart(6, "0").slice(-6);
  const doze = `${PREFIXO_INTERNO}${CODIGO_EMPRESA}${seq}`;
  return `${doze}${digitoVerificadorEan13(doze)}`;
}

export function validarCodigoBarrasInformado(valor: string) {
  return /^\d{13}$/.test(valor);
}

/** EAN-13 válido: 13 dígitos e dígito verificador correto. */
export function ean13Valido(valor: string) {
  const codigo = valor.trim();
  if (!validarCodigoBarrasInformado(codigo)) return false;
  return digitoVerificadorEan13(codigo.slice(0, 12)) === codigo[12];
}
