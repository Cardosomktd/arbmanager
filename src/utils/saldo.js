import { calcRetorno } from "./calculos";

export function calcSaldoCasa(casa, data) {
  let saldo = casa.saldoInicial || 0;

  (data.eventos || []).forEach(ev =>
    (ev.operacoes || []).forEach(op =>
      (op.entradas || []).forEach(e => {
        if (e.casa !== casa.id) return;
        if (e.tipo === "normal") saldo -= parseFloat(e.valor) || 0;
        if (e.situacao === "green") saldo += calcRetorno(e);
      })
    )
  );

  (data.apostasAvulsas || []).filter(a => a.casa === casa.id).forEach(a => {
    saldo -= parseFloat(a.valor) || 0;
    if (a.situacao === "green")
      saldo += (parseFloat(String(a.odd).replace(",", ".")) || 0) * (parseFloat(a.valor) || 0);
  });

  (data.movimentos || [])
    .filter(m => m.casaId === casa.id)
    .forEach(m => { saldo += m.tipo === "deposito" ? m.valor : -m.valor; });

  return saldo;
}
