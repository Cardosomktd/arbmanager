import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { fmt, fmtOdd, getCasaNome } from "../../../utils/format";
import { lucroEfetivoOp } from "../../../utils/calculos";
import { lucroAvulsa } from "../../../utils/lucroAvulsa";
import { lucroCassino } from "../../../utils/lucroCassino";
import { lucroProtecao } from "../../../utils/lucroProtecao";
import { statusOp } from "../../../utils/status";
import { Modal } from "../../../components/ui/Modal";

// Extrai número do dia de "YYYY-MM-DD..." sem conversão de fuso (igual ao Dashboard)
const diaStr = d => parseInt((d || "").slice(8, 10), 10);

// ── Sub-componentes de UI ─────────────────────────────────────────────────────

function TagStatus({ st }) {
  const cfg = {
    pendente:   { label: "PEND",  cor: G.yellow  },
    parcial:    { label: "PARC",  cor: G.accent  },
    finalizada: { label: "FIN",   cor: G.green   },
    green:      { label: "GREEN", cor: G.green   },
    red:        { label: "RED",   cor: G.red     },
  }[st] || { label: (st || "?").toUpperCase(), cor: G.textMuted };
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
      color: cfg.cor, background: `${cfg.cor}20`,
      border: `1px solid ${cfg.cor}44`,
      borderRadius: 4, padding: "1px 8px",
    }}>
      {cfg.label}
    </span>
  );
}

function LinhaItem({ children }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", justifyContent: "space-between",
      padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
    }}>
      {children}
    </div>
  );
}

function ValorLinha({ v, muted }) {
  const cor = v == null ? G.textMuted : v >= 0 ? G.green : G.red;
  return (
    <div style={{ flexShrink: 0, marginLeft: 14, textAlign: "right" }}>
      <span style={{
        fontFamily: "'Barlow Condensed'", fontSize: 16, fontWeight: 700,
        color: muted ? G.textMuted : cor,
      }}>
        {v == null ? "—" : fmt(v)}
      </span>
      {muted && <div style={{ fontSize: 9, color: G.textMuted, marginTop: 1 }}>mín</div>}
    </div>
  );
}

function ItemOp({ op, ev, casas }) {
  const st     = statusOp(op);
  const lucro  = lucroEfetivoOp(op);
  const isPend = st === "pendente";
  const entSummary = (op.entradas || [])
    .map(e => `${getCasaNome(casas, e.casa)} · ${e.entradaDisplay || e.entrada} @${fmtOdd(e.odd)}`)
    .join("  ·  ");
  return (
    <LinhaItem>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
          <TagStatus st={st} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.nome}</span>
        </div>
        {entSummary && (
          <div style={{ fontSize: 11, color: G.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entSummary}
          </div>
        )}
      </div>
      <ValorLinha v={lucro} muted={isPend} />
    </LinhaItem>
  );
}

function ItemProtecao({ p, ev, casas }) {
  const lucro  = lucroProtecao(p);
  const isPend = p.situacao === "pendente";
  return (
    <LinhaItem>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <TagStatus st={p.situacao} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.nome}</span>
          <span style={{ fontSize: 11, color: G.purple }}>🛡️ Proteção</span>
        </div>
        <div style={{ fontSize: 11, color: G.textDim }}>
          {getCasaNome(casas, p.casa)} · {p.entrada} @{fmtOdd(p.odd)} · {fmt(parseFloat(p.valor) || 0)}
        </div>
      </div>
      <ValorLinha v={isPend ? null : lucro} />
    </LinhaItem>
  );
}

const BINGO_TIPO_LABEL = {
  freebet:       { label: "🎁 Freebet", color: G.green  },
  bonus:         { label: "🎰 Bônus",   color: G.accent },
  dinheiro_real: null,
};

function getBingoTipoValor(a) {
  if (a.tipoValor) return a.tipoValor;
  if (a.freebet === true) return "freebet";
  return "dinheiro_real";
}

function ItemAvulsa({ a, casas }) {
  const lucro     = lucroAvulsa(a);
  const isPend    = a.situacao === "pendente";
  const tipoValor = getBingoTipoValor(a);
  const tipoMeta  = BINGO_TIPO_LABEL[tipoValor] ?? null;
  return (
    <LinhaItem>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <TagStatus st={a.situacao} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{a.nome}</span>
          <span style={{ fontSize: 11, color: G.yellow }}>🎰 Bingo</span>
          {tipoMeta && (
            <span style={{ fontSize: 11, color: tipoMeta.color }}>{tipoMeta.label}</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: G.textDim }}>
          {getCasaNome(casas, a.casa)}{a.entrada ? ` · ${a.entrada}` : ""} @{fmtOdd(a.odd)} · {fmt(parseFloat(a.valor) || 0)}
        </div>
      </div>
      <ValorLinha v={isPend ? null : lucro} />
    </LinhaItem>
  );
}

