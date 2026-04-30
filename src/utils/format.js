export function fmt(v) {
  return "R$ " + (Number(v) || 0).toFixed(2).replace(".", ",");
}

// Número sem prefixo "R$" — usado em campos onde o símbolo já está no label.
export function fmtNum(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",");
}

// Formata odd apenas para exibição — sempre 2 casas decimais.
// Exemplos: 4 → "4.00", 1.5 → "1.50", 1.8519 → "1.85", 10 → "10.00"
// NÃO usar para persistência/cálculo — apenas em JSX display.
export function fmtOdd(v) {
  const n = parseFloat(v) || 0;
  return n.toFixed(2);
}

export function fmtDate(dt) {
  if (!dt) return "";
  // Strings sem horário ("2024-01-15") são tratadas como data local
  // para evitar o deslocamento de timezone do Date()
  if (/^\d{4}-\d{2}-\d{2}$/.test(dt)) {
    const [y, m, d] = dt.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
  }
  const d = new Date(dt);
  return (
    d.toLocaleDateString("pt-BR") +
    " " +
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}

export function getCasaNome(casas, id) {
  return casas.find(c => c.id === id)?.nome || id;
}
