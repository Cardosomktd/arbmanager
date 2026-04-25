// Resolve o tipo de valor do registro, com retrocompatibilidade:
//   tipoValor presente                  → usa tipoValor
//   freebet: true (formato antigo)      → "freebet"
//   ausente / freebet: false            → "dinheiro_real"
function getTipoValor(a) {
  if (a.tipoValor) return a.tipoValor;
  if (a.freebet === true) return "freebet";
  return "dinheiro_real";
}

export function lucroAvulsa(a) {
  const valor     = parseFloat(a.valor) || 0;
  const tipoValor = getTipoValor(a);

  if (a.situacao === "green") {
    const odd = parseFloat(String(a.odd).replace(",", ".")) || 0;
    // Bônus: stake não é dinheiro próprio → retorno bruto sem desconto
    if (tipoValor === "bonus") return odd * valor;
    // Dinheiro real e freebet: retorno líquido (desconta a stake)
    return odd * valor - valor;
  }

  // pendente / red:
  // freebet e bônus → stake não é dinheiro próprio → sem impacto no saldo
  // dinheiro real   → valor apostado já comprometido
  return (tipoValor === "freebet" || tipoValor === "bonus") ? 0 : -valor;
}
