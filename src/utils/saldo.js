import { calcRetorno } from "./calculos";
import { lucroCassino } from "./lucroCassino";

export function calcSaldoCasa(casa, data) {
  let saldo = casa.saldoInicial || 0;

  // Operações esportivas: deduz aposta normal, soma retorno no green
  (data.eventos || []).forEach(ev =>
    (ev.operacoes || []).forEach(op =>
      (op.entradas || []).forEach(e => {
        if (e.casa !== casa.id) return;
        if (e.tipo === "normal") saldo -= parseFloat(e.valor) || 0;
        if (e.situacao === "green") saldo += calcRetorno(e);
      })
    )
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
