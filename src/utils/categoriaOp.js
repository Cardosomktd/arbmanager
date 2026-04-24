/**
 * categoriaOp.js — classificação canônica de operações.
 *
 * `resolveCategoria` é a única fonte de verdade para o tipo de uma operação.
 * Funciona tanto para dados novos (tipoOp explícito) quanto para legado
 * (tipoOp === "arbitragem" com geraFreebet / entradas freebet).
 *
 * Tipos válidos:
 *   "arbitragem"           — arbitragem simples, lucro mínimo garantido
 *   "procedimento_freebet" — gera freebet ao completar condição
 *   "extracao_freebet"     — consome freebet já gerada
 *   "duplo"                — chance de duplo, sem lucro mínimo garantido
 */

export const CATEGORIAS = {
  arbitragem: {
    label:  "Arbitragem",
    emoji:  "💰",
    cor:    "#22D3EE",   // accent
    badge:  "blue",
  },
  procedimento_freebet: {
    label:  "Proc. Freebet",
    emoji:  "🎯",
    cor:    "#fbbf24",   // yellow
    badge:  "yellow",
  },
  extracao_freebet: {
    label:  "Ext. Freebet",
    emoji:  "🎁",
    cor:    "#34D399",   // green
    badge:  "green",
  },
  duplo: {
    label:  "Chance de Duplo",
    emoji:  "🎲",
    cor:    "#8B5CF6",   // purple
    badge:  "purple",
  },
};

/**
 * Retorna a categoria canônica da operação.
 *
 * Ordem de prioridade:
 *  1. tipoOp novo e explícito (procedimento_freebet | extracao_freebet | duplo)
 *  2. tipoOp === "duplo" legado
 *  3. Derivação por flags: geraFreebet → procedimento_freebet
 *                          entradas freebet → extracao_freebet
 *  4. Default: "arbitragem"
 */
export function resolveCategoria(op) {
  const t = op?.tipoOp;

  if (t === "procedimento_freebet") return "procedimento_freebet";
  if (t === "extracao_freebet")     return "extracao_freebet";
  if (t === "duplo")                return "duplo";

  // Legado: tipoOp === "arbitragem" (ou ausente) — deriva pelos flags operacionais
  const temEntradaFB = (op?.entradas || []).some(e => e.tipo === "freebet");
  if (temEntradaFB)    return "extracao_freebet";
  if (op?.geraFreebet) return "procedimento_freebet";

  return "arbitragem";
}
