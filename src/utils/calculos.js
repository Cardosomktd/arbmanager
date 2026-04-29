export function calcRetorno(e) {
  const odd    = parseFloat(String(e.odd || "").replace(",", ".")) || 0;
  const valor  = parseFloat(e.valor)    || 0;
  const comm   = parseFloat(e.comissao) / 100 || 0;   // ausente → NaN/100 → 0

  // Freebet: retorno não inclui a stake (stake pertence à casa)
  if (e.tipo === "freebet") return odd * valor - valor;

  // Exchange Back: comissão incide sobre o lucro bruto, não sobre o retorno total
  //   lucro_bruto   = valor × (odd - 1)
  //   lucro_liquido = lucro_bruto × (1 - comm)
  //   retorno       = valor + lucro_liquido
  if (e.tipo === "exchange_back") {
    const lucro = valor * (odd - 1) * (1 - comm);
    return valor + lucro;
  }

  // Exchange Lay: retorno representa o cenário positivo (lay vence, evento não acontece)
  //   retorno = lay_stake × (1 - comm)
  //   (perda por responsabilidade tratada futuramente em calcLucroRealOp)
  if (e.tipo === "exchange_lay") {
    return valor * (1 - comm);
  }

  // Normal / bonus: retorno bruto completo
  return odd * valor;
}

// Retorna true se a entrada pode ser agrupada com outras do mesmo resultado.
// Critérios: sem múltipla, sem descrição de múltipla.
// Tipo (normal/freebet/bonus) não impede o agrupamento — entradas do mesmo
// resultado sempre representam o mesmo cenário vencedor, independente do tipo.
// O cálculo de retorno por tipo já é tratado individualmente em calcRetorno.
function isAgrupavel(e) {
  return (
    !e.multipla &&
    !(e.multiplaDesc && e.multiplaDesc.trim())
  );
}

// Chave de agrupamento: resultado normalizado (trim + lowercase).
// Usa entradaDisplay quando disponível (pós-save); cai para entrada como fallback.
// Exchange Lay: remove o sufixo " lay" do final para que "Empate Lay" e "Empate"
// gerem a mesma chave — garantindo que back e lay sejam agrupados no mesmo cenário.
function chaveResultado(e) {
  let chave = (e.entradaDisplay || e.entrada || "").trim().toLowerCase();
  if (e.tipo === "exchange_lay") {
    chave = chave.replace(/\s+lay$/, "").trim();
  }
  return chave;
}

/**
 * Mapeia resultado principal → retorno efetivo, aplicando a regra correta de
 * agrupamento para entradas com múltipla.
 *
 * Regras:
 * - Simples (isAgrupavel):  agrupadas por resultado principal — retornos somados.
 * - Múltiplas (!isAgrupavel): agrupadas por (principal + secundário).
 *   Para cada resultado principal, considera apenas o MENOR grupo de múltipla.
 *
 * Exemplo:
 *   Entrada 1: Flamengo + Empate = 100   →  grupo "flamengo|empate" = 100
 *   Entrada 2: Flamengo + Empate = 80    →  grupo "flamengo|empate" = 180
 *   Entrada 3: Flamengo + Vasco  = 70    →  grupo "flamengo|vasco"  =  70
 *   min dos grupos de "flamengo" = 70  →  retorno efetivo para Flamengo = 70
 *
 * Retorna: Map<chaveResultado, retornoEfetivo>
 */
