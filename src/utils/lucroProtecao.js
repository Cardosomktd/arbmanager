/**
 * Lucro LÍQUIDO de uma proteção.
 * green  → (odd - 1) × valor   (retorno menos o stake, não o retorno bruto)
 * red    → -valor
 * pendente → 0
 */
export function lucroProtecao(p) {
  const odd   = parseFloat(String(p.odd).replace(",", ".")) || 0;
  const valor = parseFloat(p.valor) || 0;
  if (p.situacao === "green") return (odd - 1) * valor;
  if (p.situacao === "red")   return -valor;
  return 0;
}
