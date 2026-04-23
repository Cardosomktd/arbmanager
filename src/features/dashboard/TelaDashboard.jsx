import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt, fmtDate, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp } from "../../utils/calculos";
import { statusOp } from "../../utils/status";
import { lucroAvulsa } from "../../utils/lucroAvulsa";
import { lucroCassino } from "../../utils/lucroCassino";
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
  const cassinosDoMes   = (data.cassinos || []).filter(c => { const d = new Date(c.data); return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes; });
  const protecoesMes    = todosEventos.filter(ev => opDoMes(ev)).flatMap(ev => ev.protecoes || []);
  const lucroMes        = todasOpsDoMes.reduce((s, { op }) => s + lucroEfetivoOp(op), 0)
    + avulsasDoMes.reduce((s, a) => s + lucroAvulsa(a), 0)
    + cassinosDoMes.reduce((s, c) => s + lucroCassino(c), 0)
    + protecoesMes.reduce((s, p) => s + lucroProtecaoDash(p), 0);

  const hojeStr  = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
  const lucroHoje = todosEventos.flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev }))).filter(({ ev }) => (ev.data || "").slice(0, 10) === hojeStr).reduce((s, { op }) => s + lucroEfetivoOp(op), 0)
    + (data.apostasAvulsas || []).filter(a => (a.data || "").slice(0, 10) === hojeStr).reduce((s, a) => s + lucroAvulsa(a), 0)
    + (data.cassinos || []).filter(c => (c.data || "").slice(0, 10) === hojeStr).reduce((s, c) => s + lucroCassino(c), 0)
    + todosEventos.filter(ev => (ev.data || "").slice(0, 10) === hojeStr).flatMap(ev => ev.protecoes || []).reduce((s, p) => s + lucroProtecaoDash(p), 0);

  const diasComOps   = new Set([
    ...todasOpsDoMes.map(({ ev }) => new Date(ev.data).getDate()),
    ...avulsasDoMes.map(a => new Date(a.data).getDate()),
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
    const lucroProtM = evDoMesM.flatMap(ev => ev.protecoes || []).reduce((s, p) => s + lucroProtecaoDash(p), 0);
    return lucroOpsM + lucroAvM + lucroCasM + lucroProtM;
  });
  const mediaUltimosMeses = lucrosPorMes.length > 0 ? lucrosPorMes.reduce((a, b) => a + b, 0) / lucrosPorMes.length : null;

  const diasNoMes    = new Date(anoSel, mesMes, 0).getDate();
  const lucrosPorDia = Array.from({ length: diasNoMes }, (_, i) => {
    const dia  = i + 1;
    const lOps = todasOpsDoMes.filter(({ ev }) => new Date(ev.data).getDate() === dia).reduce((s, { op }) => s + lucroEfetivoOp(op), 0);
    const lAv  = avulsasDoMes.filter(a => new Date(a.data).getDate() === dia).reduce((s, a) => s + lucroAvulsa(a), 0);
    const lCas = cassinosDoMes.filter(c => new Date(c.data).getDate() === dia).reduce((s, c) => s + lucroCassino(c), 0);
    const lProt = protecoesMes.filter(p => {
      // Proteções são indexadas pelo evento — busca o evento-pai para pegar a data
      const ev = todosEventos.find(ev => (ev.protecoes || []).some(pp => pp.id === p.id));
      return ev && new Date(ev.data).getDate() === dia;
    }).reduce((s, p) => s + lucroProtecaoDash(p), 0);
    return { dia, lucro: lOps + lAv + lCas + lProt };
  });
  const maxLucro = Math.max(...lucrosPorDia.map(d => Math.abs(d.lucro)), 1);

  const ultimasOps = todosEventos
    .flatMap(ev => (ev.operacoes || []).map(op => ({ op, ev })))
    .sort((a, b) => new Date(b.op.criadoEm || 0) - new Date(a.op.criadoEm || 0));

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div className="dash-title" style={{ color: G.accent }}>Dashboard</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Card de acesso rápido à calculadora */}
          <button onClick={() => setModalCalc(true)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: G.surface2, border: `1px solid ${G.border}`,
            borderRadius: 6, padding: "6px 12px", cursor: "pointer",
            color: G.textDim, fontSize: 13, fontWeight: 600,
            fontFamily: "'DM Sans', sans-serif",
            transition: "border-color 0.15s, color 0.15s",
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = G.accent; e.currentTarget.style.color = G.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textDim; }}
          >
            <span style={{ fontSize: 15 }}>🧮</span>
            Calculadora
          </button>

          <select value={mesSel} onChange={e => setMesSel(e.target.value)}
            style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "6px 12px", color: G.text, fontSize: 13 }}>
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
          { label: "Lucro do Mês",   value: fmt(lucroMes),   cor: lucroMes  >= 0 ? G.green : G.red, sub: mediaUltimosMeses !== null ? `média ${fmt(mediaUltimosMeses)}/mês` : null, subCor: mediaUltimosMeses !== null ? (mediaUltimosMeses >= 0 ? G.green : G.red) : G.textMuted, clicavel: true },
          { label: "Operações",      value: totalOps,        cor: G.accent, sub: `média ${mediaOpsDia.toFixed(1)}/dia`, subCor: G.textMuted },
          { label: "Lucro do Dia",   value: fmt(lucroHoje),  cor: lucroHoje >= 0 ? G.green : G.red, sub: `média ${fmt(mediaDiaria)}/dia no mês`, subCor: mediaDiaria >= 0 ? G.green : G.red },
        ].map(k => (
          <Card key={k.label}
            className="dash-kpi-card"
            onClick={k.clicavel ? () => setModalDetalhes(true) : undefined}
            style={{ textAlign: "center", padding: "16px 12px", cursor: k.clicavel ? "pointer" : "default", transition: "border-color 0.15s", ...(k.clicavel ? { borderColor: "#2a3d5e" } : {}) }}>
            <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>
              {k.label}{k.clicavel && <span style={{ color: G.textMuted, marginLeft: 4, fontSize: 10 }}>↗</span>}
            </div>
            <div className="dash-kpi-value" style={{ color: k.cor }}>{k.value}</div>
            {k.sub && <div style={{ fontSize: 11, color: k.subCor, opacity: 0.6, marginTop: 4 }}>{k.sub}</div>}
          </Card>
        ))}
      </div>

      {/* Gráfico diário */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Resultado Diário</div>
        <div className="dash-chart-bars">
          {lucrosPorDia.map(({ dia, lucro }) => {
            const h   = Math.max(4, (Math.abs(lucro) / maxLucro) * 70);
            const cor = lucro > 0 ? G.green : lucro < 0 ? G.red : G.border;
            return (
              <div key={dia} title={`Dia ${dia}: ${fmt(lucro)}`}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: "1 1 0%", minWidth: 0 }}>
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

      {/* Últimas operações */}
      <Card>
        <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
          Últimas Operações{ultimasOps.length > 0 && <span style={{ color: G.accent }}> ({ultimasOps.length})</span>}
        </div>
        {ultimasOps.length === 0
          ? <div style={{ color: G.textMuted, fontSize: 13, textAlign: "center", padding: 20 }}>Nenhuma operação registrada ainda.</div>
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ultimasOps.slice(0, 8).map(({ op, ev }) => {
                const st    = statusOp(op);
                const lucro = lucroEfetivoOp(op);
                const stCor = { pendente: G.yellow, parcial: G.accent, finalizada: G.green }[st] ?? G.textMuted;
                const stLabel = { pendente: "Pendente", parcial: "Em andamento", finalizada: "Finalizado" }[st] ?? st;
                return (
                  <div key={op.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface2, borderRadius: 8, padding: "10px 14px", border: `1px solid ${G.border}` }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{ev.nome}</span>
                        <span style={{ fontSize: 10, color: stCor, background: `${stCor}22`, borderRadius: 3, padding: "1px 6px", fontWeight: 700 }}>{stLabel}</span>
                      </div>
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
                      <div style={{ fontSize: 10, color: G.textDim }}>{st === "pendente" ? "mín. garantido" : "lucro"}</div>
                      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700, color: lucro >= 0 ? G.green : G.red }}>{fmt(lucro)}</div>
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
