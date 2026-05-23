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
 * Calcula se a condição de uma freebet gerada foi atingida.
 *
 * Assinatura atualizada: aceita um `fbItem` explícito (item de geraFreebets[])
 * ou faz fallback para op.geraFreebet (retrocompatibilidade com ops legado e
 * com chamadas externas que ainda passam apenas `op`).
 */
export function computeGanhou(op, fbItem) {
  const fb = fbItem ?? op.geraFreebet;
  if (!fb) return false;
  const { condicao, entradaGatilhoId } = fb;
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
 *
 * Suporta dois formatos de operação:
 *  - Legado:  op.geraFreebet  (objeto único)
 *  - Novo:    op.geraFreebets (array — múltiplas freebets por operação)
 *
 * IDs automáticos:
 *  - Legado:   "auto_" + op.id
 *  - Novo:     "auto_" + fbItem._id  (primeiro item usa op.id como _id → mesmo ID legado)
 */
export function getFreebets(data) {
  const casas      = data.casas      || [];
  const autoUsadas = data.freebetsAutoUsadas || [];

  // Clona cada objeto de freebet manual para poder estender sem mutar data.freebets
  const todas = (data.freebets || []).map(f => ({ ...f }));

  (data.eventos || []).forEach(ev => {
    (ev.operacoes || []).forEach(op => {

      // ── Formato LEGADO: op.geraFreebet (objeto único) ──────────────────────
      // Caminho completamente inalterado para garantir que ops antigas continuem
      // funcionando exatamente como antes.
      if (!op.geraFreebets && op.geraFreebet) {
        if (op.geraFreebet.tipoBeneficio === "cashback") return;

        const { casa, valor, prazo } = op.geraFreebet;
        const autoId = "auto_" + op.id;

        // Se já foi materializada manualmente, não duplicar
        if (todas.find(f => f.origemOpId === op.id)) return;

        if (!computeGanhou(op)) return;

        const isUsed = autoUsadas.includes(autoId);

        if (isBet365Casa(casas, casa)) {
          if (!isUsed) {
            const acumIdx = todas.findIndex(f => f.tipo === "acumulada" && f.casaId === casa);
            if (acumIdx >= 0) {
              todas[acumIdx] = {
                ...todas[acumIdx],
                saldo: (todas[acumIdx].saldo ?? todas[acumIdx].valor ?? 0) + valor,
                _autoContrib: [
                  ...(todas[acumIdx]._autoContrib || []),
                  { id: autoId, valor },
                ],
              };
            } else {
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
        return; // legado processado — pula o bloco novo
      }

      // ── Formato NOVO: op.geraFreebets[] (array, múltiplas por op) ──────────
      if (!op.geraFreebets?.length) return;

      op.geraFreebets.forEach(fbItem => {
        if (fbItem.tipoBeneficio === "cashback") return;

        const { casa, valor, prazo, _id } = fbItem;
        // Primeiro item usa op.id como _id → "auto_" + op.id (mesmo ID do legado)
        const autoId = "auto_" + (_id ?? op.id);

        // Se já existe uma entrada com este autoId (materialização manual ou prévia), pular
        if (todas.find(f => f.id === autoId)) return;

        if (!computeGanhou(op, fbItem)) return;

        const isUsed = autoUsadas.includes(autoId);

        if (isBet365Casa(casas, casa)) {
          // Bet365: agrega na carteira acumulada
          if (!isUsed) {
            const acumIdx = todas.findIndex(f => f.tipo === "acumulada" && f.casaId === casa);
            if (acumIdx >= 0) {
              todas[acumIdx] = {
                ...todas[acumIdx],
                saldo: (todas[acumIdx].saldo ?? todas[acumIdx].valor ?? 0) + valor,
                _autoContrib: [
                  ...(todas[acumIdx]._autoContrib || []),
                  { id: autoId, valor },
                ],
              };
            } else {
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
          // Casa normal: freebet individual
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
  });

  return todas;
}
