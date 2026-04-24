import { useState } from "react";
import { G, GRAD } from "../../constants/colors";
import { fmt, fmtDate, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp } from "../../utils/calculos";
import { statusOp } from "../../utils/status";
import { lucroAvulsa } from "../../utils/lucroAvulsa";
import { lucroCassino } from "../../utils/lucroCassino";
import { lucroProtecao } from "../../utils/lucroProtecao";
import { Card } from "../../components/ui/Card";
import { ModalDetalhesMes }       from "./modals/ModalDetalhesMes";
import { ModalCalculadora }       from "./modals/ModalCalculadora";
import { ModalSelecionarEvento }  from "./modals/ModalSelecionarEvento";
import { ModalEvento }            from "../eventos/modals/ModalEvento";
import { ModalOperacao }          from "../eventos/modals/ModalOperacao";
import { uid }                    from "../../storage";

export function TelaDashboard({ data, setData }) {
  const hoje = new Date();
  const [mesSel,        setMesSel]        = useState(`${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`);
  const [modalDetalhes,   setModalDetalhes]   = useState(false);
  const [modalCalc,       setModalCalc]       = useState(false);

  // ── Fluxo calculadora → operação ────────────────────────────────────────────
  const [calcRascunho,    setCalcRascunho]    = useState(null);   // dados da calc
  const [modalSel,        setModalSel]        = useState(false);  // selecionar evento
  const [modalEventoCalc, setModalEventoCalc] = useState(false);  // criar novo evento
  const [modalOpCalc,     setModalOpCalc]     = useState(false);  // abrir operação
  const [eventoAlvoId,    setEventoAlvoId]    = useState(null);

  function handleUsarNaOp(rascunho) {
    setCalcRascunho(rascunho);
    setModalCalc(false);
    setModalSel(true);
  }

  function handleSelecionarEvento(ev) {
    setEventoAlvoId(ev.id);
    setModalSel(false);
    setModalOpCalc(true);
  }

  function handleCriarNovoEvento() {
    setModalSel(false);
    setModalEventoCalc(true);
  }

  function salvarEventoCalc(ev) {
    setData(d => {
      const existe = d.eventos.find(e => e.id === ev.id);
      return {
        ...d,
        eventos: existe
          ? d.eventos.map(e => e.id === ev.id ? { ...e, ...ev } : e)
          : [...d.eventos, ev],
      };
    });
    setEventoAlvoId(ev.id);
    setModalEventoCalc(false);
    setModalOpCalc(true);
  }

  function salvarOpCalc(op) {
    setData(d => ({
      ...d,
      eventos: d.eventos.map(ev => ev.id !== eventoAlvoId ? ev : {
        ...ev,
        operacoes: [...(ev.operacoes || []), op],
      }),
    }));
    setCalcRascunho(null);
    setEventoAlvoId(null);
    setModalOpCalc(false);
  }

  function cancelarOpCalc() {
    setCalcRascunho(null);
    setEventoAlvoId(null);
    setModalOpCalc(false);
  }
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
  const maxLucro = Math.max(...lucrosPorDia.map(d => Math.abs(d.lucro)), 1);

  const ultimasOps = todosEventos
    .flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev })))
    .sort((a, b) => new Date(b.op.criadoEm || 0) - new Date(a.op.criadoEm || 0));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div className="dash-title" style={{ color: G.text }}>Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Card de acesso rápido à calculadora */}
          <button onClick={() => setModalCalc(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: G.surface2, border: "1px solid rgba(255,255,255,0.10)",
            borderRadius: 7, padding: "7px 14px", cursor: "pointer",
            color: G.textDim, fontSize: 13, fontWeight: 600,
            transition: "border-color 0.15s, color 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.35)"; e.currentTarget.style.color = G.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)"; e.currentTarget.style.color = G.textDim; }}
          >
            <span style={{ fontSize: 15 }}>🧮</span>
            Calculadora
          </button>

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
          { label: "Lucro do Mês",  value: fmt(lucroMes),   cor: lucroMes  >= 0 ? G.green : G.red, sub: mediaUltimosMeses !== null ? `média ${fmt(mediaUltimosMeses)}/mês` : null, subCor: mediaUltimosMeses !== null ? (mediaUltimosMeses >= 0 ? G.green : G.red) : G.textMuted, clicavel: true },
          { label: "Operações",     value: totalOps,        cor: G.text,   sub: `média ${mediaOpsDia.toFixed(1)} ops/dia`,  subCor: G.textMuted },
          { label: "Lucro do Dia",  value: fmt(lucroHoje),  cor: lucroHoje >= 0 ? G.green : G.red, sub: `média ${fmt(mediaDiaria)}/dia no mês`, subCor: mediaDiaria >= 0 ? G.green : G.red },
        ].map(k => (
          <Card key={k.label}
            className="dash-kpi-card"
            onClick={k.clicavel ? () => setModalDetalhes(true) : undefined}
            style={{
              textAlign: "center", padding: "20px 14px 18px",
              cursor: k.clicavel ? "pointer" : "default",
              border: "1px solid rgba(255,255,255,0.10)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.3)",
              position: "relative", overflow: "hidden",
            }}>
            {/* Barra gradiente de topo — identidade EdgeArb */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
            <div style={{ fontSize: 10, color: G.textMuted, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
              {k.label}{k.clicavel && <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.6 }}>↗</span>}
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
            {lucrosPorDia.map(({ dia, lucro }) => {
              const h      = Math.max(3, (Math.abs(lucro) / maxLucro) * 68);
              const isZero = lucro === 0;
              const barBg  = isZero
                ? "rgba(255,255,255,0.05)"
                : lucro > 0
                  ? "linear-gradient(to top, #047857, #34D399)"
                  : "linear-gradient(to top, #9F1239, #F87171)";
              return (
                <div key={dia} title={`Dia ${dia}: ${fmt(lucro)}`}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0%", minWidth: 0 }}>
                  <div style={{ width: "100%", height: h, background: barBg, borderRadius: "3px 3px 0 0" }} />
                  {diasNoMes <= 15 && <div style={{ fontSize: 8, color: G.textMuted, marginTop: 3, lineHeight: 1 }}>{dia}</div>}
                </div>
              );
            })}
          </div>
          {/* baseline */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.10)", marginTop: 1 }} />
          {diasNoMes > 15 && (
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 2px 6px" }}>
              <span style={{ fontSize: 9, color: G.textMuted }}>1</span>
              <span style={{ fontSize: 9, color: G.textMuted }}>{Math.round(diasNoMes / 2)}</span>
              <span style={{ fontSize: 9, color: G.textMuted }}>{diasNoMes}</span>
            </div>
          )}
          {diasNoMes <= 15 && <div style={{ height: 6 }} />}
        </div>
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
          <div style={{ background: "#FBBF2411", border: "1px solid #FBBF2444", borderRadius: 8, padding: "10px 14px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>⏰</span>
            <span style={{ fontSize: 13, color: G.yellow, fontWeight: 600 }}>
              {urgentes.length} freebet{urgentes.length !== 1 ? "s" : ""} vencendo em breve!
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

      <ModalDetalhesMes open={modalDetalhes} onClose={() => setModalDetalhes(false)} data={data} mesSel={mesSel} />

      <ModalCalculadora
        open={modalCalc}
        onClose={() => setModalCalc(false)}
        onUsarNaOp={handleUsarNaOp}
      />

      <ModalSelecionarEvento
        open={modalSel}
        onClose={() => setModalSel(false)}
        eventos={data.eventos || []}
        onSelecionarEvento={handleSelecionarEvento}
        onCriarNovoEvento={handleCriarNovoEvento}
      />

      <ModalEvento
        open={modalEventoCalc}
        onClose={() => setModalEventoCalc(false)}
        onSalvar={salvarEventoCalc}
        eventosList={data.eventos || []}
      />

      {eventoAlvoId && (
        <ModalOperacao
          open={modalOpCalc}
          onClose={cancelarOpCalc}
          onSalvar={salvarOpCalc}
          casas={data.casas || []}
          evento={(data.eventos || []).find(ev => ev.id === eventoAlvoId) ?? null}
          rascunhoCalc={calcRascunho}
        />
      )}

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
