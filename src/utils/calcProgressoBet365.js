import { parseDateLocal } from "./format";
import { isBet365Casa   } from "./freebets";

const META_SEMANAL = 1500;

/**
 * Retorna segunda-feira e domingo da semana atual, em hora local.
 * Usa somente o construtor Date(year, month, day) — sem strings ISO —
 * para evitar qualquer deslocamento de timezone.
 */
function getSemanaAtual() {
  const hoje = new Date();
  const dow  = hoje.getDay(); // 0 = domingo, 1 = segunda … 6 = sábado
  // Quantos dias se passaram desde segunda: domingo → 6, segunda → 0, etc.
  const diasDesdeSegunda = dow === 0 ? 6 : dow - 1;
  const segunda = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - diasDesdeSegunda);
  const domingo = new Date(segunda.getFullYear(), segunda.getMonth(), segunda.getDate() + 6, 23, 59, 59, 999);
  return { segunda, domingo };
}

/**
 * Calcula o progresso da promoção semanal da Bet365 por titular/conta.
 *
 * Promoção: apostar R$ 1.500 em apostas normais com odd >= 2,00 na semana
 * (segunda a domingo) para ganhar R$ 100 de freebet.
 *
 * Regras de contagem:
 *  - Apenas entradas com tipo "normal" (dinheiro real)
 *  - Exclui freebet, bônus, exchange_back, exchange_lay
 *  - Apenas odd >= 2,00
 *  - Apenas eventos da semana atual (data local, sem bug de timezone)
 *  - Separado por ID da casa (respeita múltiplas Bet365 com titulares distintos)
 *
 * @param {object} data  Estado global da aplicação (data.eventos, data.casas)
 * @returns {Array<{
 *   casaId: string, casaNome: string, titular: string,
 *   total: number, meta: number, faltam: number, percentual: number
 * }>}
 */
export function calcProgressoBet365(data) {
  const casas = data.casas || [];

  // Todas as casas Bet365 ativas — identificadas pelo nome, separadas pelo ID
  const casasBet365 = casas.filter(c => c.ativa !== false && isBet365Casa(casas, c.id));
  if (casasBet365.length === 0) return [];

  // Mapa { casaId → total apostado no período }
  const totais = Object.fromEntries(casasBet365.map(c => [c.id, 0]));

  const { segunda, domingo } = getSemanaAtual();

  (data.eventos || []).forEach(ev => {
    // Filtra eventos fora da semana atual — usa parseDateLocal para evitar timezone shift
    const dataEv = parseDateLocal(ev.data);
    if (dataEv < segunda || dataEv > domingo) return;

    (ev.operacoes || []).forEach(op => {
      (op.entradas || []).forEach(e => {
        // Apenas casas Bet365 desta sessão (identificação por ID, não por nome)
        if (!(e.casa in totais)) return;

        // Apenas apostas normais (exclui freebet, bônus, exchange)
        const tipo = e.tipo ?? "normal";
        if (tipo !== "normal") return;

        // Odd mínima de 2,00 — suporte a strings com vírgula
        const odd = parseFloat(String(e.odd ?? "").replace(",", ".")) || 0;
        if (odd < 2.00) return;

        // Acumula o valor apostado
        const valor = parseFloat(e.valor) || 0;
        totais[e.casa] += valor;
      });
    });
  });

  return casasBet365.map(c => {
    const total      = Math.round(totais[c.id]                    * 100) / 100;
    const faltam     = Math.round(Math.max(0, META_SEMANAL - total) * 100) / 100;
    const percentual = Math.min(100, (total / META_SEMANAL) * 100);
    return {
      casaId:     c.id,
      casaNome:   c.nome,
      titular:    c.titular || "",
      total,
      meta:       META_SEMANAL,
      faltam,
      percentual,
    };
  });
}
