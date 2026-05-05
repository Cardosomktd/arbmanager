// ── Helpers exportados ─────────────────────────────────────────────────────────

/**
 * Detecta Bet365 pelo nome da casa (case-insensitive, ignora espaços).
 * Exportado para reutilização em TelaEventos/TelaFreebets.
 */
export function isBet365Casa(casas, casaId) {
  const nome = (casas || []).find(c => c.id === casaId)?.nome || "";
  return nome.toLowerCase().replace(/\s/g, "").includes("bet365");
}

/**
 * Calcula se a condição de geraFreebet foi atingida.
 * Mesma lógica do fbAtingida em ModalDetalhesMes — fonte única de verdade.
 */
export function computeGanhou(op) {
  const { condicao, entradaGatilhoId } = op.geraFreebet;
  const ents = op.entradas || [];

  if (entradaGatilhoId) {
    const gatilho = ents.find(e => e.id === entradaGatilhoId);
    if (!gatilho || gatilho.situacao === "pendente") return false;
    if (condicao === "qualquer") return true;
    return condicao === gatilho.situacao;
  }

  // Lógica legada: avalia o conjunto completo de entradas
  const concluida = ents.length > 0 && ents.every(e => e.situacao !== "pendente");
  if (!concluida) return false;
  const temGreen = ents.some(e => e.situacao === "green");
  const temRed   = ents.some(e => e.situacao === "red");
  if (condicao === "qualquer") return true;
  if (condicao === "green")    return temGreen;
  if (condicao === "red")      return temRed && !temGreen;
  return false;
}

// ── getFreebets ────────────────────────────────────────────────────────────────

/**
 * Retorna a lista derivada de freebets disponíveis:
 *  - Freebets manuais (data.freebets)
 *  - Freebets geradas por ops (tipo "gerada") — casas normais
 *  - Freebets Bet365 geradas por ops → MERGEADAS na carteira acumulada
 *    em vez de aparecerem como entradas individuais.
 *
 * Cada acumulada Bet365 que recebe contribuições auto-geradas ganha a
 * propriedade `_autoContrib: [{ id, valor }]` para rastrear o consumo
 * desses IDs quando a carteira for usada em salvarOp.
 */
export function getFreebets(data) {
  const casas      = data.casas      || [];
  const autoUsadas = data.freebetsAutoUsadas || [];

  // Clona cada objeto de freebet manual para poder estender sem mutar d.freebets
  const todas = (data.freebets || []).map(f => ({ ...f }));

  (data.eventos || []).forEach(ev => {
    (ev.operacoes || []).forEach(op => {
      if (!op.geraFreebet) return;
      if (op.geraFreebet.tipoBeneficio === "cashback") return;

      const { casa, valor, prazo } = op.geraFreebet;
      const autoId = "auto_" + op.id;

      // Se já foi "materializada" manualmente em d.freebets, não duplicar
      if (todas.find(f => f.origemOpId === op.id)) return;

      if (!computeGanhou(op)) return;

      const isUsed = autoUsadas.includes(autoId);

      if (isBet365Casa(casas, casa)) {
        // ── Bet365: contribui para a carteira acumulada ──────────────────────
        // Auto-freebets usadas (in autoUsadas) já foram consumidas — não re-adicionar.
        if (!isUsed) {
          const acumIdx = todas.findIndex(f => f.tipo === "acumulada" && f.casaId === casa);
          if (acumIdx >= 0) {
            // Acumulada manual existente: incrementa saldo e registra contribuição
            todas[acumIdx] = {
              ...todas[acumIdx],
              saldo: (todas[acumIdx].saldo ?? todas[acumIdx].valor ?? 0) + valor,
              _autoContrib: [
                ...(todas[acumIdx]._autoContrib || []),
                { id: autoId, valor },
              ],
            };
          } else {
            // Sem acumulada manual: cria uma sintética para Bet365
            todas.push({
              id:           "bet365_auto_" + casa,
              casaId:       casa,
              valor,
              saldo:        valor,
              prazo,
              tipo:         "acumulada",
              usada:        false,
              _autoContrib: [{ id: autoId, valor }],
              criadoEm:     new Date().toISOString(),
              obs:          `Gerada pela operação: ${ev.nome}`,
            });
          }
        }
      } else {
        // ── Outras casas: entrada individual (comportamento original) ────────
        todas.push({
          id:         autoId,
          origemOpId: op.id,
          casaId:     casa,
          valor,
          prazo,
          tipo:       "gerada",
          usada:      isUsed,
          criadoEm:   new Date().toISOString(),
          obs:        `Gerada pela operação: ${ev.nome}`,
        });
      }
    });
  });

  return todas;
}
