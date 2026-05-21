import { useState } from "react";
import { G } from "../../../constants/colors";
import { fmt } from "../../../utils/format";
import { Modal } from "../../../components/ui/Modal";

// Stake com 2 casas decimais (ex: 95.238 → "95,24") — usado no modo leitura (total)
function fmtStake(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",");
}

export function ModalCalculadora({ open, onClose, onUsarNaOp }) {
  const [numEntradas, setNumEntradas] = useState(2);
  const [odds,        setOddsState]   = useState(["", ""]);
  const [aumentos,    setAumentos]    = useState(["", ""]);
  const [stakeBase,   setStakeBase]   = useState("");
  const [totalStr,    setTotalStr]    = useState("");

  // ── Entrada base ─────────────────────────────────────────────────────────────
  // baseIndex: qual entrada serve de referência para o cálculo das outras stakes.
  // Funciona em stake_base, freebet_red E freebet (AJUSTE 4).
  const [baseIndex, setBaseIndex] = useState(0);

  // stakesManual: override manual por entrada não-base.
  // "" = automático (calculado); não-vazio = valor que o usuário editou.
  // Limpar o campo ou clicar ↺ volta para o automático.
  const [stakesManual, setStakesManual] = useState(["", ""]);

  // ── Modos ────────────────────────────────────────────────────────────────────
  const [modoPrincipal, setModoPrincipal] = useState("arbitragem");
  const [modoArb,       setModoArb]       = useState("stake_base");
  const modo = modoPrincipal === "arbitragem" ? modoArb
             : modoPrincipal === "freebet_red" ? "stake_base"
             : "freebet"; // modoPrincipal === "freebet"

  // Exchange
  const [exchIdx,  setExchIdx]  = useState(null);
  const [exchTipo, setExchTipo] = useState("exchange_back");
  const [exchComm, setExchComm] = useState("");

  // Diferença de retorno (freebet_red)
  const [diferencaStr, setDiferencaStr] = useState("0");

  // ── effectiveBaseIndex ────────────────────────────────────────────────────────
  // Calculado cedo para que os helpers possam referenciar sem TDZ.
  // AJUSTE 4: em modo freebet a base também é selecionável (não mais fixada em 0).
  const effectiveBaseIndex = baseIndex < numEntradas ? baseIndex : 0;

  // ── Helpers de estado ────────────────────────────────────────────────────────
  function ajustarEntradas(n) {
    setNumEntradas(n);
    setOddsState(prev =>
      n > prev.length ? [...prev, ...Array(n - prev.length).fill("")]
                      : prev.slice(0, n)
    );
    setAumentos(prev =>
      n > prev.length ? [...prev, ...Array(n - prev.length).fill("")]
                      : prev.slice(0, n)
    );
    setStakesManual(prev =>
      n > prev.length ? [...prev, ...Array(n - prev.length).fill("")]
                      : prev.slice(0, n)
    );
    if (baseIndex >= n) setBaseIndex(0);
    if (exchIdx !== null && exchIdx >= n) setExchIdx(null);
  }

  // AJUSTE 2 & 3: ao mudar odd da entrada base → recalcula TUDO;
  // ao mudar odd de outra entrada → recalcula AQUELA entrada.
  function setOdd(i, v) {
    setOddsState(prev => prev.map((o, idx) => idx === i ? v : o));
    if (i === effectiveBaseIndex) {
      // Odd da base mudou → invalida todos os overrides manuais
      setStakesManual(Array(numEntradas).fill(""));
    } else {
      // Odd de entrada não-base → invalida só aquela stake
      setStakesManual(prev => prev.map((s, idx) => idx === i ? "" : s));
    }
  }

  function setAumento(i, v) {
    setAumentos(prev => prev.map((a, idx) => idx === i ? v : a));
  }

  function setManual(i, v) {
    setStakesManual(prev => prev.map((s, idx) => idx === i ? v : s));
  }

  // ↺ desfaz o override de uma entrada específica (AJUSTE 5)
  function clearManual(i) {
    setStakesManual(prev => prev.map((s, idx) => idx === i ? "" : s));
  }

  // AJUSTE 2: ao mudar stake base → recalcula TUDO (invalida todos os overrides)
  function updateStakeBase(v) {
    setStakeBase(v);
    setStakesManual(Array(numEntradas).fill(""));
  }

  // Trocar a entrada base: adota a stake calculada atual como novo stakeBase
  // e recalcula tudo a partir do novo ponto de referência.
  function changeBase(newIdx, computedStake) {
    if (newIdx === baseIndex) return;
    setBaseIndex(newIdx);
    setStakesManual(Array(numEntradas).fill(""));
    if (computedStake !== null && computedStake > 0) {
      setStakeBase(String(computedStake));
    }
  }

  function toggleExch(i) {
    setExchIdx(prev => prev === i ? null : i);
  }

  // Ao trocar stake_base → total, pré-preenche o totalStr com o total calculado
  function ajustarModoArb(novoModoArb) {
    if (novoModoArb === "total" && modoArb === "stake_base") {
      const st = parseFloat(stakeBase) || 0;
      const oddsN = odds.map((o, i) => {
        const raw = parseFloat(String(o || "").replace(",", ".")) || 0;
        const pct = parseFloat(aumentos[i]) || 0;
        return pct > 0 && raw > 0 ? raw + (raw - 1) * pct / 100 : raw;
      });
      const oBase = oddsN[baseIndex] || oddsN[0];
      if (st > 0 && oBase > 0) {
        const rb  = st * oBase;
        const tot = oddsN.reduce((s, odd, i) => {
          if (i === baseIndex) return s + st;
          if (rb <= 0 || odd <= 0) return s;
          return s + Math.round((rb / odd) * 100) / 100;
        }, 0);
        setTotalStr(tot.toFixed(2));
      }
    }
    setModoArb(novoModoArb);
  }

  // ── Cálculo ─────────────────────────────────────────────────────────────────
  const oddsNum  = odds.map(o => parseFloat(String(o || "").replace(",", ".")) || 0);
  const stakeNum = parseFloat(stakeBase) || 0;
  const totalNum = parseFloat(totalStr)  || 0;

  // Odds ajustadas pelo booster por entrada.
  // Fórmula: oddFinal = oddOriginal + (oddOriginal − 1) × percentual / 100
  const oddsAjustadas = oddsNum.map((odd, i) => {
    const pct = parseFloat(aumentos[i]) || 0;
    if (pct <= 0 || odd <= 0) return odd;
    return odd + (odd - 1) * pct / 100;
  });

  const odd0 = oddsAjustadas[effectiveBaseIndex];

  const todasPreenchidas = oddsNum.every(o => o > 0);
  const somatorio = todasPreenchidas ? oddsAjustadas.reduce((s, o) => s + 1 / o, 0) : 0;

  const comm   = (parseFloat(exchComm) || 0) / 100;
  const difNum = modoPrincipal === "freebet_red"
    ? Math.max(0, parseFloat(diferencaStr) || 0)
    : 0;

  const hasExchLay  = exchIdx !== null && exchTipo === "exchange_lay";
  const hasExchBack = exchIdx !== null && exchTipo === "exchange_back";

  // retornoBase: o quanto a entrada base devolve para a conta se for green.
  // Freebet: stake não retorna, só o lucro (odd − 1).
  const retornoBase = stakeNum > 0 && odd0 > 0
    ? (modo === "freebet" ? stakeNum * (odd0 - 1) : stakeNum * odd0)
    : 0;

  // ── Stakes calculadas por modo ───────────────────────────────────────────────
  const stakesCalc = oddsAjustadas.map((odd, i) => {
    if (modo === "stake_base" || modo === "freebet") {

      // Entrada base — sempre usa stakeBase
      if (i === effectiveBaseIndex) return stakeNum > 0 ? stakeNum : null;

      // Override manual: qualquer entrada não-base pode ser editada manualmente
      // (AJUSTE 1 + 2: o override fica enquanto a base/odd não muda)
      if (stakesManual[i] !== "") {
        const m = parseFloat(stakesManual[i]);
        if (!isNaN(m) && m > 0) return m;
      }

      if (retornoBase <= 0 || odd <= 0) return null;

      // Exchange Back:  stakeBack = retornoAlvo / [1 + (odd−1)×(1−comm)]
      if (i === exchIdx && exchTipo === "exchange_back") {
        const retAlvo = retornoBase - difNum;
        const denom   = 1 + (odd - 1) * (1 - comm);
        return (retAlvo > 0 && denom > 0) ? Math.round((retAlvo / denom) * 100) / 100 : null;
      }

      // Exchange Lay:   stakeLay = retornoAlvo / (odd − comm)
      if (i === exchIdx && exchTipo === "exchange_lay") {
        const retAlvo = retornoBase - difNum;
        const divisor = odd - comm;
        return (retAlvo > 0 && divisor > 0) ? Math.round((retAlvo / divisor) * 100) / 100 : null;
      }

      // Normal
      const retornoAlvo = difNum > 0 ? retornoBase - difNum : retornoBase;
      if (retornoAlvo <= 0) return null;
      return Math.round((retornoAlvo / odd) * 100) / 100;

    } else {
      // ── Total base ────────────────────────────────────────────────────────
      if (!todasPreenchidas || totalNum <= 0 || odd <= 0) return null;

      if (hasExchLay) {
        const o1    = oddsNum[0];
        const oe    = oddsNum[exchIdx];
        const denom = o1 * (oe - 1) + (oe - comm);
        if (denom <= 0 || oe <= 0) return null;
        const stakeLay = (o1 * totalNum) / denom;
        if (i === exchIdx) return Math.round(stakeLay * 100) / 100;
        if (i === 0)       return Math.round((totalNum - stakeLay * (oe - 1)) * 100) / 100;
        if (somatorio <= 0) return null;
        return Math.round((totalNum / (odd * somatorio)) * 100) / 100;
      }

      if (hasExchBack) {
        const o1         = oddsNum[0];
        const ob         = oddsNum[exchIdx];
        const backFactor = 1 + (ob - 1) * (1 - comm);
        const denom      = 1 + backFactor / o1;
        if (denom <= 0 || o1 <= 0) return null;
        const stakeBack = totalNum / denom;
        if (i === exchIdx) return Math.round(stakeBack * 100) / 100;
        if (i === 0)       return Math.round((totalNum - stakeBack) * 100) / 100;
        if (somatorio <= 0) return null;
        return Math.round((totalNum / (odd * somatorio)) * 100) / 100;
      }

      if (somatorio <= 0) return null;
      return Math.round((totalNum / (odd * somatorio)) * 100) / 100;
    }
  });

  // ── Capital imobilizado e total investido ───────────────────────────────────
  const layStakeCalc = hasExchLay ? (stakesCalc[exchIdx] ?? null) : null;
  const layOddNum    = hasExchLay ? oddsAjustadas[exchIdx] : 0;

  const responsabilidade = layStakeCalc !== null && layOddNum > 0
    ? layStakeCalc * (layOddNum - 1)
    : 0;

  const somaStakesNormais = stakesCalc.reduce(
    (sum, s, i) => sum + (hasExchLay && i === exchIdx ? 0 : (s ?? 0)), 0
  );

  const totalInvestido = hasExchLay
    ? (modo === "freebet"
        ? responsabilidade
        : somaStakesNormais + responsabilidade)
    : modo === "freebet"
      // Exclui a entrada FB (effectiveBaseIndex) do capital investido
      ? stakesCalc.reduce((s, v, idx) => idx === effectiveBaseIndex ? s : s + (v ?? 0), 0)
      : stakesCalc.reduce((s, v) => s + (v ?? 0), 0);

  // ── Retorno bruto por entrada ────────────────────────────────────────────────
  // O que volta para a conta se aquela entrada for green (inclui devolução de stake).
  const retornos = oddsAjustadas.map((odd, i) => {
    const s = stakesCalc[i];
    if (s === null || s <= 0 || odd <= 0) return null;
    if (hasExchLay  && i === exchIdx) return s * (odd - 1) + s * (1 - comm);
    if (hasExchBack && i === exchIdx) return s + s * (odd - 1) * (1 - comm);
    // AJUSTE 4: freebet base agora usa effectiveBaseIndex
    if (modo === "freebet" && i === effectiveBaseIndex) return s * (odd - 1);
    return s * odd;
  });

  // ── Lucros por cenário ───────────────────────────────────────────────────────
  const lucros = oddsAjustadas.map((odd, i) => {
    const s = stakesCalc[i];
    if (s === null || odd <= 0) return null;

    if (hasExchLay && i === exchIdx) {
      if (layStakeCalc === null) return null;
      const custoSaida = modo === "freebet" ? 0 : somaStakesNormais;
      return layStakeCalc * (1 - comm) - custoSaida;
    }
    if (hasExchBack && i === exchIdx) {
      return s + s * (odd - 1) * (1 - comm) - totalInvestido;
    }
    // AJUSTE 4: freebet base usa effectiveBaseIndex
    if (modo === "freebet" && i === effectiveBaseIndex) {
      return s * (odd - 1) - totalInvestido;
    }
    // Âncora freebet_red + lay: ancora o lucro1 em lucroLay + d para eliminar erro de arredondamento
    if (modoPrincipal === "freebet_red" && hasExchLay && i === 0 && layStakeCalc !== null) {
      const lucroLay = layStakeCalc * (1 - comm) - somaStakesNormais;
      return lucroLay + difNum;
    }
    return s * odd - totalInvestido;
  });

  // ── Lucro mínimo ─────────────────────────────────────────────────────────────
  const lucrosDefinidos = lucros.filter(l => l !== null);
  const lucroMin = lucrosDefinidos.length === odds.length && lucrosDefinidos.length > 0
    ? Math.min(...lucrosDefinidos)
    : null;

  // ── Arb% ─────────────────────────────────────────────────────────────────────
  const arbPct = !todasPreenchidas
    ? null
    : (modo === "freebet" && stakeNum > 0 && lucroMin !== null)
      ? lucroMin / stakeNum * 100
      : (exchIdx !== null && totalInvestido > 0 && lucroMin !== null)
        ? lucroMin / totalInvestido * 100
        : (1 - somatorio) * 100;

  const temDados = (modo === "stake_base" || modo === "freebet")
    ? stakeNum > 0 && odd0 > 0
    : totalNum > 0 && todasPreenchidas;

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Modal open={open} onClose={onClose} title="🧮 Calculadora de Arbitragem" width={500}>

      {/* ── Linha 1: Seletor de entradas + Arb% ──────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, color: G.textDim }}>Entradas:</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[2, 3, 4, 5, 6, 7].map(n => (
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
        <div style={{
          fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, letterSpacing: 1,
          color: arbPct === null ? G.textMuted : arbPct > 0 ? G.green : arbPct < 0 ? G.red : G.textDim,
        }}>
          {arbPct !== null ? `${arbPct.toFixed(2)}%` : "—%"}
        </div>
      </div>

      {/* ── Seletor de modo principal ─────────────────────────────────────── */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: "flex", gap: 2, background: G.surface, borderRadius: 6, padding: 2, width: "fit-content" }}>
          {[
            { value: "arbitragem",  label: "Arbitragem"    },
            { value: "freebet_red", label: "Freebet se Red" },
            { value: "freebet",     label: "Ext. Freebet"   },
          ].map(({ value, label }) => {
            const ativo = modoPrincipal === value;
            return (
              <button key={value} onClick={() => setModoPrincipal(value)} style={{
                padding: "4px 16px", borderRadius: 5, border: "none", cursor: "pointer",
                background: ativo ? "#22D3EE22" : "transparent",
                color: ativo ? G.accent : G.textDim,
                fontSize: 12, fontWeight: 700, transition: "all 0.15s",
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Sub-seletor Stake base | Total base — apenas em Arbitragem */}
        {modoPrincipal === "arbitragem" && (
          <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 5, padding: 2, width: "fit-content", marginTop: 6 }}>
            {[
              { value: "stake_base", label: "Stake base" },
              { value: "total",      label: "Total base" },
            ].map(({ value, label }) => {
              const ativo = modoArb === value;
              return (
                <button key={value} onClick={() => ajustarModoArb(value)} style={{
                  padding: "3px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: ativo ? `${G.accent}18` : "transparent",
                  color: ativo ? G.accent : G.textMuted,
                  fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Diferença de retorno — apenas em Freebet se Red ─────────────── */}
      {modoPrincipal === "freebet_red" && (
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginBottom: 14,
          background: G.surface2, border: `1px solid ${G.border}`,
          borderRadius: 8, padding: "8px 14px",
        }}>
          <span style={{ fontSize: 12, color: G.textDim, fontWeight: 600, flex: 1, whiteSpace: "nowrap" }}>
            Outras entradas retornam a menos (R$):
          </span>
          <input
            value={diferencaStr}
            onChange={e => setDiferencaStr(e.target.value)}
            type="number"
            inputMode="decimal"
            placeholder="0"
            style={{
              background: G.surface, border: `1px solid ${difNum > 0 ? G.accent : G.border}`,
              borderRadius: 6, padding: "5px 10px",
              color: difNum > 0 ? G.text : G.textMuted,
              fontSize: 13, fontWeight: difNum > 0 ? 600 : 400,
              outline: "none", width: 80, textAlign: "right",
            }}
          />
        </div>
      )}

      {/* ── Cards de entrada ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {odds.map((odd, i) => {
          const isBase        = i === effectiveBaseIndex;
          // AJUSTE 4: entrada FB é a base selecionada no modo freebet (não sempre i=0)
          const isFbEntry     = modo === "freebet" && i === effectiveBaseIndex;
          const isExch        = exchIdx === i;
          const isBack        = isExch && exchTipo === "exchange_back";
          const isLay         = isExch && exchTipo === "exchange_lay";
          const stake         = stakesCalc[i];
          const lucro         = lucros[i];
          const retorno       = retornos[i];
          const stakeOk       = stake !== null && stake > 0;
          const lucroOk       = todasPreenchidas && lucro !== null;
          const lucroPositivo = lucroOk && lucro >= 0;
          // isManual: o usuário editou esta stake e o override ainda está ativo
          const isManual      = (modo === "stake_base" || modo === "freebet") && !isBase && stakesManual[i] !== "";

          const corBorda = isExch
            ? "#f9731644"
            : isBase && (modo === "stake_base" || modo === "freebet")
              ? `${G.accent}44`
              : G.border;

          const labelColuna2 = isFbEntry ? "FREEBET" : "STAKE";

          // AJUSTE 1: valor exibido no input das entradas não-base.
          // Auto: preenche com o valor calculado (não usa placeholder/sombra).
          // Manual: exibe o que o usuário digitou.
          // Limpar o campo (ev.target.value = "") → volta para auto automaticamente.
          const stakeInputValue = !isBase && (modo === "stake_base" || modo === "freebet")
            ? (stakesManual[i] !== "" ? stakesManual[i] : (stakeOk ? stake.toFixed(2) : ""))
            : "";

          return (
            <div key={i} style={{
              background: G.surface2, border: `1px solid ${corBorda}`,
              borderRadius: 10, padding: "10px 14px",
            }}>

              {/* ── Grid: número + labels + inputs ──────────────────────── */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "26px 1fr 1fr 1fr",
                gridTemplateRows: "auto auto",
                columnGap: 10, rowGap: 6,
                alignItems: "center",
              }}>
                {/* Número + badges — ocupa as duas linhas */}
                <div style={{
                  gridColumn: 1, gridRow: "1 / 3",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isExch ? "#f97316"
                         : isBase && (modo === "stake_base" || modo === "freebet") ? G.accent
                         : G.textDim,
                  }}>
                    {i + 1}
                  </span>
                  {isFbEntry && <span style={{ fontSize: 9, fontWeight: 700, color: G.green, background: `${G.green}22`, borderRadius: 3, padding: "1px 4px" }}>FB</span>}
                  {isBack    && <span style={{ fontSize: 9, fontWeight: 700, color: "#3b82f6", background: "#3b82f622", borderRadius: 3, padding: "1px 4px" }}>BACK</span>}
                  {isLay     && <span style={{ fontSize: 9, fontWeight: 700, color: "#ec4899", background: "#ec489922", borderRadius: 3, padding: "1px 4px" }}>LAY</span>}
                </div>

                {/* Labels — linha 1 */}
                {["ODD", labelColuna2, "LUCRO"].map((h, col) => (
                  <div key={h} style={{
                    gridColumn: col + 2, gridRow: 1,
                    fontSize: 10, color: G.textDim, fontWeight: 700,
                    letterSpacing: 0.8, textTransform: "uppercase",
                  }}>
                    {h}
                  </div>
                ))}

                {/* ODD input — linha 2, col 2 */}
                <input
                  value={odd}
                  onChange={ev => setOdd(i, ev.target.value)}
                  placeholder="0,00"
                  inputMode="decimal"
                  style={{
                    gridColumn: 2, gridRow: 2,
                    background: G.surface, border: `1px solid ${G.accent}`,
                    borderRadius: 6, padding: "7px 10px",
                    color: G.text, fontSize: 13,
                    outline: "none", width: "100%", boxSizing: "border-box",
                  }}
                />

                {/* STAKE / FREEBET — linha 2, col 3
                    Três casos:
                    A) Entrada base (stake_base ou freebet): input editável → stakeBase
                    B) Entrada não-base em stake_base ou freebet: input preenchido com valor
                       automático ou manual, com botão ↺ para resetar o override
                    C) Modo total: somente-leitura                             */}
                {isBase && (modo === "stake_base" || modo === "freebet") ? (
                  /* ── A: entrada base ── */
                  <input
                    value={stakeBase}
                    onChange={ev => updateStakeBase(ev.target.value)}
                    placeholder="0,00"
                    type="number"
                    inputMode="decimal"
                    style={{
                      gridColumn: 3, gridRow: 2,
                      background: G.surface, border: `1px solid ${G.accent}`,
                      borderRadius: 6, padding: "7px 10px",
                      color: G.text, fontSize: 13, fontWeight: 600,
                      outline: "none", width: "100%", boxSizing: "border-box",
                    }}
                  />
                ) : (modo === "stake_base" || modo === "freebet") ? (
                  /* ── B: entrada não-base, stake preenchida automaticamente ── */
                  <div style={{ gridColumn: 3, gridRow: 2, display: "flex", alignItems: "center", gap: 3 }}>
                    <input
                      value={stakeInputValue}
                      onChange={ev => setManual(i, ev.target.value)}
                      placeholder="—"
                      type="number"
                      inputMode="decimal"
                      style={{
                        flex: 1, minWidth: 0,
                        background: G.surface,
                        // Borda âmbar quando há override manual ativo
                        border: `1px solid ${isManual ? "#F59E0B55" : G.border}`,
                        borderRadius: 6, padding: "7px 8px",
                        color: G.text,
                        fontSize: 13, fontWeight: 600,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                    {/* AJUSTE 5: ↺ desfaz o override e volta para o automático atual */}
                    {isManual && (
                      <button
                        onClick={() => clearManual(i)}
                        title="Voltar para cálculo automático"
                        style={{
                          background: "none", border: "none",
                          color: G.textDim, cursor: "pointer",
                          fontSize: 15, padding: "2px 3px", flexShrink: 0, lineHeight: 1,
                        }}
                      >↺</button>
                    )}
                  </div>
                ) : (
                  /* ── C: modo total — somente-leitura ── */
                  <div style={{
                    gridColumn: 3, gridRow: 2,
                    background: G.surface, border: `1px solid ${G.border}`,
                    borderRadius: 6, padding: "7px 10px",
                    color: stakeOk ? G.text : G.textMuted,
                    fontSize: 13, fontWeight: 600,
                    minHeight: 34, display: "flex", alignItems: "center",
                  }}>
                    {stakeOk ? fmtStake(stake) : "—"}
                  </div>
                )}

                {/* LUCRO — linha 2, col 4 */}
                <div style={{
                  gridColumn: 4, gridRow: 2,
                  background: G.surface, border: `1px solid ${G.border}`,
                  borderRadius: 6, padding: "7px 10px",
                  color: lucroOk ? (lucroPositivo ? G.green : G.red) : G.textMuted,
                  fontSize: 13, fontWeight: 700,
                  minHeight: 34, display: "flex", alignItems: "center",
                }}>
                  {lucroOk ? fmt(lucro) : "—"}
                </div>
              </div>

              {/* ── Linha de controles: BASE | AUMENTO | RETORNO ─────────── */}
              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>

                {/* Botão BASE — disponível em stake_base E freebet (AJUSTE 4).
                    Label diferenciado por modo: BASE / FB BASE               */}
                {(modo === "stake_base" || modo === "freebet") && (
                  <>
                    <button
                      onClick={() => changeBase(i, stakesCalc[i])}
                      disabled={isBase}
                      style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "2px 8px", borderRadius: 4,
                        border: `1px solid ${isBase ? G.accent : G.border}`,
                        background: isBase ? `${G.accent}22` : "transparent",
                        color: isBase ? G.accent : G.textDim,
                        cursor: isBase ? "default" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {isBase
                        ? (modo === "freebet" ? "📌 FB BASE" : "📌 BASE")
                        : (modo === "freebet" ? "FB BASE"   : "BASE")}
                    </button>
                    <div style={{ width: 1, height: 12, background: G.border, flexShrink: 0 }} />
                  </>
                )}

                {/* Aumento de odd (booster) */}
                <span style={{
                  fontSize: 10, color: G.textDim, fontWeight: 600,
                  letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
                }}>
                  Aumento (%):
                </span>
                <input
                  value={aumentos[i]}
                  onChange={ev => setAumento(i, ev.target.value)}
                  placeholder="0"
                  type="number"
                  inputMode="decimal"
                  style={{
                    background: G.surface,
                    border: `1px solid ${(parseFloat(aumentos[i]) || 0) > 0 ? "#F59E0B66" : G.border}`,
                    borderRadius: 6, padding: "3px 7px",
                    color: (parseFloat(aumentos[i]) || 0) > 0 ? G.text : G.textMuted,
                    fontSize: 12, outline: "none", width: 52,
                  }}
                />
                {(parseFloat(aumentos[i]) || 0) > 0 && oddsAjustadas[i] > 0 && (
                  <span style={{ fontSize: 11, color: "#F59E0B", fontWeight: 700, whiteSpace: "nowrap" }}>
                    → {oddsAjustadas[i].toFixed(2)}
                  </span>
                )}

                {/* Retorno bruto por entrada */}
                {retorno !== null && (
                  <span style={{ marginLeft: "auto", fontSize: 11, whiteSpace: "nowrap", color: G.textDim }}>
                    retorno <span style={{ color: G.text, fontWeight: 700 }}>{fmt(retorno)}</span>
                  </span>
                )}
              </div>

              {/* ── Controles de Exchange — apenas na entrada 2 (i === 1) ─── */}
              {i === 1 && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${G.border}`,
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  <label style={{
                    display: "flex", alignItems: "center", gap: 5,
                    cursor: "pointer", fontSize: 12,
                    color: isExch ? "#f97316" : G.textDim,
                  }}>
                    <input
                      type="checkbox"
                      checked={isExch}
                      onChange={() => toggleExch(i)}
                      style={{ accentColor: "#f97316", width: 13, height: 13 }}
                    />
                    <span style={{ fontWeight: 600 }}>Exchange</span>
                  </label>

                  {isExch && (
                    <div style={{ display: "flex", gap: 2, background: G.surface, borderRadius: 6, padding: 2 }}>
                      <button onClick={() => setExchTipo("exchange_back")} style={{
                        padding: "2px 12px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: isBack ? "#3b82f622" : "transparent",
                        color: isBack ? "#3b82f6" : G.textDim,
                        fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                      }}>Back</button>
                      <button onClick={() => setExchTipo("exchange_lay")} style={{
                        padding: "2px 12px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: isLay ? "#ec489922" : "transparent",
                        color: isLay ? "#ec4899" : G.textDim,
                        fontSize: 11, fontWeight: 700, transition: "all 0.15s",
                      }}>Lay</button>
                    </div>
                  )}

                  {isExch && (
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ fontSize: 11, color: G.textDim, fontWeight: 600, whiteSpace: "nowrap" }}>
                        Comissão (%):
                      </span>
                      <input
                        value={exchComm}
                        onChange={e => setExchComm(e.target.value)}
                        placeholder="5"
                        type="number"
                        inputMode="decimal"
                        style={{
                          background: G.surface2, border: `1px solid #f9731644`,
                          borderRadius: 6, padding: "3px 7px",
                          color: G.text, fontSize: 12, outline: "none", width: 52,
                        }}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* ── Rodapé: Total investido + Lucro mínimo ────────────────────────── */}
      <div style={{
        background: G.surface2, border: `1px solid ${G.border}`,
        borderRadius: 8, padding: "12px 16px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
      }}>
        <div>
          <div style={{
            fontSize: 10, color: G.textDim, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
          }}>
            Total Investido
          </div>
          {modo === "total" ? (
            <input
              value={totalStr}
              onChange={e => setTotalStr(e.target.value)}
              placeholder="0,00"
              type="number"
              inputMode="decimal"
              style={{
                background: G.surface, border: `1px solid ${G.accent}`,
                borderRadius: 6, padding: "6px 10px",
                color: G.text, fontSize: 16, fontWeight: 700,
                outline: "none", width: "100%", boxSizing: "border-box",
                fontFamily: "'Barlow Condensed'",
              }}
            />
          ) : (
            <div style={{
              fontFamily: "'Barlow Condensed'", fontSize: 22, fontWeight: 800,
              color: temDados ? G.text : G.textMuted,
            }}>
              {temDados ? fmt(totalInvestido) : "—"}
            </div>
          )}
        </div>
        <div>
          <div style={{
            fontSize: 10, color: G.textDim, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
          }}>
            Lucro Mínimo
          </div>
          <div style={{
            fontFamily: "'Barlow Condensed'", fontSize: 22, fontWeight: 800,
            color: (todasPreenchidas && lucroMin !== null)
              ? (lucroMin >= 0 ? G.green : G.red)
              : G.textMuted,
          }}>
            {(todasPreenchidas && lucroMin !== null) ? fmt(lucroMin) : "—"}
          </div>
        </div>
      </div>

      {/* ── "Usar na operação" — envia odds ajustadas e stakes finais ──────── */}
      {onUsarNaOp && temDados && (
        <button onClick={() => onUsarNaOp({
          entradas: odds.map((odd, i) => ({
            odd:   oddsAjustadas[i] > 0 ? String(oddsAjustadas[i]) : odd,
            // stakesCalc já reflete overrides manuais + auto
            valor: stakesCalc[i] !== null ? String(stakesCalc[i]) : "",
            // AJUSTE 4: freebet marca a entrada base selecionada (não sempre i=0)
            ...(modo === "freebet" && i === effectiveBaseIndex && { tipo: "freebet" }),
            ...(modo === "stake_base" && i === exchIdx && { tipo: exchTipo, comissao: exchComm || "" }),
          })),
        })} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", marginTop: 12,
          background: "#22D3EE22", border: `1px solid ${G.accent}`,
          borderRadius: 8, padding: "10px 16px", cursor: "pointer",
          color: G.accent, fontSize: 13, fontWeight: 700,
          transition: "background 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#22D3EE33"}
          onMouseLeave={e => e.currentTarget.style.background = "#22D3EE22"}
        >
          🏟️ Usar na operação
        </button>
      )}

    </Modal>
  );
}
