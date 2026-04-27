import { useState } from "react";
import { G, GRAD } from "../../constants/colors";
import { fmt, fmtDate, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp } from "../../utils/calculos";
import { statusOp } from "../../utils/status";
import { lucroAvulsa } from "../../utils/lucroAvulsa";
import { lucroCassino } from "../../utils/lucroCassino";
import { lucroProtecao } from "../../utils/lucroProtecao";
import { Card } from "../../components/ui/Card";
import { ModalDetalhesMes }  from "./modals/ModalDetalhesMes";
import { ModalDetalhesDias } from "./modals/ModalDetalhesDias";

// onOpenCalc: callback para abrir o ModalCalculadora global (gerenciado em App.jsx)
export function TelaDashboard({ data, setData, onOpenCalc }) {
  const hoje = new Date();
  const [mesSel,            setMesSel]            = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [modalDetalhes,     setModalDetalhes]     = useState(false);
  const [modalDetalhesDias, setModalDetalhesDias] = useState(false);
  const [anoSel, mesMes] = mesSel.split("-").map(Number);

  function opDoMes(ev) {
    const d = new Date(ev.data);
    return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes;
  }

  const todosEventos    = data.eventos || [];
  const todasOpsDoMes   = todosEventos.flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev })).filter(({ ev }) => opDoMes(ev)));
  const totalOps        = todasOpsDoMes.length;

  const avulsasDoMes    = (data.apostasAvulsas || []).filter(a => { const d = new Date(a.data); return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes; });
  const cassinosDoMes   = (data.cassinos || []).filter(c => { const d = new Date(c.data); return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes; });
  const protecoesMes    = todosEventos.filter(ev => opDoMes(ev)).flatMap(ev => ev.protecoes || []);
  const lucroMes        = todasOpsDoMes.reduce((s, { op }) => s + lucroEfetivoOp(op), 0)
    + avulsasDoMes.reduce((s, a) => s + lucroAvulsa(a), 0)
    + cassinosDoMes.reduce((s, c) => s + lucroCassino(c), 0)
    + protecoesMes.reduce((s, p) => s + lucroProtecao(p), 0);

  const hojeStr  = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const lucroHoje = todosEventos.flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev }))).filter(({ ev }) => (ev.data || "").slice(0, 10) === hojeStr).reduce((s, { op }) => s + lucroEfetivoOp(op), 0)
    + (data.apostasAvulsas || []).filter(a => (a.data || "").slice(0, 10) === hojeStr).reduce((s, a) => s + lucroAvulsa(a), 0)
    + (data.cassinos || []).filter(c => (c.data || "").slice(0, 10) === hojeStr).reduce((s, c) => s + lucroCassino(c), 0)
    + todosEventos.filter(ev => (ev.data || "").slice(0, 10) === hojeStr).flatMap(ev => ev.protecoes || []).reduce((s, p) => s + lucroProtecao(p), 0);

  // Extrai o dia do mês a partir de strings "YYYY-MM-DD" sem conversão de fuso
  const diaStr = d => parseInt((d || "").slice(8, 10), 10);

  const diasComOps   = new Set([
    ...todasOpsDoMes.map(({ ev }) => diaStr(ev.data)),
    ...avulsasDoMes.map(a => diaStr(a.data)),
  ]);
  const mediaDiaria  = diasComOps.size > 0 ? lucroMes / diasComOps.size : 0;
  const mediaOpsDia  = diasComOps.size > 0 ? totalOps / diasComOps.size : 0;

  const mesesDisp = [...new Set([
    ...todosEventos.map(ev => { const d = new Date(ev.data); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }),
    ...(data.apostasAvulsas || []).map(a => { const d = new Date(a.data); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }),
    ...(data.cassinos || []).map(c => { const d = new Date(c.data); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }),
  ])].sort().reverse();
  const mesMesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  if (!mesesDisp.includes(mesMesAtual)) mesesDisp.unshift(mesMesAtual);

  const mesesAnteriores = mesesDisp.filter(m => m !== mesSel);
  const lucrosPorMes = mesesAnteriores.map(m => {
    const [y, mo] = m.split("-").map(Number);
    const evDoMesM  = todosEventos.filter(ev => { const d = new Date(ev.data); return d.getFullYear() === y && d.getMonth() + 1 === mo; });
    const lucroOpsM  = evDoMesM.flatMap(ev => ev.operacoes || []).reduce((s, op) => s + lucroEfetivoOp(op), 0);
    const lucroAvM   = (data.apostasAvulsas || []).filter(a => { const d = new Date(a.data); return d.getFullYear() === y && d.getMonth() + 1 === mo; }).reduce((s, a) => s + lucroAvulsa(a), 0);
    const lucroCasM  = (data.cassinos || []).filter(c => { const d = new Date(c.data); return d.getFullYear() === y && d.getMonth() + 1 === mo; }).reduce((s, c) => s + lucroCassino(c), 0);
    const lucroProtM = evDoMesM.flatMap(ev => ev.protecoes || []).reduce((s, p) => s + lucroProtecao(p), 0);
    return lucroOpsM + lucroAvM + lucroCasM + lucroProtM;
  });
  const mediaUltimosMeses = lucrosPorMes.length > 0 ? lucrosPorMes.reduce((a, b) => a + b, 0) / lucrosPorMes.length : null;

  const diasNoMes    = new Date(anoSel, mesMes, 0).getDate();
  const lucrosPorDia = Array.from({ length: diasNoMes }, (_, i) => {
    const dia  = i + 1;
    const lOps = todasOpsDoMes.filter(({ ev }) => diaStr(ev.data) === dia).reduce((s, { op }) => s + lucroEfetivoOp(op), 0);
    const lAv  = avulsasDoMes.filter(a => diaStr(a.data) === dia).reduce((s, a) => s + lucroAvulsa(a), 0);
    const lCas = cassinosDoMes.filter(c => diaStr(c.data) === dia).reduce((s, c) => s + lucroCassino(c), 0);
    const lProt = protecoesMes.filter(p => {
      // Proteções são indexadas pelo evento — busca o evento-pai para pegar a data
      const ev = todosEventos.find(ev => (ev.protecoes || []).some(pp => pp.id === p.id));
      return ev && diaStr(ev.data) === dia;
    }).reduce((s, p) => s + lucroProtecao(p), 0);
    return { dia, lucro: lOps + lAv + lCas + lProt };
  });
  const maxLucro   = Math.max(...lucrosPorDia.map(d => Math.abs(d.lucro)), 1);
  const chartHalf  = 50; // px de cada metade — total = 100px (corresponde ao CSS)

  const ultimasOps = todosEventos
    .flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev })))
    .sort((a, b) => new Date(b.op.criadoEm || 0) - new Date(a.op.criadoEm || 0));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div className="dash-title" style={{ color: G.text }}>Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
