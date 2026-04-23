import { useState, useEffect, useRef } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { fmt, fmtNum, fmtOdd, getCasaNome } from "../../../utils/format";
import { calcRetorno } from "../../../utils/calculos";
import { resolveCategoria, CATEGORIAS } from "../../../utils/categoriaOp";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

const CONDICAO_OPTS = [
  { value: "qualquer", label: "Qualquer resultado" },
  { value: "green",    label: "Apenas se der Green" },
  { value: "red",      label: "Apenas se der Red" },
];

// ── Opções de tipo de operação (labels sincronizados com CATEGORIAS) ──────────
const TIPO_OP_OPTS = [
  { value: "arbitragem",           ...CATEGORIAS.arbitragem,           corAtivo: "#00d4ff22", corText: "#00d4ff" },
  { value: "procedimento_freebet", ...CATEGORIAS.procedimento_freebet, corAtivo: "#fbbf2422", corText: "#fbbf24" },
  { value: "extracao_freebet",     ...CATEGORIAS.extracao_freebet,     corAtivo: "#22c55e22", corText: "#22c55e" },
  { value: "duplo",                ...CATEGORIAS.duplo,                corAtivo: "#aa66ff33", corText: "#cc88ff" },
];

// Cor da borda e do label das entradas conforme tipo de operação
const COR_ENTRADA = {
  arbitragem:           { borda: G.border,    label: G.accent   },
  procedimento_freebet: { borda: "#fbbf2444", label: "#fbbf24"  },
  extracao_freebet:     { borda: "#22c55e44", label: "#22c55e"  },
  duplo:                { borda: "#aa66ff44", label: "#cc88ff"  },
};

// Banner informativo por tipo
const BANNERS = {
  procedimento_freebet: {
    bg:   "#fbbf240d", borda: "#fbbf2433", cor: "#fbbf24",
    texto: "🎯 Proc. Freebet — configure abaixo a freebet gerada ao completar a condição.",
  },
  extracao_freebet: {
    bg:   "#22c55e0d", borda: "#22c55e33", cor: "#22c55e",
    texto: "🎁 Ext. Freebet — marque abaixo as entradas que usam freebet para o cálculo correto do retorno líquido.",
  },
  duplo: {
    bg:   "#aa66ff0d", borda: "#aa66ff33", cor: "#cc88ff",
    texto: "🎲 Chance de Duplo — cobertura de dois resultados. Sem lucro mínimo garantido.",
  },
};

function entradaVazia() {
  return { id: uid(), casa: "", entrada: "", entradaCustom: "", multipla: false, multiplaDesc: "", odd: "", valor: "", comissao: "", tipo: "normal", situacao: "pendente", pa: false };
}

