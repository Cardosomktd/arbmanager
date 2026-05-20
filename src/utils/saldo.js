import { calcRetorno } from "./calculos";
import { lucroCassino } from "./lucroCassino";

export function calcSaldoCasa(casa, data) {
  let saldo = casa.saldoInicial || 0;

  // Operações esportivas
  //
  // Regra: o custo é deducido no lançamento, independente do resultado.
  // O retorno é creditado apenas no green.
  //
  //   normal / exchange_back  →  custo = stake (e.valor)
  //   exchange_lay            →  custo = responsabilidade = e.valor × (odd − 1)
  //   freebet / bonus         →  sem custo (stake não é dinheiro real)
  //
  // Green:
  //   exchange_back / normal / freebet / bonus → calcRetorno inclui stake de volta + lucro
  //   exchange_lay → responsabilidade devolvida + lucro = valor×(odd−1) + calcRetorno(e)
  //
  // Red: custo já foi deducido no lançamento; nenhum crédito adicional.
  (data.eventos || []).forEach(ev =>
    (ev.operacoes || []).forEach(op =>
      (op.entradas || []).forEach(e => {
        if (e.casa !== casa.id) return;
        const valor = parseFloat(e.valor) || 0;
        const odd   = parseFloat(String(e.odd || "").replace(",", ".")) || 0;

        // ── Custo no lançamento ──────────────────────────────────────────────
        if (e.tipo === "normal" || e.tipo === "exchange_back") {
          saldo -= valor;               // stake sai imediatamente
        }
        if (e.tipo === "exchange_lay") {
          saldo -= valor * (odd - 1);   // responsabilidade reservada
        }
        // freebet / bonus: stake não é dinheiro próprio → sem dedução

        // ── Crédito no green ─────────────────────────────────────────────────
        if (e.situacao === "green") {
          if (e.tipo === "exchange_lay") {
            // Responsabilidade devolvida + lucro líquido recebido
            saldo += valor * (odd - 1) + calcRetorno(e);
          } else {
            // back / normal / freebet / bonus: calcRetorno inclui stake de volta (para back/normal)
            saldo += calcRetorno(e);
          }
        }
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