function ItemCassino({ c, casas }) {
  const lucro     = lucroCassino(c);
  const tipoLabel = { giros: "🎡 Giros", bonus: "🎰 Bônus", cashback: "💰 Cashback", dinheiro_real: "💵 Dinheiro real" }[c.tipoBeneficio] ?? "🎲";
  return (
    <LinhaItem>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
          <span style={{ fontSize: 11, color: G.green }}>{tipoLabel}</span>
        </div>
        <div style={{ fontSize: 11, color: G.textDim }}>
          {getCasaNome(casas, c.casa)}
          {c.valorApostado > 0 && ` · apostado: ${fmt(c.valorApostado)}`}
        </div>
      </div>
      <ValorLinha v={lucro} />
    </LinhaItem>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ModalDetalhesDias({ open, onClose, data, mesSel }) {
  const [anoSel, mesMes] = (mesSel || "2026-01").split("-").map(Number);
  const [abertos, setAbertos] = useState(new Set());

  // Todos os dias fechados ao (re)abrir o modal
  useEffect(() => {
    if (open) setAbertos(new Set());
  }, [open]);

  const toggle = dia => setAbertos(prev => {
    const next = new Set(prev);
    next.has(dia) ? next.delete(dia) : next.add(dia);
    return next;
  });

  const casas        = data.casas    || [];
  const todosEventos = data.eventos  || [];

  // Mesmo filtro de mês do Dashboard
  function opDoMes(ev) {
    const d = new Date(ev.data);
    return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes;
  }

  const todasOpsDoMes = todosEventos.flatMap(ev =>
    (ev.operacoes || []).map(op => ({ op, ev })).filter(({ ev }) => opDoMes(ev))
  );
  const avulsasDoMes = (data.apostasAvulsas || []).filter(a => {
    const d = new Date(a.data);
    return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes;
  });
  const cassinosDoMes = (data.cassinos || []).filter(c => {
    const d = new Date(c.data);
    return d.getFullYear() === anoSel && d.getMonth() + 1 === mesMes;
  });
  // Proteções com referência ao evento-pai (para obter a data)
  const protecoesMes = todosEventos
    .filter(ev => opDoMes(ev))
    .flatMap(ev => (ev.protecoes || []).map(p => ({ p, ev })));

  const diasNoMes = new Date(anoSel, mesMes, 0).getDate();

  // Agrupa por dia — mesma lógica de lucrosPorDia no Dashboard
  const diasComDados = [];
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const ops   = todasOpsDoMes.filter(({ ev }) => diaStr(ev.data) === dia);
    const avs   = avulsasDoMes.filter(a => diaStr(a.data) === dia);
    const cass  = cassinosDoMes.filter(c => diaStr(c.data) === dia);
    const prots = protecoesMes.filter(({ ev }) => diaStr(ev.data) === dia);

    const total = ops.length + avs.length + cass.length + prots.length;
    if (total === 0) continue; // dias sem atividade não aparecem

    // Lucro idêntico ao calculado no gráfico
    const lucro =
      ops.reduce((s, { op }) => s + lucroEfetivoOp(op), 0) +
      avs.reduce((s, a)      => s + lucroAvulsa(a),     0) +
      cass.reduce((s, c)     => s + lucroCassino(c),    0) +
      prots.reduce((s, { p }) => s + lucroProtecao(p),  0);

    diasComDados.push({ dia, ops, avs, cass, prots, total, lucro });
  }

  const lucroTotal = diasComDados.reduce((s, d) => s + d.lucro, 0);
  const mesNome    = new Date(anoSel, mesMes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesLabel   = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

  return (
    <Modal open={open} onClose={onClose} title={`Detalhes Diários — ${mesLabel}`} width={680}>

      {/* ── KPI resumo ────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: G.surface2, border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 10, padding: "14px 18px", marginBottom: 18,
      }}>
        <div>
          <div style={{ fontSize: 9, color: G.textMuted, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
            Total do mês
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 26, fontWeight: 800, color: lucroTotal >= 0 ? G.green : G.red, lineHeight: 1 }}>
            {fmt(lucroTotal)}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, color: G.textMuted, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 }}>
            Dias com atividade
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 26, fontWeight: 800, color: G.text, lineHeight: 1 }}>
            {diasComDados.length}
          </div>
        </div>
      </div>

      {/* ── Lista de dias ─────────────────────────────────────────────────── */}
      {diasComDados.length === 0 ? (
        <div style={{ textAlign: "center", padding: "32px", color: G.textMuted, fontSize: 13 }}>
          Nenhuma operação registrada neste mês.
        </div>
      ) : diasComDados.map(({ dia, ops, avs, cass, prots, total, lucro }) => {
        const isAberto = abertos.has(dia);
        const diaLabel = String(dia).padStart(2, "0");
        return (
          <div key={dia} style={{ border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>

            {/* Cabeçalho do dia */}
            <div
              onClick={() => toggle(dia)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", cursor: "pointer",
                background: G.surface2, userSelect: "none",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = G.surface3; }}
              onMouseLeave={e => { e.currentTarget.style.background = G.surface2; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 9, color: G.textMuted }}>{isAberto ? "▼" : "▶"}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: G.text }}>
                  Dia {diaLabel}
                </span>
                <span style={{
                  fontSize: 10, color: G.textMuted,
                  background: G.surface, borderRadius: 4,
                  padding: "1px 7px", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  {total}
                </span>
              </div>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700,
                color: lucro >= 0 ? G.green : G.red,
              }}>
                {fmt(lucro)}
              </span>
            </div>

            {/* Conteúdo expandido */}
            {isAberto && (
              <div style={{ padding: "0 14px 10px", background: "#182033" }}>
                {ops.map(({ op, ev })  => <ItemOp        key={op.id} op={op} ev={ev} casas={casas} />)}
                {prots.map(({ p, ev }) => <ItemProtecao  key={p.id}  p={p}  ev={ev} casas={casas} />)}
                {avs.map(a             => <ItemAvulsa    key={a.id}  a={a}           casas={casas} />)}
                {cass.map(c            => <ItemCassino   key={c.id}  c={c}           casas={casas} />)}
              </div>
            )}
          </div>
        );
      })}
    </Modal>
  );
}