<select value={mesSel} onChange={e => setMesSel(e.target.value)}
            style={{ background: G.surface2, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 7, padding: "7px 12px", color: G.text, fontSize: 13 }}>
            {mesesDisp.map(m => {
              const [y, mo] = m.split("-");
              const nome = new Date(y, mo - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
              return <option key={m} value={m}>{nome.charAt(0).toUpperCase() + nome.slice(1)}</option>;
            })}
          </select>
        </div>
      </div>

      {/* KPIs */}
      <div className="dash-kpi-grid">
        {[
          { label: "Lucro do Mês",  value: fmt(lucroMes),   cor: lucroMes  >= 0 ? G.green : G.red, sub: mediaUltimosMeses !== null ? `média ${fmt(mediaUltimosMeses)}/mês` : null, subCor: mediaUltimosMeses !== null ? (mediaUltimosMeses >= 0 ? G.green : G.red) : G.textMuted, onClick: () => setModalDetalhes(true) },
          { label: "Operações",     value: totalOps,        cor: G.text,   sub: `média ${mediaOpsDia.toFixed(1)} ops/dia`,  subCor: G.textMuted },
          { label: "Lucro do Dia",  value: fmt(lucroHoje),  cor: lucroHoje >= 0 ? G.green : G.red, sub: `média ${fmt(mediaDiaria)}/dia no mês`, subCor: mediaDiaria >= 0 ? G.green : G.red, onClick: () => setModalDetalhesDias(true) },
        ].map(k => (
          <Card key={k.label}
            className="dash-kpi-card"
            onClick={k.onClick}
            style={{
              textAlign: "center", padding: "20px 14px 18px",
              cursor: k.onClick ? "pointer" : "default",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              position: "relative", overflow: "hidden",
            }}>
            {/* Barra gradiente de topo — identidade EdgeArb */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
            <div style={{ fontSize: 10, color: G.textMuted, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
              {k.label}{k.onClick && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.6 }}>↗</span>}
            </div>
            <div className="dash-kpi-value" style={{ color: k.cor }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11, color: k.subCor, marginTop: 6 }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Gráfico diário */}
      <Card style={{ marginBottom: 20, border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: G.textMuted, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>Resultado Diário</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 10, color: G.textMuted }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: G.green, display: "inline-block" }} />Lucro</span>
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: G.red, display: "inline-block" }} />Perda</span>
          </div>
        </div>
        <div style={{ background: "#0B0F1A", borderRadius: 8, padding: "10px 8px 0", position: "relative" }}>
          {/* grid lines sutis */}
          <div style={{ position: "absolute", inset: "10px 8px 0", display: "flex", flexDirection: "column", justifyContent: "space-between", pointerEvents: "none" }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ width: "100%", height: 1, background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
          <div className="dash-chart-bars" style={{ position: "relative", zIndex: 1 }}>
            {/* Linha de base central */}
            <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, background: "rgba(255,255,255,0.15)", zIndex: 2, pointerEvents: "none" }} />
            {lucrosPorDia.map(({ dia, lucro }) => {
              const h     = lucro === 0 ? 0 : Math.max(3, (Math.abs(lucro) / maxLucro) * chartHalf);
              const isPos = lucro > 0;
              const isNeg = lucro < 0;
              return (
                <div key={dia} title={`Dia ${dia}: ${fmt(lucro)}`}
                  style={{ flex: "1 1 0%", minWidth: 0, position: "relative" }}>
                  {/* Barra positiva — cresce para cima a partir do centro */}
                  {isPos && (
                    <div style={{
                      position: "absolute", bottom: "50%", left: 0, right: 0,
                      height: h, background: "linear-gradient(to top, #047857, #34D399)",
                      borderRadius: "3px 3px 0 0",
                    }} />
                  )}
                  {/* Barra negativa — cresce para baixo a partir do centro */}
                  {isNeg && (
                    <div style={{
                      position: "absolute", top: "50%", left: 0, right: 0,
                      height: h, background: "linear-gradient(to bottom, #9F1239, #F87171)",
                      borderRadius: "0 0 3px 3px",
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          {/* Labels dos dias */}
          {diasNoMes <= 15 && (
            <div style={{ display: "flex", gap: 3, padding: "4px 0 4px" }}>
              {lucrosPorDia.map(({ dia }) => (
                <div key={dia} style={{ flex: "1 1 0%", minWidth: 0, fontSize: 8, color: G.textMuted, textAlign: "center", lineHeight: 1 }}>{dia}</div>
              ))}
            </div>
          )}
          {diasNoMes > 15 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 2px 6px" }}>
              <span style={{ fontSize: 9, color: G.textMuted }}>1</span>
              <span style={{ fontSize: 9, color: G.textMuted }}>{Math.round(diasNoMes / 2)}</span>
              <span style={{ fontSize: 9, color: G.textMuted }}>{diasNoMes}</span>
            </div>
          )}
        </div>
      </Card>

      {/* Alerta freebets vencendo nas próximas 24h */}
      {(() => {
        const agora = new Date();
        const em24h = agora.getTime() + 24 * 60 * 60 * 1000;
        const fbs = (data.freebets || []).filter(f => !f.usada && f.prazo);
        const urgentes = fbs.filter(f => {
          const hora  = f.vencimentoHora ? `${f.vencimentoHora}:00` : "23:59:59";
          const vence = new Date(`${f.prazo}T${hora}`).getTime();
          return vence >= agora.getTime() && vence <= em24h;
        });
        if (!urgentes.length) return null;
        return (
          <div style={{ background: "#FBBF2411", border: "1px solid #FBBF2444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⏰</span>
            <span style={{ fontSize: 13, color: G.yellow, fontWeight: 600 }}>
              {urgentes.length} freebet{urgentes.length !== 1 ? "s" : ""} vencendo nas próximas 24h!
            </span>
          </div>
        );
      })()}

      {/* Últimas operações */}
      <Card style={{ border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: G.textMuted, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase" }}>
            Últimas Operações
          </div>
          {ultimasOps.length > 0 && (
            <span style={{ fontSize: 11, color: G.textMuted, background: G.surface2, borderRadius: 5, padding: "2px 8px", border: "1px solid rgba(255,255,255,0.08)" }}>
              {ultimasOps.length}
            </span>
          )}
        </div>
        {ultimasOps.length === 0
          ? <div style={{ color: G.textMuted, fontSize: 13, textAlign: "center", padding: 20 }}>Nenhuma operação registrada ainda.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {ultimasOps.slice(0, 8).map(({ op, ev }) => {
                const st      = statusOp(op);
                const lucro   = lucroEfetivoOp(op);
                const stCor   = { pendente: G.yellow, parcial: G.accent, finalizada: G.green }[st] ?? G.textMuted;
                const stLabel = { pendente: "Pendente", parcial: "Em andamento", finalizada: "Finalizado" }[st] ?? st;
                return (
                  <div key={op.id} className="dash-ops-item" style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    background: G.surface2, borderRadius: 8, padding: "11px 14px",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderLeft: `3px solid ${stCor}`,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 13, color: G.text }}>{ev.nome}</span>
                        <span style={{
                          fontSize: 10, color: stCor,
                          background: `${stCor}20`, border: `1px solid ${stCor}40`,
                          borderRadius: 4, padding: "1px 7px", fontWeight: 700,
                        }}>{stLabel}</span>
                      </div>
                      <div style={{ fontSize: 11, color: G.textMuted, marginTop: 3 }}>{fmtDate(ev.data)}</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 5 }}>
                        {(op.entradas || []).map(e => (
                          <span key={e.id} style={{
                            fontSize: 10, color: G.textDim,
                            background: G.surface, borderRadius: 4, padding: "2px 7px",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}>
                            {getCasaNome(data.casas || [], e.casa)} · {e.entradaDisplay || e.entrada}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 16 }}>
                      <div style={{ fontSize: 10, color: G.textMuted, marginBottom: 2 }}>{st === "pendente" ? "mín. garantido" : "lucro"}</div>
                      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 700, color: lucro >= 0 ? G.green : G.red }}>{fmt(lucro)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        }
      </Card>

      <ModalDetalhesMes  open={modalDetalhes}     onClose={() => setModalDetalhes(false)}     data={data} mesSel={mesSel} />
      <ModalDetalhesDias open={modalDetalhesDias} onClose={() => setModalDetalhesDias(false)} data={data} mesSel={mesSel} />

      <div style={{ textAlign: "center", marginTop: 32, paddingBottom: 8 }}>
        <a
          href="https://i.pinimg.com/736x/2f/c5/42/2fc5429cc937124e13e1b4ff059bc1c5.jpg"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 11, color: G.textMuted, textDecoration: "underline" }}
        >
          reclame aqui
        </a>
      </div>
    </div>
  );
}
