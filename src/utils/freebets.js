export function getFreebets(data) {
  const todas = [...(data.freebets || [])];
  const autoUsadas = data.freebetsAutoUsadas || [];

  (data.eventos || []).forEach(ev => {
    (ev.operacoes || []).forEach(op => {
      if (!op.geraFreebet) return;
      if (op.geraFreebet.tipoBeneficio === "cashback") return; // cashback não gera freebet na lista
      const { casa, valor, condicao, prazo, entradaGatilhoId } = op.geraFreebet;
      const ents = op.entradas || [];
      const concluida = ents.length > 0 && ents.every(e => e.situacao !== "pendente");

      let ganhou = false;

      if (entradaGatilhoId) {
        // Nova lógica: avalia apenas a situação da entrada gatilho
        const gatilho = ents.find(e => e.id === entradaGatilhoId);
        if (gatilho && gatilho.situacao !== "pendente") {
          if (condicao === "qualquer") ganhou = true;
          else if (condicao === "green" && gatilho.situacao === "green") ganhou = true;
          else if (condicao === "red"   && gatilho.situacao === "red")   ganhou = true;
        }
      } else {
        // Lógica legada: olha o conjunto completo de entradas
        if (concluida) {
          const temGreen = ents.some(e => e.situacao === "green");
          const temRed   = ents.some(e => e.situacao === "red");
          if (condicao === "qualquer") ganhou = true;
          else if (condicao === "green" && temGreen) ganhou = true;
          else if (condicao === "red"   && temRed && !temGreen) ganhou = true;
        }
      }

      if (ganhou) {
        const autoId = "auto_" + op.id;
        const jaExiste = todas.find(f => f.origemOpId === op.id);
        if (!jaExiste) {
          todas.push({
            id: autoId,
            origemOpId: op.id,
            casaId: casa,
            valor,
            prazo,
            tipo: "gerada",
            usada: autoUsadas.includes(autoId),
            criadoEm: new Date().toISOString(),
            obs: `Gerada pela operação: ${ev.nome}`,
          });
        }
      }
    });
  });

  return todas;
}
