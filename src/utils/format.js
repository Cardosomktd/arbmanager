export function fmt(v) {
  return "R$ " + (Number(v) || 0).toFixed(2).replace(".", ",");
}

// Número sem prefixo "R$" — usado em campos onde o símbolo já está no label.
export function fmtNum(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",");
}

// Formata odd apenas para exibição — trunca (não arredonda) para no máximo 2 casas decimais,
// sem zeros desnecessários.
// Exemplos: 3 → "3", 3.5 → "3.5", 3.456 → "3.45", 1.899 → "1.89"
// NÃO usar para persistência/cálculo — apenas em JSX display.
export function fmtOdd(v) {
  const n = parseFloat(String(v || "").replace(",", ".")) || 0;
  return parseFloat((Math.floor(n * 100) / 100).toFixed(2)).toString();
}

// Parsa qualquer string de data sem deslocamento de timezone.
// "YYYY-MM-DD" (date-only) → meia-noite LOCAL (não UTC).
// Strings com horário              → delega ao Date() padrão.
// Usar em TODOS os lugares onde datas são comparadas ou agrupadas.
export function parseDateLocal(d) {
  if (!d) return new Date(NaN);
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split("-").map(Number);
    return new Date(y, m - 1, day);  // meia-noite local
  }
  return new Date(d);  // já tem horário → JS usa hora local
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

// Retorna a data de hoje no formato YYYY-MM-DD sem deslocamento de timezone.
// Usar para pré-preencher inputs type="date" — NÃO usar new Date().toISOString().
export function hojeISODateLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
