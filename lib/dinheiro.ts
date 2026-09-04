export function arredondarDinheiro(valor: number) {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export function arredondarCusto(valor: number) {
  return Math.round((valor + Number.EPSILON) * 10000) / 10000;
}

export function arredondarQuantidade(valor: number) {
  return Math.round((valor + Number.EPSILON) * 1000) / 1000;
}
