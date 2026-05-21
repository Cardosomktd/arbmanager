import { calcRetorno } from "./calculos";
import { lucroCassino } from "./lucroCassino";

export function calcSaldoCasa(casa, data) {
  let saldo = casa.saldoInicial || 0;

  // Operações esportivas
  //
  // Cada tipo é tratado de forma totalmente explícita, sem delegar ao calcRetorno
  // para as entradas de exchange (evita ambiguidade sobre o que está sendo somado).
  //
  // Regra geral: custo deducido no lançamento (independente do resultado);
  //              crédito somado apenas no green; red não altera nada além do custo.
  //
  //  normal       →  custo = stake (valor)
  //                   green: stake devolvida + lucro = calcRetorno(e) = odd × valor
  //  exchange_back →  custo = stake (valor)
  //                   green: stake devolvida + lucro líquido = valor + valor×(odd−1)×(1−comm)
  //  exchange_lay  →  custo = responsabilidade = valor × (odd − 1)
  //                   green: responsabilidade devolvida + lucro = valor×(odd−1) + valor×(1−comm)
  //  freebet/bonus →  sem custo; green: lucro líquido via calcRetorno(e)
  (data.eventos || []).forEach(ev =>
    (ev.operacoes || []).forEach(op =>
      (op.entradas || []).forEach(e => {
        if (e.casa !== casa.id) return;
        const valor = parseFloat(e.valor) || 0;
        const odd   = parseFloat(String(e.odd || "").replace(",", ".")) || 0;
        const comm  = parseFloat(e.comissao) / 100 || 0;

        if (e.tipo === "normal") {
          saldo -= valor;                                   // stake sai no lançamento
          if (e.situacao === "green") saldo += calcRetorno(e); // odd × valor (inclui stake)

        } else if (e.tipo === "exchange_back") {
          saldo -= valor;                                   // stake sai no lançamento
          if (e.situacao === "green") {
            saldo += valor;                                 // stake devolvida
            saldo += valor * (odd - 1) * (1 - comm);       // lucro líquido
          }
          // red: stake perdida, já deducida — nada mais

        } else if (e.tipo === "exchange_lay") {
          saldo -= valor * (odd - 1);                       // responsabilidade reservada
          if (e.situacao === "green") {
            saldo += valor * (odd - 1);                     // responsabilidade devolvida
            saldo += valor * (1 - comm);                    // lucro (stake do apostador − comm)
          }
          // red: responsabilidade perdida, já deducida — nada mais

        } else {
          // freebet / bonus: stake não é dinheiro real → sem custo
          if (e.situacao === "green") saldo += calcRetorno(e);
        }
      })
    )
  );

  // Proteções (salvas em evento.protecoes — tipo sempre "normal")
  //
  //  pendente → stake deducida no lançamento (dinheiro real comprometido)
  //  green    → stake devolvida + lucro = odd × valor
  //  red      → stake perdida, já deducida — nada mais
  (data.eventos || []).forEach(ev =>
    (ev.protecoes || []).forEach(p => {
      if (p.casa !== casa.id) return;
      const valor = parseFloat(p.valor) || 0;
      const odd   = parseFloat(String(p.odd || "").replace(",", ".")) || 0;
      saldo -= valor;                                   // stake sai no lançamento
      if (p.situacao === "green") saldo += odd * valor; // retorno bruto (inclui stake)
      // red: stake perdida, já deducida — nada mais
    })
  );

  // Apostas avulsas
  (data.apostasAvulsas || []).filter(a => a.casa === casa.id).forEach(a => {
    saldo -= parseFloat(a.valor) || 0;
    if (a.situacao === "green")
      saldo += (parseFloat(String(a.odd).replace(",", ".")) || 0) * (parseFloat(a.valor) || 0);
  });

  // Depósitos e saques
  (data.movimentos || [])
    .filter(m => m.casaId === casa.id)
    .forEach(m => { saldo += m.tipo === "deposito" ? m.valor : -m.valor; });

  // Cassino: soma o lucro líquido (retorno − apostado para dinheiro_real; valor ganho para bônus)
  // Lucro negativo (prejuízo) reduz o saldo automaticamente.
  (data.cassinos || [])
    .filter(c => c.casa === casa.id)
    .forEach(c => { saldo += lucroCassino(c); });

  return saldo;
}
