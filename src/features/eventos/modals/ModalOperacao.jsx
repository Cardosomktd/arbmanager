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
  { value: "arbitragem",           ...CATEGORIAS.arbitragem,           corAtivo: "#22D3EE22", corText: "#22D3EE" },
  { value: "procedimento_freebet", ...CATEGORIAS.procedimento_freebet, corAtivo: "#fbbf2422", corText: "#fbbf24" },
  { value: "extracao_freebet",     ...CATEGORIAS.extracao_freebet,     corAtivo: "#34D39922", corText: "#34D399" },
  { value: "duplo",                ...CATEGORIAS.duplo,                corAtivo: "#8B5CF633", corText: "#A78BFA" },
];

// Cor da borda e do label das entradas conforme tipo de operação
const COR_ENTRADA = {
  arbitragem:           { borda: G.border,    label: G.accent   },
  procedimento_freebet: { borda: "#fbbf2444", label: "#fbbf24"  },
  extracao_freebet:     { borda: "#34D39944", label: "#34D399"  },
  duplo:                { borda: "#8B5CF644", label: "#A78BFA"  },
};

// Banner informativo por tipo
const BANNERS = {
  procedimento_freebet: {
    bg:   "#fbbf240d", borda: "#fbbf2433", cor: "#fbbf24",
    texto: "🎯 Proc. Freebet — configure abaixo a freebet gerada ao completar a condição.",
  },
  extracao_freebet: {
    bg:   "#34D3990d", borda: "#34D39933", cor: "#34D399",
    texto: "🎁 Ext. Freebet — marque abaixo as entradas que usam freebet para o cálculo correto do retorno líquido.",
  },
  duplo: {
    bg:   "#8B5CF60d", borda: "#8B5CF633", cor: "#A78BFA",
    texto: "🎲 Chance de Duplo — cobertura de dois resultados. Sem lucro mínimo garantido.",
  },
};

function entradaVazia() {
  return {
    id: uid(), casa: "", entrada: "", entradaCustom: "", multipla: false, multiplaDesc: "",
    odd: "", valor: "", comissao: "", tipo: "normal", situacao: "pendente", pa: false,
    freebetId: null, freebetManual: false, freebetValorUsado: "",  // link freebet
    bonusId:   null, bonusManual:   false, bonusValorUsado:   "",  // link bônus
  };
}