export function retornosPorResultado(entries) {
  const simples   = entries.filter(isAgrupavel);
  const multiplas = entries.filter(e => !isAgrupavel(e));

  // 1. Simples: somar por resultado principal
  const simplePorPri = new Map();
  for (const e of simples) {
    const k = chaveResultado(e);
    simplePorPri.set(k, (simplePorPri.get(k) ?? 0) + calcRetorno(e));
  }

  // 2. Múltiplas: somar por grupo composto (principal|secundário)
  const gruposM = new Map();
  for (const e of multiplas) {
    const pri = chaveResultado(e);
    const sec = (e.multiplaDesc || "").trim().toLowerCase();
    const k   = `${pri}|${sec}`;
    gruposM.set(k, (gruposM.get(k) ?? 0) + calcRetorno(e));
  }

  // 3. Para cada resultado principal, manter apenas o MENOR grupo de múltipla
  const minMulPorPri = new Map();
  for (const [k, soma] of gruposM) {
    const pri = k.split("|")[0];
    const cur = minMulPorPri.get(pri);
    minMulPorPri.set(pri, cur === undefined ? soma : Math.min(cur, soma));
  }

  // 4. Combinar: simples + min(múltiplas) por resultado principal
  const todasChaves = new Set([...simplePorPri.keys(), ...minMulPorPri.keys()]);
  const mapa = new Map();
  for (const k of todasChaves) {
    mapa.set(k, (simplePorPri.get(k) ?? 0) + (minMulPorPri.get(k) ?? 0));
  }
  return mapa;
}

// Retorna true se a condição de geração de benefício (freebet ou cashback) foi atingida.
function condicaoAtingida(op) {
  if (!op.geraFreebet) return false;
  const { condicao, entradaGatilhoId } = op.geraFreebet;
  const ents = op.entradas || [];
  if (entradaGatilhoId) {
    const g = ents.find(e => e.id === entradaGatilhoId);
    if (!g || g.situacao === "pendente") return false;
    if (condicao === "qualquer") return true;
    return condicao === g.situacao;
  }
  if (!ents.every(e => e.situacao !== "pendente")) return false;
  const temGreen = ents.some(e => e.situacao === "green");
  const temRed   = ents.some(e => e.situacao === "red");
  if (condicao === "qualquer") return true;
  if (condicao === "green")   return temGreen;
  if (condicao === "red")     return temRed && !temGreen;
  return false;
}

export function calcLucroMinOp(op) {
  const ents = op.entradas || [];
  const temExchange = ents.some(e => e.tipo === "exchange_back" || e.tipo === "exchange_lay");

  // Cashback garantido: soma o valor se a condição é "qualquer" (cenário mínimo sempre acontece)
  const cashback = (op.geraFreebet?.tipoBeneficio === "cashback" && op.geraFreebet?.condicao === "qualquer")
    ? (parseFloat(op.geraFreebet.valor) || 0) : 0;

  if (!temExchange) {
    const totalNormal = ents
      .filter(e => e.tipo === "normal")
      .reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);

    // Usa agrupamento unificado: simples por resultado principal,
    // múltiplas por (principal+secundário) — tomando o menor grupo por principal.
    const mapa    = retornosPorResultado(ents);
    const retornos = [...mapa.values()];

    const minRet = retornos.length ? Math.min(...retornos) : 0;
    return minRet - totalNormal + cashback;
  }

  // ── Branch exchange ──────────────────────────────────────────────────────────
  const agrupavel   = ents.filter(isAgrupavel);
  const independente = ents.filter(e => !isAgrupavel(e));

  // Custo fixo: normal e exchange_back sempre pagam a stake;
  // freebet, bonus e exchange_lay não têm custo de saída imediato
  const custoFixo = ents.reduce((s, e) => {
    if (e.tipo === "freebet" || e.tipo === "bonus" || e.tipo === "exchange_lay") return s;
    return s + (parseFloat(e.valor) || 0);
  }, 0);

  // Enumera todos os cenários possíveis (um por chave de resultado agrupável)
  const chaves = [...new Set(agrupavel.map(chaveResultado).filter(Boolean))];

  const cenarios = chaves.map(X => {
    let gain     = 0;
    let custoVar = 0;
    for (const e of agrupavel) {
      const chave = chaveResultado(e);
      if (e.tipo === "exchange_lay") {
        if (chave === X) {
          // Lay sobre X, X acontece → lay perde → paga responsabilidade
          const odd   = parseFloat(String(e.odd || "").replace(",", ".")) || 0;
          const valor = parseFloat(e.valor) || 0;
          custoVar += valor * (odd - 1);
        } else {
          // Lay vence → recebe ganho líquido
          gain += calcRetorno(e);
        }
      } else {
        // Back/normal/freebet: só recebe retorno se o resultado for X
        if (chave === X) gain += calcRetorno(e);
      }
    }
    return gain - custoVar;
  });

  // Cenário "outros": resultado não coberto por nenhuma entrada back/normal
  // → todos os lays agrupáveis vencem (necessário quando back+lay no mesmo resultado)
  const laysAgrupavel = agrupavel.filter(e => e.tipo === "exchange_lay");
  if (laysAgrupavel.length > 0) {
    const gainOther = laysAgrupavel.reduce((s, e) => s + calcRetorno(e), 0);
    cenarios.push(gainOther);
  }

  // Entradas independentes (múltiplas) contribuem individualmente
  const cenariosInd = independente.map(e => calcRetorno(e));

  const todos = [...cenarios, ...cenariosInd];
  if (todos.length === 0) return cashback;

  const minNet = Math.min(...todos);
  return minNet - custoFixo + cashback;
}

