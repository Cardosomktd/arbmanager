const round1 = v => Math.round(v * 10) / 10;   // stake lay
const round2 = v => Math.round(v * 100) / 100; // responsabilidade e lucros

const EMPTY = { stakeLay: 0, responsabilidade: 0, lucroBack: 0, lucroLay: 0 };

// ── Função exportada ──────────────────────────────────────────────────────────

/**
 * Calcula stake lay, responsabilidade e lucros de uma operação de back/lay.
 *
 * A comissão (%) é aplicada apenas no retorno do lay.
 * A stake back é sempre a entrada base (definida pelo usuário).
 *
 * Fórmulas:
 *   stakeLay        = stakeBack × oddBack / (oddLay − c)
 *   responsabilidade = stakeLay × (oddLay − 1)
 *   lucroBack       = stakeBack × (oddBack − 1) − responsabilidade   [back vence]
 *   lucroLay        = −stakeBack + stakeLay × (1 − c)                [lay vence]
 *
 * Exemplo:
 *   calcBackLay({ oddBack: 2.10, stakeBack: 100, oddLay: 2.02, comissao: 5 })
 *   c = 0.05
 *   stakeLay        = round1(100 × 2.10 / (2.02 − 0.05)) = round1(106.598) = 106.6
 *   responsabilidade = round2(106.6 × 1.02) = 108.73
 *   lucroBack       = round2(100 × 1.10 − 108.73) = 1.27
 *   lucroLay        = round2(−100 + 106.6 × 0.95) = 1.27
 */
export function calcBackLay({ oddBack, stakeBack, oddLay, comissao }) {
  const ob = parseFloat(String(oddBack).replace(",",  ".")) || 0;
  const sb = parseFloat(String(stakeBack).replace(",", ".")) || 0;
  const ol = parseFloat(String(oddLay).replace(",",   ".")) || 0;
  const c  = (parseFloat(String(comissao).replace(",", ".")) || 0) / 100;

  // Validações: odds devem ser > 1, stake > 0, comissão válida, denominador positivo
  if (ob <= 1 || sb <= 0 || ol <= 1 || c < 0 || c >= 1 || (ol - c) <= 0) {
    return EMPTY;
  }

  const stakeLay        = round1(sb * ob / (ol - c));
  const responsabilidade = round2(stakeLay * (ol - 1));
  const lucroBack       = round2(sb * (ob - 1) - responsabilidade);
  const lucroLay        = round2(-sb + stakeLay * (1 - c));

  return { stakeLay, responsabilidade, lucroBack, lucroLay };
}