// ── Seletor de casa com busca ─────────────────────────────────────────────────
function CasaSelect({ casas, value, onChange, required }) {
  const [busca,          setBusca]          = useState("");
  const [aberto,         setAberto]         = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const nomeSelecionado = value ? (casas.find(c => c.id === value)?.nome || "") : "";
  const filtradas = busca.trim()
    ? casas.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase()))
    : casas;

  // Reset highlight to first item whenever the list changes
  useEffect(() => { setHighlightedIdx(0); }, [filtradas.length, busca]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!listRef.current || !aberto) return;
    const item = listRef.current.children[highlightedIdx];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [highlightedIdx, aberto]);

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

  function handleKeyDown(e) {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setAberto(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIdx(i => Math.min(i + 1, filtradas.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIdx(i => Math.max(i - 1, 0));
        break;

      case "Enter":
        e.preventDefault();
        if (filtradas[highlightedIdx]) selecionar(filtradas[highlightedIdx].id);
        break;

      case "Tab":
        // Select highlighted item, then let Tab advance focus naturally
        if (filtradas[highlightedIdx]) {
          selecionar(filtradas[highlightedIdx].id);
          // Don't preventDefault — browser will move focus to next field
        }
        break;

      case "Escape":
        e.preventDefault();
        setAberto(false);
        setBusca("");
        inputRef.current?.blur();
        break;

      default:
        break;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        Casa {required && <span style={{ color: G.red }}>*</span>}
      </label>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={aberto ? busca : nomeSelecionado}
          placeholder={value ? nomeSelecionado : "— selecionar —"}
          onFocus={() => { setAberto(true); setBusca(""); }}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%", boxSizing: "border-box",
            background: G.surface2, border: `1px solid ${aberto ? G.accent : G.border}`,
            borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none",
            cursor: "text", transition: "border-color 0.15s",
          }}
        />
        {aberto && (
          <div ref={listRef} style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
            background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8,
            boxShadow: "0 8px 24px #00000055", maxHeight: 220, overflowY: "auto",
          }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 12, color: G.textMuted }}>Nenhuma casa encontrada.</div>
            ) : filtradas.map((c, idx) => {
              const isHighlighted = idx === highlightedIdx;
              const isSelected    = c.id === value;
              return (
                <div
                  key={c.id}
                  onMouseDown={() => selecionar(c.id)}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  style={{
                    padding: "9px 12px", fontSize: 13, cursor: "pointer",
                    color: isSelected ? G.accent : G.text,
                    fontWeight: isSelected ? 700 : 400,
                    background: isHighlighted ? G.surface3 : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  {c.nome}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Input de valor parcial a usar do estoque ─────────────────────────────────
// Mostra o saldo disponível e permite digitar quanto será usado.
// Sem preenchimento → usa o saldo inteiro (tratado na baixa em TelaEventos).
function ValorUsadoInput({ saldo, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
      <span style={{ fontSize: 11, color: G.textDim }}>
        Saldo disponível: <strong style={{ color: G.green }}>{fmt(saldo)}</strong>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <label style={{ fontSize: 10, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
          Valor a usar (R$)
        </label>
        <input
          type="number"
          value={value}
          onChange={ev => onChange(ev.target.value)}
          placeholder={String(saldo)}
          min="0.01"
          step="0.01"
          style={{
            background: G.surface2, border: `1px solid #34D39944`,
            borderRadius: 6, padding: "4px 8px",
            color: G.text, fontSize: 12, outline: "none", width: 110,
          }}
        />
      </div>
    </div>
  );
}

// ── Select de estoque (freebet ou bônus) filtrado por casa ───────────────────
// Recebe os itens já filtrados pela casa da entrada.
// "Outra"/"Outro" é sempre a última opção — não dá baixa no estoque.
function EstoqueSelect({ valor, onChange, itens, temCasa, placeholderSemCasa, placeholder, opcaoOutra, formatarItem }) {
  const SELECT_STYLE = {
    width: "100%", boxSizing: "border-box",
    background: G.surface2, border: `1px solid #34D39944`,
    borderRadius: 6, padding: "6px 10px",
    color: G.text, fontSize: 12, outline: "none",
  };
  return (
    <select value={valor} onChange={ev => onChange(ev.target.value)} style={SELECT_STYLE}>
      <option value="" disabled={temCasa}>
        {!temCasa ? placeholderSemCasa : placeholder}
      </option>
      {temCasa && itens.map(item => (
        <option key={item.id} value={item.id}>{formatarItem(item)}</option>
      ))}
      {temCasa && itens.length === 0 && (
        <option value="" disabled>Nenhuma disponível para esta casa</option>
      )}
      <option value={opcaoOutra === "Outra" ? "__outra__" : "__outro__"}>{opcaoOutra}</option>
    </select>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function ModalOperacao({ open, onClose, onSalvar, casas, editOp, evento, rascunhoCalc, freebetsDisponiveis = [], bonusDisponiveis = [] }) {
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
    } else if (rascunhoCalc) {
      // Vindo da calculadora: pré-preenche odd e stake; os demais campos ficam em branco
      const n = rascunhoCalc.entradas.length;
      setTipoOp(null);
      setNumEntradas(n);
      setEntradas(rascunhoCalc.entradas.map(r => ({
        ...entradaVazia(),
        odd:      r.odd,
        valor:    r.valor,
        // Exchange: pré-preenche tipo (exchange_back | exchange_lay) e comissão
        ...(r.tipo     && { tipo:     r.tipo     }),
        ...(r.comissao && { comissao: r.comissao }),
      })));
      setFbValor(""); setFbCondicao("qualquer"); setFbGatilhoId(""); setFbTipo("freebet");
    } else {
      // Novo: nenhum tipo pré-selecionado — aguarda escolha do usuário
      setTipoOp(null);
      setNumEntradas(2); setEntradas([entradaVazia(), entradaVazia()]);
      setFbValor(""); setFbCondicao("qualquer"); setFbGatilhoId(""); setFbTipo("freebet");
    }
    setErro("");
  }, [open, editOp, rascunhoCalc]);

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

      // Valida valor a usar contra saldo disponível (estoque individual)
      if (e.freebetId && !e.freebetManual && e.freebetValorUsado) {
        const fb = freebetsDisponiveis.find(f => f.id === e.freebetId);
        const saldo = fb ? (fb.saldo ?? fb.valor ?? 0) : 0;
        if (parseFloat(e.freebetValorUsado) > saldo + 0.001) {
          setErro(`Valor da freebet na entrada ${i + 1} excede o saldo disponível (${fmt(saldo)}).`);
          return;
        }
      }
      if (e.bonusId && !e.bonusManual && e.bonusValorUsado) {
        const bn = bonusDisponiveis.find(b => b.id === e.bonusId);
        const saldo = bn ? (bn.saldo ?? bn.valor ?? 0) : 0;
        if (parseFloat(e.bonusValorUsado) > saldo + 0.001) {
          setErro(`Valor do bônus na entrada ${i + 1} excede o saldo disponível (${fmt(saldo)}).`);
          return;
        }
      }
      // Valida valor a usar contra saldo de carteira acumulada
      if (tipoOp === "extracao_freebet") {
        if (e.tipo === "freebet" && !e.freebetId && !e.freebetManual && e.freebetValorUsado) {
          const acum = freebetsDisponiveis.find(f => f.tipo === "acumulada" && f.casaId === e.casa);
          if (acum) {
            const saldo = acum.saldo ?? 0;
            if (parseFloat(e.freebetValorUsado) > saldo + 0.001) {
              setErro(`Valor da freebet na entrada ${i + 1} excede o saldo acumulado disponível (${fmt(saldo)}).`);
              return;
            }
          }
        }
        if (e.tipo === "bonus" && !e.bonusId && !e.bonusManual && e.bonusValorUsado) {
          const acum = bonusDisponiveis.find(b => b.tipo === "acumulada" && b.casaId === e.casa);
          if (acum) {
            const saldo = acum.saldo ?? 0;
            if (parseFloat(e.bonusValorUsado) > saldo + 0.001) {
              setErro(`Valor do bônus na entrada ${i + 1} excede o saldo acumulado disponível (${fmt(saldo)}).`);
              return;
            }
          }
        }
      }
    }
    setErro("");

    // Desestrutura campos UI-only (modoRetorno, retornoStr) — não devem ser persistidos
    const entradasFinal = entradas.map(({ modoRetorno: _m, retornoStr: _r, ...e }) => {
      const tipoFinal = (e.tipo === "exchange_back" || e.tipo === "exchange_lay")
        ? e.tipo
        : tipoOp === "extracao_freebet" ? e.tipo : "normal";

      let entry = {
        ...e,
        tipo: tipoFinal,
        // Situação nasce sempre como pendente (conclusão feita via ModalConcluirOp)
        situacao: e.situacao === "pendente" ? "pendente" : e.situacao,
        entradaDisplay: e.entrada === "outro" ? (e.entradaCustom || "?") : e.entrada,
      };

      // Injeta ID da carteira acumulada para o baixa em TelaEventos (modo carteira não tem dropdown)
      if (tipoFinal === "freebet" && !entry.freebetId && !entry.freebetManual) {
        const acum = freebetsDisponiveis.find(f => f.tipo === "acumulada" && f.casaId === entry.casa);
        if (acum) entry = { ...entry, freebetId: acum.id };
      }
      if (tipoFinal === "bonus" && !entry.bonusId && !entry.bonusManual) {
        const acum = bonusDisponiveis.find(b => b.tipo === "acumulada" && b.casaId === entry.casa);
        if (acum) entry = { ...entry, bonusId: acum.id };
      }

      return entry;
    });

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
        <div style={{ background: "#F8717122", border: "1px solid #F8717144", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
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
                  background: numEntradas === n ? "#22D3EE22" : G.surface2,
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

              // Saldo do item de estoque vinculado (compat: sem saldo → usa valor)
              const selectedFb = (e.freebetId && !e.freebetManual)
                ? freebetsDisponiveis.find(f => f.id === e.freebetId) : null;
              const fbSaldo = selectedFb ? (selectedFb.saldo ?? selectedFb.valor ?? 0) : 0;

              const selectedBn = (e.bonusId && !e.bonusManual)
                ? bonusDisponiveis.find(b => b.id === e.bonusId) : null;
              const bnSaldo = selectedBn ? (selectedBn.saldo ?? selectedBn.valor ?? 0) : 0;

              // Detecção de carteira acumulada por casa — se existir, substitui o dropdown por ValorUsadoInput direto
              const casaFbAcumulada = e.tipo === "freebet" && e.casa
                ? freebetsDisponiveis.find(f => f.tipo === "acumulada" && f.casaId === e.casa)
                : null;
              const casaBnAcumulada = e.tipo === "bonus" && e.casa
                ? bonusDisponiveis.find(b => b.tipo === "acumulada" && b.casaId === e.casa)
                : null;

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
                        background: e.modoRetorno ? "#22D3EE11" : "transparent",
                        color: e.modoRetorno ? G.accent : G.textMuted,
                        fontSize: 10, fontWeight: 600, cursor: "pointer",
                        
                      }}>
                        {e.modoRetorno ? "↩ por Retorno" : "↪ por Odd"}
                      </button>
                    )}
                  </div>

                  {/* ── Linha 1: Casa | Resultado | Múltipla ── */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "end", marginBottom: 8 }}>
                    <CasaSelect casas={casasAtivas} value={e.casa}
                      onChange={v => updMulti(i, {
                        casa: v,
                        freebetId: null, freebetManual: false, freebetValorUsado: "",
                        bonusId:   null, bonusManual:   false, bonusValorUsado:   "",
                      })} required />

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
                          background: "#FBBF2411", border: `1px solid ${G.yellow}44`,
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
                            onChange={ev => updMulti(i, {
                              tipo: ev.target.checked ? "freebet" : "normal",
                              freebetId: null, freebetManual: false, freebetValorUsado: "",
                              bonusId:   null, bonusManual:   false, bonusValorUsado:   "",
                            })}
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
                            fontSize: 12, fontWeight: 700, 
                            transition: "all 0.15s",
                          }}>Back</button>
                          <button onClick={() => updMulti(i, { tipo: "exchange_lay" })} style={{
                            padding: "3px 14px", borderRadius: 5, border: "none", cursor: "pointer",
                            background: isLay ? "#ec489922" : "transparent",
                            color: isLay ? "#ec4899" : G.textDim,
                            fontSize: 12, fontWeight: 700, 
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
                      <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>

                        {/* Tipo: Freebet | Bônus */}
                        <select
                          value={e.tipo}
                          onChange={ev => updMulti(i, {
                            tipo: ev.target.value,
                            freebetId: null, freebetManual: false, freebetValorUsado: "",
                            bonusId:   null, bonusManual:   false, bonusValorUsado:   "",
                          })}
                          style={{ background: G.surface2, border: `1px solid #34D39944`, borderRadius: 6, padding: "4px 10px", color: G.text, fontSize: 12, outline: "none", alignSelf: "flex-start" }}>
                          <option value="freebet">Freebet</option>
                          <option value="bonus">Bônus</option>
                        </select>

                        {/* Select de estoque (ou carteira acumulada) — filtrado por casa */}
                        {e.tipo === "freebet" ? (
                          casaFbAcumulada ? (
                            // ── Modo carteira: saldo acumulado, sem dropdown ──────────────────
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: G.accent }}>
                                <span>🔄</span>
                                <span style={{ fontWeight: 600 }}>Carteira —{getCasaNome(casasAtivas, e.casa)}</span>
                              </div>
                              <ValorUsadoInput
                                saldo={casaFbAcumulada.saldo ?? 0}
                                value={e.freebetValorUsado}
                                onChange={v => upd(i, "freebetValorUsado", v)}
                              />
                            </>
                          ) : (
                            // ── Modo normal: dropdown de estoque ─────────────────────────────
                            <>
                              <EstoqueSelect
                                valor={e.freebetManual ? "__outra__" : (e.freebetId ?? "")}
                                onChange={v => updMulti(i, v === "__outra__"
                                  ? { freebetId: null, freebetManual: true,  freebetValorUsado: "" }
                                  : { freebetId: v || null, freebetManual: false, freebetValorUsado: "" }
                                )}
                                itens={freebetsDisponiveis.filter(f => f.casaId === e.casa && f.tipo !== "acumulada")}
                                temCasa={!!e.casa}
                                placeholderSemCasa="Selecione a casa para listar opções"
                                placeholder="— selecione a freebet a ser usada —"
                                opcaoOutra="Outra"
                                formatarItem={f => {
                                  const s = f.saldo ?? f.valor ?? 0;
                                  const parcial = f.saldo != null && f.saldo < f.valor;
                                  const saldoStr = parcial ? `${fmt(s)} de ${fmt(f.valor)}` : fmt(s);
                                  if (!f.prazo) return `Freebet ${saldoStr}`;
                                  const d = new Date(f.prazo + "T12:00:00").toLocaleDateString("pt-BR");
                                  const vence = f.vencimentoHora ? `${d} às ${f.vencimentoHora}` : d;
                                  return `Freebet ${saldoStr} (vence ${vence})`;
                                }}
                              />
                              {selectedFb && (
                                <ValorUsadoInput
                                  saldo={fbSaldo}
                                  value={e.freebetValorUsado}
                                  onChange={v => upd(i, "freebetValorUsado", v)}
                                />
                              )}
                            </>
                          )
                        ) : (
                          casaBnAcumulada ? (
                            // ── Modo carteira bônus ───────────────────────────────────────────
                            <>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: G.accent }}>
                                <span>🔄</span>
                                <span style={{ fontWeight: 600 }}>Carteira —{getCasaNome(casasAtivas, e.casa)}</span>
                              </div>
                              <ValorUsadoInput
                                saldo={casaBnAcumulada.saldo ?? 0}
                                value={e.bonusValorUsado}
                                onChange={v => upd(i, "bonusValorUsado", v)}
                              />
                            </>
                          ) : (
                            // ── Modo normal bônus ─────────────────────────────────────────────
                            <>
                              <EstoqueSelect
                                valor={e.bonusManual ? "__outro__" : (e.bonusId ?? "")}
                                onChange={v => updMulti(i, v === "__outro__"
                                  ? { bonusId: null, bonusManual: true,  bonusValorUsado: "" }
                                  : { bonusId: v || null, bonusManual: false, bonusValorUsado: "" }
                                )}
                                itens={bonusDisponiveis.filter(b => b.casaId === e.casa && b.tipo !== "acumulada")}
                                temCasa={!!e.casa}
                                placeholderSemCasa="Selecione a casa para listar opções"
                                placeholder="— selecione o bônus a ser usado —"
                                opcaoOutra="Outro"
                                formatarItem={b => {
                                  const s = b.saldo ?? b.valor ?? 0;
                                  const parcial = b.saldo != null && b.saldo < b.valor;
                                  const saldoStr = parcial ? `${fmt(s)} de ${fmt(b.valor)}` : fmt(s);
                                  return `Bônus ${saldoStr}${b.obs ? ` — ${b.obs}` : ""}`;
                                }}
                              />
                              {selectedBn && (
                                <ValorUsadoInput
                                  saldo={bnSaldo}
                                  value={e.bonusValorUsado}
                                  onChange={v => upd(i, "bonusValorUsado", v)}
                                />
                              )}
                            </>
                          )
                        )}

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
                      fontSize: 12, fontWeight: 600, 
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