export function calcLucroRealOp(op) {
  const ents = op.entradas || [];
  const temExchange = ents.some(e => e.tipo === "exchange_back" || e.tipo === "exchange_lay");

  // Cashback: dinheiro real creditado quando a condição é atingida
  const cashback = (op.geraFreebet?.tipoBeneficio === "cashback" && condicaoAtingida(op))
    ? (parseFloat(op.geraFreebet.valor) || 0) : 0;

  if (!temExchange) {
    const totalGreen = ents
      .filter(e => e.situacao === "green")
      .reduce((s, e) => s + calcRetorno(e), 0);
    const totalNormal = ents
      .filter(e => e.tipo === "normal")
      .reduce((s, e) => s + (parseFloat(e.valor) || 0), 0);
    return totalGreen - totalNormal + cashback;
  }

  // ── Branch exchange ──────────────────────────────────────────────────────────
  // Ganho real: soma dos retornos de todas as entradas green
  const totalGreen = ents
    .filter(e => e.situacao === "green")
    .reduce((s, e) => s + calcRetorno(e), 0);

  // Custo real por entrada resolvida:
  //   normal / exchange_back → stake sempre saiu do saldo
  //   exchange_lay red       → pagou responsabilidade (valor × (odd - 1))
  //   exchange_lay green     → não houve custo de saída (stake fica na conta)
  //   freebet / bonus        → gratuito, sem custo
  const totalCusto = ents.reduce((s, e) => {
    const valor = parseFloat(e.valor) || 0;
    if (e.tipo === "freebet" || e.tipo === "bonus") return s;
    if (e.tipo === "exchange_lay") {
      if (e.situacao === "red") {
        const odd = parseFloat(String(e.odd || "").replace(",", ".")) || 0;
        return s + valor * (odd - 1); // responsabilidade perdida
      }
      return s; // lay green: stake não saiu
    }
    return s + valor; // normal, exchange_back: stake sempre pago
  }, 0);

  return totalGreen - totalCusto + cashback;
}

export function lucroEfetivoOp(op) {
  const ents    = op.entradas || [];
  const pendente = ents.every(e => e.situacao === "pendente");

  // Operação de entrada única (aposta simples sem cobertura):
  // Quando pendente, o valor apostado já saiu da banca — mesmo raciocínio do Bingo.
  // Aplica apenas para tipos normais (exclui exchange e freebet/bonus cujo custo
  // não vem do saldo próprio).
  if (pendente && ents.length === 1) {
    const e    = ents[0];
    const tipo = e.tipo;
    // Exchange: cai para calcLucroMinOp (retorna lucro mínimo do cenário)
    if (tipo === "exchange_back" || tipo === "exchange_lay") {
      /* falls through */
    }
    // Freebet / bônus: stake não é dinheiro próprio → sem impacto no saldo
    else if (tipo === "freebet" || tipo === "bonus") {
      return 0;
    }
    // Normal (dinheiro real): stake comprometida na casa
    else {
      return -(parseFloat(e.valor) || 0);
    }
  }

  return pendente ? calcLucroMinOp(op) : calcLucroRealOp(op);
}
