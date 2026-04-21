const round1  = v => Math.round(v * 10) / 10;   // stakes
const round2  = v => Math.round(v * 100) / 100; // retornos e lucros
const PCT_FB  = 0.65;                            // percentual de extração padrão

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyResult(n) {
  const sz = Math.max(1, n);
  return {
    stakes:   Array(sz).fill(0),
    retornos: Array(sz).fill(0),
    lucros:   Array(sz).fill(0),
    total:    0,
    lucroMin: 0,
  };
}

function parseOdds(raw) {
  return (raw || []).map(o => parseFloat(String(o).replace(",", ".")) || 0);
}

/**
 * Monta o resultado final a partir das stakes calculadas.
 *
 * Lucro por cenário:
 *  - Entrada condicional GREEN → sem freebet:
 *      lucro_c = retorno_c − total
 *  - Entrada não-condicional i GREEN → condicional foi RED, freebet gerada:
 *      lucro_i = retorno_i + 0.65×F − total
 */
function buildResult(odds, stakes, condIndex, F) {
  const retornos  = odds.map((o, i) => round2(o * stakes[i]));
  const total     = round2(stakes.reduce((s, v) => s + v, 0));
  const fbEfetivo = round2(PCT_FB * F);

  const lucros = retornos.map((r, i) =>
    i === condIndex
      ? round2(r - total)
      : round2(r + fbEfetivo - total)
  );

  const lucroMin = lucros.length ? Math.min(...lucros) : 0;
  return { stakes, retornos, lucros, total, lucroMin };
}

// ── Função exportada ──────────────────────────────────────────────────────────

/**
 * Calcula stakes de uma operação que gera freebet quando a entrada condicional perde (RED).
 *
 * Regra principal:
 *   odd_c × stake_c = T_outros + 0.65 × F
 *
 * onde T_outros = soma das stakes das entradas não-condicionais.
 *
 * Parâmetros:
 *   odds          — array de odds (todas as entradas)
 *   condIndex     — índice da entrada que gera a freebet se for RED
 *   freebetValor  — valor nominal da freebet (F)
 *   modo          — "base" (stake de referência fixa) | "total" (total a investir)
 *   baseIndex     — índice da entrada base (somente modo "base")
 *   stakeInput    — valor da stake base ou do total (dependendo do modo)
 *
 * Exemplo (modo "base", base = entrada 1 não-condicional):
 *   freebetCalc({ odds: [2.10, 2.00], condIndex: 0, freebetValor: 50,
 *                 modo: "base", baseIndex: 1, stakeInput: 100 })
 *   R_nc = 2.00 × 100 = 200
 *   stake_nc [1] = round1(200 / 2.00) = 100.0
 *   T_outros = 100.0
 *   stake_c  [0] = round1((100.0 + 32.5) / 2.10) = round1(63.1) = 63.1
 *   total = 163.1
 *   lucro_c (GREEN sem FB) = round2(2.10 × 63.1 − 163.1) = round2(132.51 − 163.1) = −30.59
 *   lucro_nc (RED → FB)   = round2(2.00 × 100 + 32.5 − 163.1) = round2(−30.6) = −30.60
 */
export function freebetCalc({
  odds: rawOdds,
  condIndex,
  freebetValor,
  modo,
  baseIndex,
  stakeInput,
}) {
  const odds = parseOdds(rawOdds);
  const F    = parseFloat(freebetValor) || 0;
  const n    = odds.length;

  if (
    n < 2 ||
    odds.some(o => o <= 1) ||
    F <= 0 ||
    condIndex < 0 ||
    condIndex >= n
  ) {
    return emptyResult(n);
  }

  // Índices das entradas não-condicionais e soma dos seus inversos
  const nonCond   = odds.map((_, i) => i).filter(i => i !== condIndex);
  const sumInv_nc = nonCond.reduce((s, i) => s + 1 / odds[i], 0);
  const odd_c     = odds[condIndex];
  const stakes    = Array(n).fill(0);

  // ── Modo total ─────────────────────────────────────────────────────────────
  if (modo === "total") {
    const T = parseFloat(stakeInput) || 0;
    if (T <= 0) return emptyResult(n);

    // Derivado da regra: odd_c × stake_c = (T − stake_c) + 0.65F
    // → stake_c × (odd_c + 1) = T + 0.65F
    stakes[condIndex] = round1((T + PCT_FB * F) / (odd_c + 1));

    const T_outros = T - stakes[condIndex];
    if (T_outros <= 0 || sumInv_nc === 0) return emptyResult(n);

    const R_nc = T_outros / sumInv_nc;
    nonCond.forEach(i => { stakes[i] = round1(R_nc / odds[i]); });

  // ── Modo base ──────────────────────────────────────────────────────────────
  } else {
    const stakeBase = parseFloat(stakeInput) || 0;
    if (stakeBase <= 0) return emptyResult(n);

    if (baseIndex === condIndex) {
      // Base é a entrada condicional → derivar as demais pelo T_outros implícito
      stakes[condIndex] = round1(stakeBase);

      const T_outros = odd_c * stakeBase - PCT_FB * F;
      if (T_outros <= 0 || sumInv_nc === 0) return emptyResult(n);

      const R_nc = T_outros / sumInv_nc;
      nonCond.forEach(i => { stakes[i] = round1(R_nc / odds[i]); });

    } else {
      // Base é uma entrada não-condicional → derivar as outras comuns e depois a condicional
      if (!nonCond.includes(baseIndex)) return emptyResult(n);

      const R_nc = odds[baseIndex] * stakeBase; // retorno alvo das entradas comuns
      nonCond.forEach(i => { stakes[i] = round1(R_nc / odds[i]); });

      const T_outros = nonCond.reduce((s, i) => s + stakes[i], 0);
      stakes[condIndex] = round1((T_outros + PCT_FB * F) / odd_c);
    }
  }

  return buildResult(odds, stakes, condIndex, F);
}
