export function calcRetorno(e) {
  const odd = parseFloat(String(e.odd).replace(",", ".")) || 0;
  const valor = parseFloat(e.valor) || 0;
  if (e.tipo === "freebet") return odd * valor - valor;
  return odd * valor;
}

// Retorna true se a entrada pode ser agrupada com outras do mesmo resultado.
// Critérios: tipo normal, sem múltipla, sem descrição de múltipla.
function isAgrupavel(e) {
  return (
    e.tipo === "normal" &&
    !e.multipla &&
    !(e.multiplaDesc && e.multiplaDesc.trim())
  );
}

// Chave de agrupamento: resultado normalizado (trim + lowercase).
// Usa entradaDisplay quando disponível (pós-save); cai para entrada como fallback.
function chaveResultado(e) {
  return (e.entradaDisplay || e.entrada || "").trim().toLowerCase();
}

export function calcLucroMinOp(op) {
  const ents = op.entradas || [];

  const totalNormal = ents
    .filter(e => e.tipo === "normal")
    .reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);

  // Separa entradas agrupáveis das independentes
  const agrupavel   = ents.filter(isAgrupavel);
  const independente = ents.filter(e => !isAgrupavel(e));

  // Agrupa as agrupáveis por resultado normalizado
  const grupos = new Map();
  for (const e of agrupavel) {
    const chave = chaveResultado(e);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(e);
  }

  // Retorno de cada grupo = soma dos retornos individuais de suas entradas
  // Retorno de cada independente = retorno individual normal
  const retornos = [
    ...[...grupos.values()].map(g => g.reduce((s, e) => s + calcRetorno(e), 0)),
    ...independente.map(e => calcRetorno(e)),
  ];

  const minRet = retornos.length ? Math.min(...retornos) : 0;
  return minRet - totalNormal;
}

export function calcLucroRealOp(op) {
  const ents = op.entradas || [];
  const totalGreen = ents
    .filter(e => e.situacao === "green")
    .reduce((s, e) => s + calcRetorno(e), 0);
  const totalNormal = ents
    .filter(e => e.tipo === "normal")
    .reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
  return totalGreen - totalNormal;
}

export function lucroEfetivoOp(op) {
  const pendente = (op.entradas || []).every(e => e.situacao === "pendente");
  return pendente ? calcLucroMinOp(op) : calcLucroRealOp(op);
}
