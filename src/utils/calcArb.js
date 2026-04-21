const round1 = v => Math.round(v * 10) / 10;   // stakes
const round2 = v => Math.round(v * 100) / 100; // retornos e lucros

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

// Dadas as odds e as stakes já arredondadas, calcula retornos, lucros e mínimo.
// Todos os cálculos partem dos valores arredondados — sem reequilíbrio.
function buildResult(odds, stakes) {
  const retornos = odds.map((o, i) => round2(o * stakes[i]));
  const total    = round2(stakes.reduce((s, v) => s + v, 0));
  const lucros   = retornos.map(r => round2(r - total));
  const lucroMin = lucros.length ? Math.min(...lucros) : 0;
  return { stakes, retornos, lucros, total, lucroMin };
}

// ── Funções exportadas ────────────────────────────────────────────────────────

/**
 * Calcula stakes de arbitragem com uma entrada base de valor fixo.
 *
 * Lógica:
 *   1. R = odd_base × stakeBase          (retorno alvo)
 *   2. stake_i = round1(R / odd_i)       (para todas as entradas)
 *   3. retorno_i = round2(odd_i × stake_i)
 *   4. total = soma das stakes
 *   5. lucro_i = retorno_i − total
 *   6. lucroMin = min(lucros)
 *
 * Exemplo:
 *   arbPorBase([2.00, 2.10], 0, 100)
 *   → R = 200; stakes = [100.0, 95.2]; total = 195.2
 *   → retornos = [200.00, 199.92]; lucroMin = 4.72
 */
export function arbPorBase(odds, baseIndex, stakeBase) {
  const parsed = parseOdds(odds);
  const stake  = parseFloat(stakeBase) || 0;

  if (
    !parsed.length ||
    parsed.some(o => o <= 1) ||
    stake <= 0 ||
    baseIndex < 0 ||
    baseIndex >= parsed.length
  ) {
    return emptyResult(parsed.length);
  }

  const R      = parsed[baseIndex] * stake;
  const stakes = parsed.map((o, i) =>
    i === baseIndex ? round1(stake) : round1(R / o)
  );

  return buildResult(parsed, stakes);
}

/**
 * Calcula stakes de arbitragem a partir do total a ser investido.
 *
 * Lógica:
 *   1. sumInv = Σ(1 / odd_i)
 *   2. R = total / sumInv                (retorno alvo implícito)
 *   3. stake_i = round1(R / odd_i)
 *   4. mesmo downstream do arbPorBase
 *
 * Exemplo:
 *   arbPorTotal([2.00, 2.10], 195)
 *   → sumInv ≈ 0.976; R ≈ 199.8
 *   → stakes = [99.9, 95.1]; total = 195.0; lucroMin ≈ 4.80
 */
export function arbPorTotal(odds, total) {
  const parsed = parseOdds(odds);
  const T      = parseFloat(total) || 0;

  if (!parsed.length || parsed.some(o => o <= 1) || T <= 0) {
    return emptyResult(parsed.length);
  }

  const sumInv = parsed.reduce((s, o) => s + 1 / o, 0);
  const R      = T / sumInv;
  const stakes = parsed.map(o => round1(R / o));

  return buildResult(parsed, stakes);
}