// ── Seletor de casa com busca ─────────────────────────────────────────────────
function CasaSelect({ casas, value, onChange, required }) {
  const [busca,  setBusca]  = useState("");
  const [aberto, setAberto] = useState(false);
  const wrapRef = useRef(null);

  const nomeSelecionado = value ? (casas.find(c => c.id === value)?.nome || "") : "";
  const filtradas = busca.trim()
    ? casas.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    : casas;

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAberto(false);
        setBusca("");
      }
    }
    if (aberto) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  function selecionar(id) {
    onChange(id);
    setAberto(false);
    setBusca("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        Casa {required && <span style={{ color: G.red }}>*</span>}
      </label>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <input
          value={aberto ? busca : nomeSelecionado}
          placeholder={value ? nomeSelecionado : "— selecionar —"}
          onFocus={() => { setAberto(true); setBusca(""); }}
          onChange={e => setBusca(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box",
            background: G.surface2, border: `1px solid ${aberto ? G.accent : G.border}`,
            borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none",
            cursor: "text", transition: "border-color 0.15s",
          }}
        />
        {aberto && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
            background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8,
            boxShadow: "0 8px 24px #00000055", maxHeight: 220, overflowY: "auto",
          }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 12, color: G.textMuted }}>Nenhuma casa encontrada.</div>
            ) : filtradas.map(c => (
              <div key={c.id} onMouseDown={() => selecionar(c.id)} style={{
                padding: "9px 12px", fontSize: 13, cursor: "pointer", color: c.id === value ? G.accent : G.text,
                fontWeight: c.id === value ? 700 : 400,
                background: "transparent", transition: "background 0.1s",
              }}
                onMouseEnter={e => e.currentTarget.style.background = G.surface2}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                {c.nome}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function ModalOperacao({ open, onClose, onSalvar, casas, editOp, evento }) {
  // null = nenhum tipo selecionado (novo modal); string = tipo selecionado
  const [tipoOp,      setTipoOp]      = useState(null);
  const [numEntradas, setNumEntradas] = useState(2);
  const [entradas,    setEntradas]    = useState([entradaVazia(), entradaVazia()]);
  const [fbValor,     setFbValor]     = useState("");
  const [fbCondicao,  setFbCondicao]  = useState("qualquer");
  const [fbGatilhoId, setFbGatilhoId] = useState("");
  const [fbTipo,      setFbTipo]      = useState("freebet");
  const [erro,        setErro]        = useState("");

  useEffect(() => {
    if (editOp) {
      // resolveCategoria garante retrocompatibilidade com ops legado
      setTipoOp(resolveCategoria(editOp));
      setEntradas(editOp.entradas || [entradaVazia()]);
      setNumEntradas(editOp.entradas?.length || 1);
      if (editOp.geraFreebet) {
        setFbValor(String(editOp.geraFreebet.valor || ""));
        setFbCondicao(editOp.geraFreebet.condicao || "qualquer");
        setFbGatilhoId(editOp.geraFreebet.entradaGatilhoId || "");
        setFbTipo(editOp.geraFreebet.tipoBeneficio || "freebet");
      } else {
        setFbValor(""); setFbCondicao("qualquer"); setFbGatilhoId(""); setFbTipo("freebet");
      }
    } else {
      // Novo: nenhum tipo pré-selecionado — aguarda escolha do usuário
      setTipoOp(null);
      setNumEntradas(2); setEntradas([entradaVazia(), entradaVazia()]);
      setFbValor(""); setFbCondicao("qualquer"); setFbGatilhoId(""); setFbTipo("freebet");
    }
    setErro("");
  }, [open, editOp]);

  function ajustarEntradas(n) {
    const num = Math.min(7, Math.max(1, parseInt(n) || 1));
    setNumEntradas(num);
    setEntradas(prev => num > prev.length
      ? [...prev, ...Array(num - prev.length).fill(null).map(entradaVazia)]
      : prev.slice(0, num));
  }

  function upd(i, f, v) {
    setEntradas(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const updated = { ...e, [f]: v };
      // Em modo retorno: quando valor muda, recalcula odd a partir do retornoStr já salvo
      if (f === "valor" && e.modoRetorno && e.retornoStr) {
        const ret = parseFloat(e.retornoStr.replace(",", ".")) || 0;
        const val = parseFloat(v) || 0;
        const oddCalc = val > 0
          ? e.tipo === "freebet" ? ret / val + 1 : ret / val
          : 0;
        updated.odd = oddCalc > 0 ? String(oddCalc) : "";
      }
      return updated;
    }));
  }

  // Atualiza múltiplos campos de uma entrada ao mesmo tempo (usado para conflitos de flags)
  function updMulti(i, fields) {
    setEntradas(prev => prev.map((e, idx) => idx === i ? { ...e, ...fields } : e));
  }

  // Atualiza odd a partir do retorno digitado (modo retorno)
  function updRetorno(i, retStr) {
    setEntradas(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const ret = parseFloat(retStr.replace(",", ".")) || 0;
      const val = parseFloat(e.valor) || 0;
      const oddCalc = val > 0
        ? e.tipo === "freebet" ? ret / val + 1 : ret / val
        : 0;
      return { ...e, retornoStr: retStr, odd: oddCalc > 0 ? String(oddCalc) : "" };
    }));
  }

  // Alterna modo retorno individualmente para a entrada de índice i
  function toggleEntradaModoRetorno(i) {
    setEntradas(prev => prev.map((e, idx) => {
      if (idx !== i) return e;
      const next = !e.modoRetorno;
      return {
        ...e,
        modoRetorno: next,
        // Ao ativar: inicializa retornoStr com o retorno atual calculado
        retornoStr: next && e.odd && e.valor ? String(calcRetorno(e).toFixed(2)) : e.retornoStr,
      };
    }));
  }

  function salvar() {
    if (!tipoOp) { setErro("Selecione o tipo de operação."); return; }
    for (let i = 0; i < entradas.length; i++) {
      const e = entradas[i];
      if (!e.casa)           { setErro(`Selecione a casa da entrada ${i + 1}.`); return; }
      if (!e.entrada.trim()) { setErro(`Informe o resultado apostado na entrada ${i + 1}.`); return; }
      if (!e.odd)            { setErro(`Informe a odd da entrada ${i + 1}.`); return; }
      if (!e.valor)          { setErro(`Informe o valor da entrada ${i + 1}.`); return; }
    }
    setErro("");

    // Desestrutura campos UI-only (modoRetorno, retornoStr) — não devem ser persistidos
    const entradasFinal = entradas.map(({ modoRetorno: _m, retornoStr: _r, ...e }) => ({
      ...e,
      // Exchange é preservado para qualquer tipo de operação.
      // Freebet/bonus só são preservados em Extração de Freebet.
      // Tudo o mais vira "normal".
      tipo: (e.tipo === "exchange_back" || e.tipo === "exchange_lay")
        ? e.tipo
        : tipoOp === "extracao_freebet" ? e.tipo : "normal",
      // Situação nasce sempre como pendente (conclusão feita via ModalConcluirOp)
      situacao: e.situacao === "pendente" ? "pendente" : e.situacao,
      entradaDisplay: e.entrada === "outro" ? (e.entradaCustom || "?") : e.entrada,
    }));

    onSalvar({
      id: editOp?.id || uid(),
      tipoOp,
      entradas: entradasFinal,
      // geraFreebet só é salvo para procedimento_freebet
      geraFreebet: tipoOp === "procedimento_freebet"
        ? {
            entradaGatilhoId: fbGatilhoId || null,
            casa: fbGatilhoId
              ? (entradasFinal.find(e => e.id === fbGatilhoId)?.casa || "")
              : "",
            valor: parseFloat(fbValor) || 0,
            condicao: fbCondicao,
            tipoBeneficio: fbTipo,
            prazo: editOp?.geraFreebet?.prazo ?? "",   // preserva prazo existente; "" em ops novas
          }
        : null,
      criadoEm: editOp?.criadoEm || new Date().toISOString(),
    });
    onClose();
  }

  const casasAtivas       = casas.filter(c => c.ativa);
  const corEntrada        = tipoOp ? (COR_ENTRADA[tipoOp] || COR_ENTRADA.arbitragem) : { borda: G.border, label: G.textDim };
  const banner            = tipoOp ? (BANNERS[tipoOp] || null) : null;
  const entradasElegiveis = entradas.filter(e => e.casa && e.entrada.trim());

  return (
    <Modal open={open} onClose={onClose} title={editOp ? "Editar Operação" : "Nova Operação"} width={680}>
      {erro && (
        <div style={{ background: "#ff444422", border: "1px solid #ff444444", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}

      {/* ── Passo 1: Tipo da operação ─────────────────────────────────────── */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
          Tipo de operação {!tipoOp && <span style={{ color: G.red }}>*</span>}
        </div>
        <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3, flexWrap: "wrap" }}>
          {TIPO_OP_OPTS.map(t => {
            const ativo = tipoOp === t.value;
            return (
              <button key={t.value} onClick={() => setTipoOp(t.value)} style={{
                padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
                background: ativo ? t.corAtivo : "transparent",
                color: ativo ? t.corText : G.textDim,
                fontSize: 13, fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}>
                {t.emoji} {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner informativo por tipo */}
      {banner && (
        <div style={{
          background: banner.bg, border: `1px solid ${banner.borda}`,
          borderRadius: 8, padding: "8px 12px", marginBottom: 14,
          fontSize: 12, color: banner.cor,
        }}>
          {banner.texto}
        </div>
      )}

      {/* ── Passo 2: Entradas (aparecem após escolher o tipo) ─────────────── */}
      {tipoOp === null ? (
        <div style={{ textAlign: "center", padding: "32px 0", color: G.textMuted, fontSize: 13 }}>
          Selecione o tipo de operação acima para continuar.
        </div>
      ) : (
        <>
          {/* Número de entradas */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <div style={{ fontSize: 12, color: G.textDim }}>Entradas:</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <button key={n} onClick={() => ajustarEntradas(n)} style={{
                  width: 30, height: 30, borderRadius: 6,
                  border: `1px solid ${numEntradas === n ? G.accent : G.border}`,
                  background: numEntradas === n ? "#00d4ff22" : G.surface2,
                  color: numEntradas === n ? G.accent : G.textDim,
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de entradas */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {entradas.map((e, i) => {
              // ── Derivados de tipo ────────────────────────────────────────────
              const isExch   = e.tipo === "exchange_back" || e.tipo === "exchange_lay";
              const isBack   = e.tipo === "exchange_back";
              const isLay    = e.tipo === "exchange_lay";
              const isFb     = e.tipo === "freebet" || e.tipo === "bonus";
              // Exchange usa label de odd específico para Lay; normal/back usam "Odd"
              const labelOdd = "Odd";
              // Exchange unifica em "Stake (R$)"; modo normal usa "Valor (R$)"
              const labelValor = isExch ? "Stake (R$)" : "Valor (R$)";
              // Valor do terceiro campo no modo exchange: (odd−1) × stake
              // → Lucro para Back, Responsabilidade para Lay — mesma fórmula, semânticas opostas
              const exchCalc = isExch
                ? (parseFloat(e.valor) || 0) * ((parseFloat(String(e.odd || "").replace(",", ".")) || 0) - 1)
                : 0;

              return (
                <div key={e.id} style={{
                  background: G.surface2,
                  border: `1px solid ${isExch ? "#f9731644" : corEntrada.borda}`,
                  borderRadius: 8, padding: 12,
                }}>

                  {/* ── Cabeçalho: label da entrada + toggle odd/retorno (oculto em exchange) ── */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 11, color: isExch ? "#f97316" : corEntrada.label, fontWeight: 700, letterSpacing: 1 }}>
                        ENTRADA {i + 1}
                      </div>
                      {isBack && <span style={{ fontSize: 10, fontWeight: 700, color: "#3b82f6", background: "#3b82f622", borderRadius: 4, padding: "1px 6px" }}>BACK</span>}
                      {isLay  && <span style={{ fontSize: 10, fontWeight: 700, color: "#ec4899", background: "#ec489922", borderRadius: 4, padding: "1px 6px" }}>LAY</span>}
                    </div>
                    {/* Toggle por Retorno oculto em Exchange: campo 3 já é Lucro/Responsabilidade */}
                    {!isExch && (
                      <button onClick={() => toggleEntradaModoRetorno(i)} style={{
                        padding: "2px 8px", borderRadius: 4,
                        border: `1px solid ${e.modoRetorno ? G.accent : G.border}`,
                        background: e.modoRetorno ? "#00d4ff11" : "transparent",
                        color: e.modoRetorno ? G.accent : G.textMuted,
                        fontSize: 10, fontWeight: 600, cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}>
                        {e.modoRetorno ? "↩ por Retorno" : "↪ por Odd"}
                      </button>
                    )}
                  </div>

                  {/* ── Linha 1: Casa | Resultado | Múltipla ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                    <CasaSelect casas={casasAtivas} value={e.casa} onChange={v => upd(i, "casa", v)} required />

                    {/* Resultado apostado / principal */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {e.multipla ? "Resultado principal" : "Resultado apostado"} <span style={{ color: G.red }}>*</span>
                      </label>
                      {evento?.mandante && evento?.visitante ? (
                        <select value={e.entrada}
                          onChange={ev => { upd(i, "entrada", ev.target.value); if (ev.target.value !== "outro") upd(i, "entradaCustom", ""); }}
                          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 10px", color: G.text, fontSize: 13, outline: "none", appearance: "none" }}>
                          <option value="">— selecionar —</option>
                          <option value={evento.mandante}>{evento.mandante}</option>
                          <option value="Empate">Empate</option>
                          <option value={evento.visitante}>{evento.visitante}</option>
                          <option value="outro">Outro (digitar)</option>
                        </select>
                      ) : (
                        <input value={e.entrada} onChange={ev => upd(i, "entrada", ev.target.value)} placeholder="Ex: Flamengo"
                          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none" }} />
                      )}
                      {e.entrada === "outro" && (
                        <input value={e.entradaCustom || ""} onChange={ev => upd(i, "entradaCustom", ev.target.value)}
                          placeholder="Descreva o resultado..."
                          style={{ background: G.surface2, border: `1px solid ${G.accent}44`, borderRadius: 6, padding: "7px 12px", color: G.text, fontSize: 13, outline: "none" }} />
                      )}
                    </div>

                    {/* Múltipla — toggle no topo da entrada */}
                    <label style={{
                      display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
                      fontSize: 12, color: e.multipla ? G.yellow : G.textDim,
                      paddingBottom: 2, whiteSpace: "nowrap",
                    }}>
                      <input type="checkbox" checked={e.multipla || false}
                        onChange={ev => upd(i, "multipla", ev.target.checked)}
                        style={{ accentColor: G.yellow, width: 14, height: 14 }} />
                      <span style={{ fontWeight: 600 }}>Múltipla</span>
                    </label>
                  </div>

                  {/* ── Linha 2: Descrição da múltipla (condicional) ── */}
                  {e.multipla && (
                    <div style={{ marginBottom: 8 }}>
                      <input value={e.multiplaDesc || ""} onChange={ev => upd(i, "multiplaDesc", ev.target.value)}
                        placeholder="O que foi adicionado na múltipla? Ex: + Mais de 1.5 gols"
                        style={{
                          background: "#ffd60011", border: `1px solid ${G.yellow}44`,
                          borderRadius: 6, padding: "7px 12px", color: G.text,
                          fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none",
                        }} />
                    </div>
                  )}

                  {/* ── Linha 3: Odd | Stake/Valor | Lucro/Responsabilidade/Retorno ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>

                    {/* Coluna 1 — Odd: sempre editável em exchange; toggle em modo normal */}
                    {(!isExch && e.modoRetorno) ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>{labelOdd}</label>
                        <div style={{
                          background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6,
                          padding: "8px 12px", color: e.odd ? G.textDim : G.textMuted,
                          fontSize: 13, minHeight: 37, display: "flex", alignItems: "center",
                        }}>
                          {e.odd ? fmtOdd(e.odd) : "—"}
                        </div>
                      </div>
                    ) : (
                      <Input label={labelOdd} value={e.odd} onChange={v => upd(i, "odd", v)} placeholder="Ex: 2,50" required inputMode="decimal" />
                    )}

                    {/* Coluna 2 — Valor / Stake */}
                    <Input label={labelValor} value={e.valor} onChange={v => upd(i, "valor", v)} type="number" placeholder="0,00" required />

                    {/* Coluna 3 — Exchange: Lucro (Back) em azul | Responsabilidade (Lay) em rosa */}
                    {/*            Normal: Retorno calculado ou editável (modoRetorno)             */}
                    {isExch ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{
                          fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase",
                          color: isBack ? "#3b82f6" : "#ec4899",
                        }}>
                          {isBack ? "Lucro (R$)" : "Responsabilidade (R$)"}
                        </label>
                        <div style={{
                          background: G.surface2, borderRadius: 6, padding: "8px 12px",
                          border: `1px solid ${isBack ? "#3b82f633" : "#ec489933"}`,
                          fontSize: 13, fontWeight: 700, minHeight: 37, display: "flex", alignItems: "center",
                          color: exchCalc > 0 ? (isBack ? "#3b82f6" : "#ec4899") : G.textMuted,
                        }}>
                          {exchCalc > 0 ? fmtNum(exchCalc) : "—"}
                        </div>
                      </div>
                    ) : e.modoRetorno ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
                          Retorno (R$) <span style={{ color: G.red }}>*</span>
                        </label>
                        <input
                          value={e.retornoStr ?? ""}
                          onChange={ev => updRetorno(i, ev.target.value)}
                          placeholder="Ex: 250,00"
                          inputMode="decimal"
                          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none" }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Retorno (R$)</label>
                        <div style={{
                          background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6,
                          padding: "8px 12px", color: (e.odd && e.valor) ? G.textDim : G.textMuted,
                          fontSize: 13, minHeight: 37, display: "flex", alignItems: "center",
                        }}>
                          {(e.odd && e.valor) ? fmt(calcRetorno(e)) : "—"}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Flags: PA | Freebet | Exchange | [Back][Lay] | Comissão ── */}
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>

                      {/* PA — marcar PA desmarca Exchange */}
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: e.pa ? G.accent : G.textDim }}>
                        <input type="checkbox" checked={e.pa || false}
                          onChange={ev => {
                            if (ev.target.checked && isExch) {
                              updMulti(i, { pa: true, tipo: "normal" });
                            } else {
                              upd(i, "pa", ev.target.checked);
                            }
                          }}
                          style={{ accentColor: G.accent, width: 14, height: 14 }} />
                        <span style={{ fontWeight: 600 }}>PA</span>
                      </label>

                      {/* Freebet — só em Extração; marcar Freebet desmarca Exchange */}
                      {tipoOp === "extracao_freebet" && (
                        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: isFb ? G.green : G.textDim }}>
                          <input type="checkbox" checked={isFb}
                            onChange={ev => updMulti(i, { tipo: ev.target.checked ? "freebet" : "normal" })}
                            style={{ accentColor: G.green, width: 14, height: 14 }} />
                          <span style={{ fontWeight: 600 }}>Freebet</span>
                        </label>
                      )}

                      {/* Exchange checkbox */}
                      <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: isExch ? "#f97316" : G.textDim }}>
                        <input type="checkbox" checked={isExch}
                          onChange={ev => updMulti(i, ev.target.checked
                            ? { tipo: "exchange_back", pa: false }
                            : { tipo: "normal" }
                          )}
                          style={{ accentColor: "#f97316", width: 14, height: 14 }} />
                        <span style={{ fontWeight: 600 }}>Exchange</span>
                      </label>

                      {/* Seletor Back/Lay inline — Back azul, Lay rosa */}
                      {isExch && (
                        <div style={{ display: "flex", gap: 2, background: G.surface, borderRadius: 6, padding: 2 }}>
                          <button onClick={() => updMulti(i, { tipo: "exchange_back" })} style={{
                            padding: "3px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                            background: isBack ? "#3b82f622" : "transparent",
                            color: isBack ? "#3b82f6" : G.textDim,
                            fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                            transition: "all 0.15s",
                          }}>Back</button>
                          <button onClick={() => updMulti(i, { tipo: "exchange_lay" })} style={{
                            padding: "3px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                            background: isLay ? "#ec489922" : "transparent",
                            color: isLay ? "#ec4899" : G.textDim,
                            fontSize: 12, fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                            transition: "all 0.15s",
                          }}>Lay</button>
                        </div>
                      )}

                      {/* Comissão inline — visível apenas quando Exchange ativo */}
                      {isExch && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 12, color: G.textDim, fontWeight: 600, whiteSpace: "nowrap" }}>
                            Comissão (%):
                          </span>
                          <input
                            value={e.comissao ?? ""}
                            onChange={ev => upd(i, "comissao", ev.target.value)}
                            placeholder="5"
                            type="number"
                            inputMode="decimal"
                            style={{
                              background: G.surface2, border: `1px solid #f9731633`,
                              borderRadius: 6, padding: "4px 8px", color: G.text,
                              fontSize: 13, outline: "none", width: 58,
                            }}
                          />
                        </div>
                      )}

                      {/* Retorno Exchange — um único bloco, Back ou Lay, nunca os dois */}
                      {isExch && (
                        isBack ? (
                          /* Back: retorno líquido oficial = stake + lucro após comissão */
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: G.textDim, fontWeight: 600, whiteSpace: "nowrap" }}>
                              Retorno:
                            </span>
                            <span style={{
                              fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                              color: (e.valor && e.odd) ? "#3b82f6" : G.textMuted,
                            }}>
                              {(e.valor && e.odd) ? fmt(calcRetorno(e)) : "—"}
                            </span>
                          </div>
                        ) : (
                          /* Lay: total que retorna à banca = responsabilidade + ganho líquido
                             Auxiliar visual de conferência — não entra nos cálculos oficiais */
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 12, color: G.textDim, fontWeight: 600, whiteSpace: "nowrap" }}>
                              Retorno Lay:
                            </span>
                            <span style={{
                              fontSize: 13, fontWeight: 700, whiteSpace: "nowrap",
                              color: (e.valor && e.odd) ? "#ec4899" : G.textMuted,
                            }}>
                              {(e.valor && e.odd) ? fmt(exchCalc + calcRetorno(e)) : "—"}
                            </span>
                          </div>
                        )
                      )}
                    </div>

                    {/* Sub-seletor Freebet: Freebet / Bônus — abaixo das flags */}
                    {tipoOp === "extracao_freebet" && isFb && (
                      <div style={{ marginTop: 8 }}>
                        <select value={e.tipo} onChange={ev => upd(i, "tipo", ev.target.value)}
                          style={{ background: G.surface2, border: `1px solid #22c55e44`, borderRadius: 6, padding: "4px 10px", color: G.text, fontSize: 12, outline: "none" }}>
                          <option value="freebet">Freebet</option>
                          <option value="bonus">Bônus</option>
                        </select>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

          {/* ── Configuração da Freebet (apenas para Proc. Freebet) ─────────── */}
          {tipoOp === "procedimento_freebet" && (
            <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                <div style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                  Benefício Gerado
                </div>
                {/* Tipo do benefício: Free Bet / Bônus / Cashback */}
                <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 6, padding: 2 }}>
                  {[
                    { value: "freebet",  label: "🎁 Free Bet" },
                    { value: "bonus",    label: "🎰 Bônus"    },
                    { value: "cashback", label: "💰 Cashback" },
                  ].map(t => (
                    <button key={t.value} onClick={() => setFbTipo(t.value)} style={{
                      padding: "4px 12px", borderRadius: 5, border: "none", cursor: "pointer",
                      background: fbTipo === t.value ? "#fbbf2422" : "transparent",
                      color: fbTipo === t.value ? "#fbbf24" : G.textDim,
                      fontSize: 12, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                      transition: "all 0.15s",
                    }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                {/* Entrada gatilho */}
                <div>
                  <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                    Entrada gatilho <span style={{ color: G.red }}>*</span>
                  </label>
                  {entradasElegiveis.length === 0 ? (
                    <div style={{ fontSize: 12, color: G.textMuted, padding: "8px 12px", background: G.surface2, borderRadius: 6, border: `1px solid ${G.border}` }}>
                      Preencha casa e resultado em ao menos uma entrada para selecionar o gatilho.
                    </div>
                  ) : (
                    <>
                      <select value={fbGatilhoId} onChange={e => setFbGatilhoId(e.target.value)}
                        style={{ background: G.surface2, border: `1px solid ${fbGatilhoId ? "#fbbf24" : G.border}`, borderRadius: 6, padding: "8px 10px", color: fbGatilhoId ? G.text : G.textDim, fontSize: 13, width: "100%", outline: "none", appearance: "none" }}>
                        <option value="">— selecionar entrada —</option>
                        {entradasElegiveis.map(e => {
                          const nomeCasa = getCasaNome(casasAtivas, e.casa);
                          const desc     = e.entrada === "outro" ? (e.entradaCustom || "?") : e.entrada;
                          const odd      = e.odd ? ` @${e.odd}` : "";
                          const valor    = e.valor ? ` · R$${e.valor}` : "";
                          return (
                            <option key={e.id} value={e.id}>
                              {nomeCasa} · {desc}{odd}{valor}
                            </option>
                          );
                        })}
                      </select>
                      {fbGatilhoId && (() => {
                        const ent = entradasElegiveis.find(e => e.id === fbGatilhoId);
                        return ent ? (
                          <div style={{ fontSize: 11, color: G.textDim, marginTop: 4 }}>
                            {{ freebet: "A free bet", bonus: "O bônus", cashback: "O cashback" }[fbTipo] ?? "O benefício"} será creditado em <strong style={{ color: G.text }}>{getCasaNome(casasAtivas, ent.casa)}</strong>.
                          </div>
                        ) : null;
                      })()}
                    </>
                  )}
                </div>

                {/* Valor e condição */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Input
                    label={{ freebet: "Valor da Free Bet", bonus: "Valor do Bônus", cashback: "Valor do Cashback" }[fbTipo] ?? "Valor"}
                    value={fbValor} onChange={setFbValor} type="number" placeholder="0,00"
                  />
                  <Input label="Condição" value={fbCondicao} onChange={setFbCondicao} options={CONDICAO_OPTS} />
                </div>

              </div>
            </div>
          )}
        </>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: tipoOp === null ? 8 : 0 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>{editOp ? "Salvar" : "Adicionar operação"}</Btn>
      </div>
    </Modal>
  );
}
