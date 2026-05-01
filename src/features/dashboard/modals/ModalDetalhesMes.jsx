import { useState, useEffect } from "react";
import { G, GRAD } from "../../../constants/colors";
import { fmt, fmtDate, fmtOdd, getCasaNome, parseDateLocal } from "../../../utils/format";
import { lucroEfetivoOp } from "../../../utils/calculos";
import { lucroAvulsa } from "../../../utils/lucroAvulsa";
import { lucroCassino } from "../../../utils/lucroCassino";
import { lucroProtecao } from "../../../utils/lucroProtecao";
import { statusOp } from "../../../utils/status";
import { resolveCategoria, CATEGORIAS } from "../../../utils/categoriaOp";
import { Modal } from "../../../components/ui/Modal";
import { getFreebets } from "../../../utils/freebets";

// ── Helpers de cálculo ────────────────────────────────────────────────────────

// Verifica se a condição de geração de freebet foi atingida (espelha getFreebets)
function fbAtingida(op) {
  if (!op.geraFreebet) return false;
  const { condicao, entradaGatilhoId } = op.geraFreebet;
  const ents = op.entradas || [];
  if (entradaGatilhoId) {
    const g = ents.find(e => e.id === entradaGatilhoId);
    if (!g || g.situacao === "pendente") return false;
    if (condicao === "qualquer") return true;
    return condicao === g.situacao;
  }
  // Legado: avalia todas as entradas
  if (!ents.every(e => e.situacao !== "pendente")) return false;
  const temGreen = ents.some(e => e.situacao === "green");
  const temRed   = ents.some(e => e.situacao === "red");
  if (condicao === "qualquer") return true;
  if (condicao === "green")   return temGreen;
  if (condicao === "red")     return temRed && !temGreen;
  return false;
}

const sum = (arr, fn) => arr.reduce((s, x) => s + fn(x), 0);
const r2  = v => Math.round(v * 100) / 100;

// Título padronizado de seção a partir de CATEGORIAS
const tituloSecao = cat => `${CATEGORIAS[cat].emoji} ${CATEGORIAS[cat].label.toUpperCase()}`;

// ── Sub-componentes de UI ─────────────────────────────────────────────────────

function TagStatus({ st }) {
  const cfg = {
    pendente:   { label: "PEND",  cor: G.yellow   },
    parcial:    { label: "PARC",  cor: G.accent   },
    finalizada: { label: "FIN",   cor: G.green    },
    green:      { label: "GREEN", cor: G.green    },
    red:        { label: "RED",   cor: G.red      },
  }[st] || { label: (st || "?").toUpperCase(), cor: G.textMuted };

  return (
    <span style={{
      fontSize: 10, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
      color: cfg.cor,
      background: `${cfg.cor}20`,
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
      <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 16, fontWeight: 700, color: muted ? G.textMuted : cor }}>
        {v == null ? "—" : fmt(v)}
      </span>
      {muted && <div style={{ fontSize: 9, color: G.textMuted, marginTop: 1 }}>mín</div>}
    </div>
  );
}

