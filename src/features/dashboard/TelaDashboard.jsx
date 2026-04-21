import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt, fmtDate, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp, calcLucroMinOp } from "../../utils/calculos";
import { lucroAvulsa } from "../../utils/lucroAvulsa";
import { Card } from "../../components/ui/Card";
import { ModalDetalhesMes } from "./modals/ModalDetalhesMes";

export function TelaDashboard({ data }) {
  const hoje = new Date();
  const [mesSel,        setMesSel]        = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [anoSel, mesMes] = mesSel.split("-").map(Number);

  function opDoMes(ev) {
    const d = new Date(ev.data);
    return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes;
  }

  // Lucro LÍQUIDO de uma proteção: green=(odd-1)*valor, red=-valor, pendente=0
  function lucroProtecaoDash(p) {
    const odd   = parseFloat(String(p.odd).replace(",", ".")) || 0;
    const valor = parseFloat(p.valor) || 0;
    if (p.situacao === "green") return (odd - 1) * valor;
    if (p.situacao === "red")   return -valor;
    return 0;
  }

  const todosEventos    = data.eventos || [];
  const todasOpsDoMes   = todosEventos.flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev })).filter(({ ev }) => opDoMes(ev)));
  const totalOps        = todasOpsDoMes.length;

  const avulsasDoMes    = (data.apostasAvulsas || []).filter(a => { const d = new Date(a.data); return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes; });
  const protecoesMes    = todosEventos.filter(ev => opDoMes(ev)).flatMap(ev => ev.protecoes || []);
  const lucroMes        = todasOpsDoMes.reduce((s, { op }) => s + lucroEfetivoOp(op), 0)
    + avulsasDoMes.reduce((s, a) => s + lucroAvulsa(a), 0)
    + protecoesMes.reduce((s, p) => s + lucroProtecaoDash(p), 0);

  const hojeStr  = hoje.toDateString();
  const lucroHoje = todosEventos.flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev }))).filter(({ ev }) => new Date(ev.data).toDateString() === hojeStr).reduce((s, { op }) => s + lucroEfetivoOp(op), 0)
    + (data.apostasAvulsas || []).filter(a => new Date(a.data).toDateString() === hojeStr).reduce((s, a) => s + lucroAvulsa(a), 0)
    + todosEventos.filter(ev => new Date(ev.data).toDateString() === hojeStr).flatMap(ev => ev.protecoes || []).reduce((s, p) => s + lucroProtecaoDash(p), 0);

  const diasComOps   = new Set([
    ...todasOpsDoMes.map(({ ev }) => new Date(ev.data).getDate()),
    ...avulsasDoMes.map(a => new Date(a.data).getDate()),
  ]);
  const mediaDiaria  = diasComOps.size > 0 ? lucroMes / diasComOps.size : 0;
  const mediaOpsDia  = diasComOps.size > 0 ? totalOps / diasComOps.size : 0;

  const mesesDisp = [...new Set([
    ...todosEventos.map(ev => { const d = new Date(ev.data); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }),
    ...(data.apostasAvulsas || []).map(a => { const d = new Date(a.data); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }),
  ])].sort().reverse();
  const mesMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  if (!mesesDisp.includes(mesMesAtual)) mesesDisp.unshift(mesMesAtual);

  const mesesAnteriores = mesesDisp.filter(m => m !== mesSel);
  const lucrosPorMes = mesesAnteriores.map(m => {
    const [y, mo] = m.split("-").map(Number);
    const evDoMesM  = todosEventos.filter(ev => { const d = new Date(ev.data); return d.getFullYear() === y && d.getMonth() + 1 === mo; });
    const lucroOpsM = evDoMesM.flatMap(ev => ev.operacoes || []).reduce((s, op) => s + lucroEfetivoOp(op), 0);
    const lucroAvM  = (data.apostasAvulsas || []).filter(a => { const d = new Date(a.data); return d.getFullYear() === y && d.getMonth() + 1 === mo; }).reduce((s, a) => s + lucroAvulsa(a), 0);
    const lucroProtM = evDoMesM.flatMap(ev => ev.protecoes || []).reduce((s, p) => s + lucroProtecaoDash(p), 0);
    return lucroOpsM + lucroAvM + lucroProtM;
  });
  const mediaUltimosMeses = lucrosPorMes.length > 0 ? lucrosPorMes.reduce((a, b) => a + b, 0) / lucrosPorMes.length : null;

  const diasNoMes    = new Date(anoSel, mesMes, 0).getDate();
  const lucrosPorDia = Array.from({ length: diasNoMes }, (_, i) => {
    const dia  = i + 1;
    const lOps = todasOpsDoMes.filter(({ ev }) => new Date(ev.data).getDate() === dia).reduce((s, { op }) => s + lucroEfetivoOp(op), 0);
    const lAv  = avulsasDoMes.filter(a => new Date(a.data).getDate() === dia).reduce((s, a) => s + lucroAvulsa(a), 0);
    const lProt = protecoesMes.filter(p => {
      // Proteções são indexadas pelo evento — busca o evento-pai para pegar a data
      const ev = todosEventos.find(ev => (ev.protecoes || []).some(pp => pp.id === p.id));
      return ev && new Date(ev.data).getDate() === dia;
    }).reduce((s, p) => s + lucroProtecaoDash(p), 0);
    return { dia, lucro: lOps + lAv + lProt };
  });
  const maxLucro = Math.max(...lucrosPorDia.map(d => Math.abs(d.lucro)), 1);

  const opsPendentes = todosEventos
    .flatMap(ev => (ev.operacoes || []).filter(op => (op.entradas || []).every(e => e.situacao === "pendente")).map(op => ({ op, ev })))
    .sort((a, b) => new Date(a.ev.data) - new Date(b.ev.data));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: G.accent }}>Dashboard</div>
        <select value={mesSel} onChange={e => setMesSel(e.target.value)}
          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "6px 12px", color: G.text, fontSize: 13 }}>
          {mesesDisp.map(m => {
            const [y, mo] = m.split("-");
            const nome = new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
            return <option key={m} value={m}>{nome.charAt(0).toUpperCase() + nome.slice(1)}</option>;
          })}
        </select>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Lucro do Mês",   value: fmt(lucroMes),   cor: lucroMes  >= 0 ? G.green : G.red, sub: mediaUltimosMeses !== null ? `média ${fmt(mediaUltimosMeses)}/mês` : null, subCor: mediaUltimosMeses !== null ? (mediaUltimosMeses >= 0 ? G.green : G.red) : G.textMuted, clicavel: true },
          { label: "Operações",      value: totalOps,        cor: G.accent, sub: `média ${mediaOpsDia.toFixed(1)}/dia`, subCor: G.textMuted },
          { label: "Lucro do Dia",   value: fmt(lucroHoje),  cor: lucroHoje >= 0 ? G.green : G.red, sub: `média ${fmt(mediaDiaria)}/dia no mês`, subCor: mediaDiaria >= 0 ? G.green : G.red },
        ].map(k => (
          <Card key={k.label}
            onClick={k.clicavel ? () => setModalDetalhes(true) : undefined}
            style={{ textAlign: "center", padding: "16px 12px", cursor: k.clicavel ? "pointer" : "default", transition: "border-color 0.15s", ...(k.clicavel ? { borderColor: "#2a3d5e" } : {}) }}>
            <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
              {k.label}{k.clicavel && <span style={{ color: G.textMuted, marginLeft: 4, fontSize: 10 }}>↗</span>}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, color: k.cor }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11, color: k.subCor, opacity: 0.6, marginTop: 4 }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Gráfico diário */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Resultado Diário</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 80, paddingBottom: 4 }}>
          {lucrosPorDia.map(({ dia, lucro }) => {
            const h   = Math.max(4, (Math.abs(lucro) / maxLucro) * 70);
            const cor = lucro > 0 ? G.green : lucro < 0 ? G.red : G.border;
            return (
              <div key={dia} title={`Dia ${dia}: ${fmt(lucro)}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "0 0 auto", width: `calc((100% - ${(diasNoMes - 1) * 3}px) / ${diasNoMes})`, minWidth: 14 }}>
                <div style={{ width: "100%", height: h, background: cor, borderRadius: "3px 3px 0 0", opacity: lucro === 0 ? 0.15 : 1 }} />
                {diasNoMes <= 15 && <div style={{ fontSize: 9, color: G.textMuted, marginTop: 2 }}>{dia}</div>}
              </div>
            );
          })}
        </div>
        {diasNoMes > 15 && (
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 9, color: G.textMuted }}>1</span>
            <span style={{ fontSize: 9, color: G.textMuted }}>{Math.round(diasNoMes / 2)}</span>
            <span style={{ fontSize: 9, color: G.textMuted }}>{diasNoMes}</span>
          </div>
        )}
      </Card>

      {/* Alerta freebets vencendo */}
      {(() => {
        const hojeD = new Date(); hojeD.setHours(0, 0, 0, 0);
        const fbs = (data.freebets || []).filter(f => !f.usada && f.prazo);
        const urgentes = fbs.filter(f => {
          const diff = Math.round((new Date(f.prazo + "T12:00:00") - hojeD) / (1000 * 60 * 60 * 24));
          return diff <= 3;
        });
        if (!urgentes.length) return null;
        return (
          <div style={{ background: "#ffd60011", border: "1px solid #ffd60044", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⏰</span>
            <span style={{ fontSize: 13, color: G.yellow, fontWeight: 600 }}>
              {urgentes.length} freebet{urgentes.length !== 1 ? "s" : ""} vencendo em breve!
            </span>
          </div>
        );
      })()}

      {/* Operações pendentes */}
      <Card>
        <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Próximas Operações Pendentes{opsPendentes.length > 0 && <span style={{ color: G.accent }}> ({opsPendentes.length})</span>}
        </div>
        {opsPendentes.length === 0
          ? <div style={{ color: G.textMuted, fontSize: 13, textAlign: "center", padding: 20 }}>Nenhuma operação pendente 🎉</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {opsPendentes.slice(0, 8).map(({ op, ev }) => {
                const lucroMin = calcLucroMinOp(op);
                return (
                  <div key={op.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface2, borderRadius: 8, padding: "10px 14px", border: `1px solid ${G.border}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{ev.nome}</div>
                      <div style={{ fontSize: 11, color: G.textDim, marginTop: 2 }}>{fmtDate(ev.data)}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {(op.entradas || []).map(e => (
                          <span key={e.id} style={{ fontSize: 10, color: G.textMuted, background: G.surface, borderRadius: 3, padding: "1px 5px" }}>
                            {getCasaNome(data.casas || [], e.casa)} · {e.entradaDisplay || e.entrada}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontSize: 10, color: G.textDim }}>mín. garantido</div>
                      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700, color: lucroMin >= 0 ? G.green : G.red }}>{fmt(lucroMin)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>

      <ModalDetalhesMes open={modalDetalhes} onClose={() => setModalDetalhes(false)} data={data} mesSel={mesSel} />
    </div>
  );
}
