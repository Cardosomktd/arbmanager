export function lucroAvulsa(a) {
  if (a.situacao === "green")
    return (parseFloat(String(a.odd).replace(",", ".")) || 0) * (parseFloat(a.valor) || 0) - (parseFloat(a.valor) || 0);
  if (a.situacao === "red")
    return -(parseFloat(a.valor) || 0);
  return 0;
}