// hideMinPend: se true, ops pendentes mostram "—" em vez do lucro mínimo (duplo)
function ItemOp({ op, ev, casas, hideMinPend = false }) {
  const st     = statusOp(op);
  const lucro  = lucroEfetivoOp(op);
  const isPend = st === "pendente";
  const valor  = (isPend && hideMinPend) ? null : lucro;
  const muted  = isPend && !hideMinPend;

  const entSummary = (op.entradas || [])
    .map(e => `${getCasaNome(casas, e.casa)} · ${e.entradaDisplay || e.entrada} @${fmtOdd(e.odd)}`)
    .join("  ·  ");

  return (
    <LinhaItem>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
          <TagStatus st={st} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{ev.nome}</span>
          <span style={{ fontSize: 11, color: G.textMuted }}>{fmtDate(ev.data)}</span>
        </div>
        {entSummary && (
          <div style={{ fontSize: 11, color: G.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entSummary}
          </div>
        )}
      </div>
      <ValorLinha v={valor} muted={muted} />
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

function Secao({ titulo, cor, count, subtotal, aberto, onToggle, children }) {
  if (count === 0) return null;
  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.09)", borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
      <div onClick={onToggle} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", cursor: "pointer", background: G.surface2,
        userSelect: "none", borderLeft: `3px solid ${cor}`,
        transition: "background 0.15s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = G.surface3; }}
        onMouseLeave={e => { e.currentTarget.style.background = G.surface2; }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 9, color: G.textMuted }}>{aberto ? "▼" : "▶"}</span>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: cor }}>{titulo}</span>
          <span style={{ fontSize: 10, color: G.textMuted, background: G.surface, borderRadius: 4, padding: "1px 7px", border: "1px solid rgba(255,255,255,0.07)" }}>
            {count}
          </span>
        </div>
        <span style={{
          fontFamily: "'Barlow Condensed'", fontSize: 17, fontWeight: 700,
          color: subtotal >= 0 ? G.green : G.red,
        }}>
          {fmt(subtotal)}
        </span>
      </div>
      {aberto && (
        <div style={{ padding: "0 14px 10px", background: "#182033" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function ModalDetalhesMes({ open, onClose, data, mesSel }) {
  const [anoSel, mesMes] = (mesSel || "2026-01").split("-").map(Number);
  const [abertas, setAbertas] = useState(
    { simples: false, apostaSimples: false, paraFB: false, extFB: false, duplo: false, protecoes: false, avulsas: false, cassinos: false }
  );

  useEffect(() => {
    if (open) setAbertas({ simples: false, apostaSimples: false, paraFB: false, extFB: false, duplo: false, protecoes: false, avulsas: false, cassinos: false });
  }, [open]);

  const toggle = k => setAbertas(p => ({ ...p, [k]: !p[k] }));
  const casas  = data.casas || [];

  // parseDateLocal garante que "YYYY-MM-DD" seja interpretado como hora local,
  // evitando shift de timezone que jogaria datas de início de mês para o mês anterior.
  function doMes(d) {
    const dt = parseDateLocal(d);
    return dt.getFullYear() === anoSel && dt.getMonth() + 1 === mesMes;
  }

  const todosEventos = (data.eventos || []).filter(ev => doMes(ev.data));
  const avulsasDoMes = (data.apostasAvulsas || []).filter(a => doMes(a.data));
  const cassinosDoMes = (data.cassinos || []).filter(c => doMes(c.data));

  // ── Categorização via resolveCategoria ────────────────────────────────────
  const opsSimples = [], opsApostaSimples = [], opsParaFB = [], opsExtFB = [], opsDuplo = [];
  todosEventos.forEach(ev => {
    (ev.operacoes || []).forEach(op => {
      const cat = resolveCategoria(op);
      if      (cat === "simples")              opsApostaSimples.push({ op, ev });
      else if (cat === "duplo")                opsDuplo.push({ op, ev });
      else if (cat === "extracao_freebet")     opsExtFB.push({ op, ev });
      else if (cat === "procedimento_freebet") opsParaFB.push({ op, ev });
      else                                     opsSimples.push({ op, ev });
    });
  });

  const protecoesMes = todosEventos.flatMap(ev => (ev.protecoes || []).map(p => ({ p, ev })));
  const isFinal = op => statusOp(op) === "finalizada";

  // ── Subtotais por seção (usados nos headers das seções) ───────────────────

  // Arbitragem simples
  const lucroSimples = sum(opsSimples, ({ op }) => lucroEfetivoOp(op));

  // Aposta Simples
  const lucroApostaSimples = sum(opsApostaSimples, ({ op }) => lucroEfetivoOp(op));

  // Procedimento Freebet — resultado das ops
  const lucroParaFBOps = sum(opsParaFB, ({ op }) => lucroEfetivoOp(op));

  // Procedimento Freebet — freebets geradas (65% de extração)
  // Realizadas: condição já atingida | Estimadas: não atingida E op não finalizada
  const fbNominalReal = sum(
    opsParaFB.filter(({ op }) => fbAtingida(op) && op.geraFreebet?.tipoBeneficio !== "cashback"),
    ({ op }) => op.geraFreebet?.valor || 0
  );
  const fbNominalEst = sum(
    opsParaFB.filter(({ op }) => !fbAtingida(op) && !isFinal(op) && op.geraFreebet?.tipoBeneficio !== "cashback"),
    ({ op }) => op.geraFreebet?.valor || 0
  );
  const fbExtReal = r2(fbNominalReal * 0.65);
  const fbExtEst  = r2(fbNominalEst  * 0.65);

  // Subtotal da seção Proc. Freebet = lucro ops + fb realizadas + fb estimadas
  const lucroParaFB = lucroParaFBOps + fbExtReal + fbExtEst;

  // Extração de Freebet
  const lucroExtFB = sum(opsExtFB, ({ op }) => lucroEfetivoOp(op));

  // Duplo Chance — pendentes contribuem com o lucro mínimo (mesmo comportamento das demais seções)
  const realizadoDuplo = sum(opsDuplo, ({ op }) => lucroEfetivoOp(op));

  // Proteções (pendente → 0, via lucroProtecao)
  const lucroProtecoes = sum(protecoesMes, ({ p }) => lucroProtecao(p));

  // Apostas avulsas/Bingo (pendente → 0, via lucroAvulsa)
  const lucroAvulsas = sum(avulsasDoMes, a => lucroAvulsa(a));

  // Cassinos — lucro direto
  const lucroCassinos = sum(cassinosDoMes, c => lucroCassino(c));

  // ── KPIs do topo ─────────────────────────────────────────────────────────
  //
  // Lucro atual:
  //   Todas as ops via lucroEfetivoOp (finalizadas=real, pendentes=mín)
  //   + proteções finalizadas + avulsas/Bingo finalizados
  //   SEM somar o valor das freebets
  const todosOps   = [...opsSimples, ...opsApostaSimples, ...opsParaFB, ...opsExtFB, ...opsDuplo];
  const lucroAtual = r2(sum(todosOps, ({ op }) => lucroEfetivoOp(op)) + lucroProtecoes + lucroAvulsas + lucroCassinos);

  // Freebets disponíveis: mesma regra da aba Freebets
  // (saldo atual de itens não usados, inclusive carteira acumulada)
  const _hoje = new Date(); _hoje.setHours(0, 0, 0, 0);
  const _todasFb = getFreebets(data).map(f => ({ ...f, _isBonus: false }));
  const _todasBn = (data.bonus || []).map(b => ({ ...b, _isBonus: true }));
  const _ativas  = [..._todasFb, ..._todasBn].filter(f => {
    if (f.tipo === "acumulada") return (f.saldo ?? f.valor ?? 0) > 0;
    return !f.usada && (f.saldo ?? f.valor ?? 0) > 0 && (f.prazo ? new Date(f.prazo) >= _hoje : true);
  });
  const fbDisponivel    = r2(_ativas.reduce((s, f) => s + (f.saldo ?? f.valor ?? 0), 0));
  const fbLucroEstimado = r2(fbDisponivel * 0.65);

  // Total previsto: lucro atual + lucro estimado das freebets disponíveis
  const totalPrevisto = r2(lucroAtual + fbLucroEstimado);

  const mesNome  = new Date(anoSel, mesMes - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const mesLabel = mesNome.charAt(0).toUpperCase() + mesNome.slice(1);

  return (
    <Modal open={open} onClose={onClose} title={`Detalhes — ${mesLabel}`} width={700}>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>

        {/* Card 1 — Lucro atual */}
        <div style={{
          background: G.surface2, borderRadius: 10, padding: "16px 14px", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
          <div style={{ fontSize: 9, color: G.textMuted, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
            Lucro atual
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: lucroAtual >= 0 ? G.green : G.red, lineHeight: 1 }}>
            {fmt(lucroAtual)}
          </div>
          <div style={{ fontSize: 10, color: G.textMuted, marginTop: 6 }}>ops + proteções + bingo</div>
        </div>

        {/* Card 2 — Freebets disponíveis */}
        <div style={{
          background: G.surface2, borderRadius: 10, padding: "16px 14px", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
          <div style={{ fontSize: 9, color: G.textMuted, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
            Freebets disponíveis
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: fbDisponivel > 0 ? G.yellow : G.textMuted, lineHeight: 1 }}>
            {fmt(fbDisponivel)}
          </div>
          <div style={{ fontSize: 10, color: G.textMuted, marginTop: 6 }}>
            Est.:{" "}
            <span style={{ color: fbLucroEstimado > 0 ? G.green : G.textMuted, fontWeight: 600 }}>
              {fmt(fbLucroEstimado)}
            </span>
          </div>
        </div>

        {/* Card 3 — Total previsto */}
        <div style={{
          background: G.surface2, borderRadius: 10, padding: "16px 14px", textAlign: "center",
          border: "1px solid rgba(255,255,255,0.09)",
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: GRAD }} />
          <div style={{ fontSize: 9, color: G.textMuted, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 }}>
            Total previsto
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: totalPrevisto >= 0 ? G.green : G.red, lineHeight: 1 }}>
            {fmt(totalPrevisto)}
          </div>
          <div style={{ fontSize: 10, color: G.textMuted, marginTop: 6 }}>lucro + est. freebets</div>
        </div>
      </div>

      {/* ── Arbitragem ────────────────────────────────────────────────────── */}
      <Secao
        titulo={tituloSecao("arbitragem")} cor={CATEGORIAS.arbitragem.cor}
        count={opsSimples.length} subtotal={lucroSimples}
        aberto={abertas.simples} onToggle={() => toggle("simples")}
      >
        {opsSimples.map(({ op, ev }) => (
          <ItemOp key={op.id} op={op} ev={ev} casas={casas} />
        ))}
      </Secao>

      {/* ── Aposta Simples ────────────────────────────────────────────────── */}
      <Secao
        titulo={tituloSecao("simples")} cor={CATEGORIAS.simples.cor}
        count={opsApostaSimples.length} subtotal={lucroApostaSimples}
        aberto={abertas.apostaSimples} onToggle={() => toggle("apostaSimples")}
      >
        {opsApostaSimples.map(({ op, ev }) => (
          <ItemOp key={op.id} op={op} ev={ev} casas={casas} />
        ))}
      </Secao>

      {/* ── Proc. Freebet ─────────────────────────────────────────────────── */}
      <Secao
        titulo={tituloSecao("procedimento_freebet")} cor={CATEGORIAS.procedimento_freebet.cor}
        count={opsParaFB.length} subtotal={lucroParaFB}
        aberto={abertas.paraFB} onToggle={() => toggle("paraFB")}
      >
        {opsParaFB.map(({ op, ev }) => (
          <ItemOp key={op.id} op={op} ev={ev} casas={casas} />
        ))}
        {(fbNominalReal > 0 || fbNominalEst > 0) && (
          <div style={{ marginTop: 8, background: G.surface, borderRadius: 6, padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: G.textDim, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
              Freebets geradas
            </div>
            {fbNominalReal > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: G.textDim }}>Realizadas · {fmt(fbNominalReal)} × 65%</span>
                <span style={{ color: G.green, fontWeight: 600 }}>{fmt(fbExtReal)}</span>
              </div>
            )}
            {fbNominalEst > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: G.textDim }}>Estimadas · {fmt(fbNominalEst)} × 65%</span>
                <span style={{ color: G.yellow, fontWeight: 600 }}>{fmt(fbExtEst)}</span>
              </div>
            )}
          </div>
        )}
      </Secao>

      {/* ── Ext. Freebet ──────────────────────────────────────────────────── */}
      <Secao
        titulo={tituloSecao("extracao_freebet")} cor={CATEGORIAS.extracao_freebet.cor}
        count={opsExtFB.length} subtotal={lucroExtFB}
        aberto={abertas.extFB} onToggle={() => toggle("extFB")}
      >
        {opsExtFB.map(({ op, ev }) => (
          <ItemOp key={op.id} op={op} ev={ev} casas={casas} />
        ))}
      </Secao>

      {/* ── Chance de Duplo ───────────────────────────────────────────────── */}
      <Secao
        titulo={tituloSecao("duplo")} cor={CATEGORIAS.duplo.cor}
        count={opsDuplo.length} subtotal={realizadoDuplo}
        aberto={abertas.duplo} onToggle={() => toggle("duplo")}
      >
        {opsDuplo.map(({ op, ev }) => (
          <ItemOp key={op.id} op={op} ev={ev} casas={casas} />
        ))}
      </Secao>

      {/* ── Proteções ─────────────────────────────────────────────────────── */}
      <Secao
        titulo="🛡️ PROTEÇÕES" cor="#8B5CF6"
        count={protecoesMes.length} subtotal={lucroProtecoes}
        aberto={abertas.protecoes} onToggle={() => toggle("protecoes")}
      >
        {protecoesMes.map(({ p, ev }) => (
          <ItemProtecao key={p.id} p={p} ev={ev} casas={casas} />
        ))}
      </Secao>

      {/* ── Apostas / Bingo ───────────────────────────────────────────────── */}
      <Secao
        titulo="🎰 BINGO" cor={G.yellow}
        count={avulsasDoMes.length} subtotal={lucroAvulsas}
        aberto={abertas.avulsas} onToggle={() => toggle("avulsas")}
      >
        {avulsasDoMes.map(a => (
          <ItemAvulsa key={a.id} a={a} casas={casas} />
        ))}
      </Secao>

      {/* ── Cassino ───────────────────────────────────────────────────────── */}
      <Secao
        titulo="🎲 CASSINO" cor={G.green}
        count={cassinosDoMes.length} subtotal={lucroCassinos}
        aberto={abertas.cassinos} onToggle={() => toggle("cassinos")}
      >
        {cassinosDoMes.map(c => {
          const lucro = lucroCassino(c);
          const tipoLabel = { giros: "🎡 Giros", bonus: "🎰 Bônus", cashback: "💰 Cashback", dinheiro_real: "💵 Dinheiro real" }[c.tipoBeneficio] ?? "🎲";
          return (
            <LinhaItem key={c.id}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
                  <span style={{ fontSize: 10, color: G.textMuted }}>{fmtDate(c.data)}</span>
                </div>
                <div style={{ fontSize: 11, color: G.textDim }}>
                  {getCasaNome(casas, c.casa)} · {tipoLabel}
                  {c.valorApostado > 0 && ` · apostado: ${fmt(c.valorApostado)}`}
                </div>
              </div>
              <ValorLinha v={lucro} />
            </LinhaItem>
          );
        })}
      </Secao>

    </Modal>
  );
}
