import { useState } from "react";
import { G } from "../../../constants/colors";
import { fmt } from "../../../utils/format";
import { Modal } from "../../../components/ui/Modal";

// Stake com 2 casas decimais para exibição (ex: 95.238 → "95,24")
function fmtStake(v) {
  return (Number(v) || 0).toFixed(2).replace(".", ",");
}

export function ModalCalculadora({ open, onClose, onUsarNaOp }) {
  const [numEntradas, setNumEntradas] = useState(2);
  const [odds,        setOdds]        = useState(["", ""]);
  const [stakeBase,   setStakeBase]   = useState("");
  const [totalStr,    setTotalStr]    = useState("");

  // ── Modos ────────────────────────────────────────────────────────────────────
  // modoPrincipal: "arbitragem" | "freebet_red" | "freebet"
  // modoArb:       "stake_base" | "total"  (sub-modo, só ativo em arbitragem)
  // modo (derivado): alimenta toda a pipeline de cálculo sem alterar nenhuma fórmula
  const [modoPrincipal, setModoPrincipal] = useState("arbitragem");
  const [modoArb,       setModoArb]       = useState("stake_base");
  const modo = modoPrincipal === "arbitragem" ? modoArb
             : modoPrincipal === "freebet_red" ? "stake_base"
             : "freebet"; // modoPrincipal === "freebet"

  // Exchange — no máximo 1 entrada por cálculo
  const [exchIdx,  setExchIdx]  = useState(null);              // índice ou null
  const [exchTipo, setExchTipo] = useState("exchange_back");   // "exchange_back" | "exchange_lay"
  const [exchComm, setExchComm] = useState("");                // comissão em %

  // Diferença de retorno: entradas secundárias retornam este valor a menos que a principal
  // Armazenado sempre, mas só aplicado matematicamente em modoPrincipal === "freebet_red"
  const [diferencaStr, setDiferencaStr] = useState("0");

  function ajustarEntradas(n) {
    setNumEntradas(n);
    setOdds(prev =>
      n > prev.length
        ? [...prev, ...Array(n - prev.length).fill("")]
        : prev.slice(0, n)
    );
    // Limpa exchange se a entrada foi removida pela redução
    if (exchIdx !== null && exchIdx >= n) setExchIdx(null);
  }

  function setOdd(i, v) {
    setOdds(prev => prev.map((o, idx) => (idx === i ? v : o)));
  }

  // Toggle exchange: marcar automaticamente desmarca qualquer outra entrada
  function toggleExch(i) {
    setExchIdx(prev => (prev === i ? null : i));
  }

  // Sub-modo de arbitragem: ao trocar para total, pré-preenche o campo com o total calculado
  function ajustarModoArb(novoModoArb) {
    if (novoModoArb === "total" && modoArb === "stake_base") {
      const st  = parseFloat(stakeBase) || 0;
      const o0  = parseFloat(String(odds[0] || "").replace(",", ".")) || 0;
      if (st > 0 && o0 > 0) {
        const rb    = st * o0;
        const oddsN = odds.map(o => parseFloat(String(o || "").replace(",", ".")) || 0);
        const tot   = oddsN.reduce((s, odd, i) => {
          if (i === 0) return s + st;
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
  const odd0     = oddsNum[0];

  const todasPreenchidas = oddsNum.every(o => o > 0);
  const somatorio = todasPreenchidas ? oddsNum.reduce((s, o) => s + 1 / o, 0) : 0;

  // Comissão em decimal
  const comm = (parseFloat(exchComm) || 0) / 100;

  // Diferença de retorno (R$): retorno-alvo das entradas secundárias = retornoBase − difNum
  // Só aplicada matematicamente no modo "freebet_red"; nos demais é sempre 0
  const difNum = modoPrincipal === "freebet_red"
    ? Math.max(0, parseFloat(diferencaStr) || 0)
    : 0;

  // Flags de exchange
  const hasExchLay  = exchIdx !== null && exchTipo === "exchange_lay";
  const hasExchBack = exchIdx !== null && exchTipo === "exchange_back";

  // ── Retorno-base ────────────────────────────────────────────────────────────
  //   stake_base: stake × odd       (retorno bruto equalizado entre entradas)
  //   freebet:    freebet × (odd−1) (stake da freebet não retorna)
  //   total:      não usa retornoBase
  const retornoBase = stakeNum > 0 && odd0 > 0
    ? (modo === "freebet" ? stakeNum * (odd0 - 1) : stakeNum * odd0)
    : 0;

  // ── Stakes por modo ─────────────────────────────────────────────────────────
  const stakesCalc = oddsNum.map((odd, i) => {
    if (modo === "stake_base" || modo === "freebet") {
      if (i === 0) return stakeNum > 0 ? stakeNum : null;
      if (retornoBase <= 0 || odd <= 0) return null;

      // Exchange: aplica em stake_base e freebet — mesmas fórmulas, retornoBase diferente
      //   stake_base: retornoBase = stake × odd
      //   freebet:    retornoBase = freebet × (odd_fb − 1)
      if (i === exchIdx && exchTipo === "exchange_back") {
        // Equaliza: s × [1 + (odd−1)×(1−comm)] = retornoBase
        const denom = 1 + (odd - 1) * (1 - comm);
        return denom > 0 ? Math.round((retornoBase / denom) * 100) / 100 : null;
      }
      if (i === exchIdx && exchTipo === "exchange_lay") {
        // Equaliza: s_lay × (odd_lay − comm) = retornoBase
        const divisor = odd - comm;
        return divisor > 0 ? Math.round((retornoBase / divisor) * 100) / 100 : null;
      }

      // Entradas secundárias normais: diferença só se aplica no modo stake_base
      const retornoAlvo = (difNum > 0 && modo === "stake_base") ? retornoBase - difNum : retornoBase;
      if (retornoAlvo <= 0) return null;
      return Math.round((retornoAlvo / odd) * 100) / 100;

    } else {
      // Aposta total — distribuição proporcional
      if (!todasPreenchidas || somatorio <= 0 || totalNum <= 0 || odd <= 0) return null;
      return Math.round((totalNum / (odd * somatorio)) * 100) / 100;
    }
  });

  // ── Capital imobilizado e total investido ───────────────────────────────────
  //   exchange_lay → normais + responsabilidade
  //   freebet      → soma apenas das entradas de cobertura (i > 0); freebet não é capital
  //   demais       → soma simples de todas as stakes
  const layStakeCalc = hasExchLay ? (stakesCalc[exchIdx] ?? null) : null;
  const layOddNum    = hasExchLay ? oddsNum[exchIdx] : 0;

  const responsabilidade = layStakeCalc !== null && layOddNum > 0
    ? layStakeCalc * (layOddNum - 1)
    : 0;

  const somaStakesNormais = stakesCalc.reduce(
    (sum, s, i) => sum + (hasExchLay && i === exchIdx ? 0 : (s ?? 0)), 0
  );

  const totalInvestido = hasExchLay
    ? (modo === "freebet"
        ? responsabilidade                              // freebet não é capital → só responsabilidade
        : somaStakesNormais + responsabilidade)
    : modo === "freebet"
      ? stakesCalc.slice(1).reduce((s, v) => s + (v ?? 0), 0)   // exclui a freebet (entrada 0)
      : stakesCalc.reduce((s, v) => s + (v ?? 0), 0);

  // ── Lucros por cenário (por linha) ──────────────────────────────────────────
  //   Freebet  i=0:   retorno = s × (odd − 1) → lucro = s×(odd−1) − totalInvestido
  //   Normal   i:     lucro = s × odd − totalInvestido
  //   Exch Back:      lucro = (s + s×(odd−1)×(1−comm)) − totalInvestido
  //   Exch Lay wins (stake_base): lucro = s_lay×(1−comm) − somaStakesNormais
  //   Exch Lay wins (freebet):    lucro = s_lay×(1−comm)  [freebet não é capital]
  const lucros = oddsNum.map((odd, i) => {
    const s = stakesCalc[i];
    if (s === null || odd <= 0) return null;

    if (hasExchLay && i === exchIdx) {
      if (layStakeCalc === null) return null;
      // Em freebet a freebet não é capital real: custo de saída do lay = 0
      const custoSaida = modo === "freebet" ? 0 : somaStakesNormais;
      return layStakeCalc * (1 - comm) - custoSaida;
    }
    if (hasExchBack && i === exchIdx) {
      return s + s * (odd - 1) * (1 - comm) - totalInvestido;
    }
    if (modo === "freebet" && i === 0) {
      // Freebet: stake não retorna → retorno líquido = s × (odd − 1)
      return s * (odd - 1) - totalInvestido;
    }
    return s * odd - totalInvestido;
  });

  // ── Lucro mínimo para o rodapé ──────────────────────────────────────────────
  const lucrosDefinidos = lucros.filter(l => l !== null);
  const lucroMin = lucrosDefinidos.length === odds.length && lucrosDefinidos.length > 0
    ? Math.min(...lucrosDefinidos)
    : null;

  // ── Arb% ───────────────────────────────────────────────────────────────────
  //   Exchange:  ROI real → lucroMin / totalInvestido × 100
  //   Freebet:   taxa de extração → lucroMin / stakeNum × 100
  //   Demais:    fórmula clássica → (1 − Σ(1/odd)) × 100
  const arbPct = !todasPreenchidas
    ? null
    : (exchIdx !== null && totalInvestido > 0 && lucroMin !== null)
      ? lucroMin / totalInvestido * 100
      : (modo === "freebet" && stakeNum > 0 && lucroMin !== null)
        ? lucroMin / stakeNum * 100
        : (1 - somatorio) * 100;

  // temDados: condição para exibir "Usar na operação" e o total no rodapé
  const temDados = (modo === "stake_base" || modo === "freebet")
    ? stakeNum > 0 && odd0 > 0
    : totalNum > 0 && todasPreenchidas;

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
                background: numEntradas === n ? "#00d4ff22" : G.surface2,
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
                background: ativo ? "#00d4ff22" : "transparent",
                color: ativo ? G.accent : G.textDim,
                fontSize: 12, fontWeight: 700,
                fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
              }}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Sub-seletor Stake base | Total base — apenas no modo Arbitragem */}
        {modoPrincipal === "arbitragem" && (
          <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 5, padding: 2, width: "fit-content", marginTop: 6 }}>
            {[
              { value: "stake_base", label: "Stake base"  },
              { value: "total",      label: "Total base"  },
            ].map(({ value, label }) => {
              const ativo = modoArb === value;
              return (
                <button key={value} onClick={() => ajustarModoArb(value)} style={{
                  padding: "3px 14px", borderRadius: 4, border: "none", cursor: "pointer",
                  background: ativo ? `${G.accent}18` : "transparent",
                  color: ativo ? G.accent : G.textMuted,
                  fontSize: 11, fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Diferença de retorno — apenas no modo Freebet se Red ────────── */}
      {modoPrincipal === "freebet_red" && <div style={{
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
      </div>}

      {/* ── Cards de entrada ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {odds.map((odd, i) => {
          const isBase        = i === 0;
          const isFbEntry     = modo === "freebet" && isBase; // entrada 1 = freebet
          const isExch        = exchIdx === i;
          const isBack        = isExch && exchTipo === "exchange_back";
          const isLay         = isExch && exchTipo === "exchange_lay";
          const stake         = stakesCalc[i];
          const lucro         = lucros[i];
          const stakeOk       = stake !== null && stake > 0;
          const lucroOk       = todasPreenchidas && lucro !== null;
          const lucroPositivo = lucroOk && lucro >= 0;

          // Entrada 0 é editável em stake_base e freebet; todas as outras são lidas
          const stakeEditavel = isBase && (modo === "stake_base" || modo === "freebet");

          // Borda da entrada principal: accent em stake_base e freebet; exchange = laranja
          const corBorda = isExch
            ? "#f9731644"
            : (isBase && (modo === "stake_base" || modo === "freebet"))
              ? `${G.accent}44`
              : G.border;

          // Label da coluna 2: "FREEBET" para a entrada 1 no modo freebet
          const labelColuna2 = isFbEntry ? "FREEBET" : "STAKE";

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
                {/* Número — cobre as duas linhas */}
                <div style={{
                  gridColumn: 1, gridRow: "1 / 3",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 3,
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: isExch
                      ? "#f97316"
                      : (isBase && (modo === "stake_base" || modo === "freebet"))
                        ? G.accent
                        : G.textDim,
                  }}>
                    {i + 1}
                  </span>
                  {isFbEntry && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: G.green, background: `${G.green}22`, borderRadius: 3, padding: "1px 4px" }}>
                      FB
                    </span>
                  )}
                  {isBack && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#3b82f6", background: "#3b82f622", borderRadius: 3, padding: "1px 4px" }}>
                      BACK
                    </span>
                  )}
                  {isLay && (
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#ec4899", background: "#ec489922", borderRadius: 3, padding: "1px 4px" }}>
                      LAY
                    </span>
                  )}
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

                {/* STAKE / FREEBET — linha 2, col 3 */}
                {stakeEditavel ? (
                  <input
                    value={stakeBase}
                    onChange={ev => setStakeBase(ev.target.value)}
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
                ) : (
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
                  color: lucroOk
                    ? (lucroPositivo ? G.green : G.red)
                    : G.textMuted,
                  fontSize: 13, fontWeight: 700,
                  minHeight: 34, display: "flex", alignItems: "center",
                }}>
                  {lucroOk ? fmt(lucro) : "—"}
                </div>
              </div>

              {/* ── Controles de Exchange (abaixo do grid) ──────────────── */}
              {/* Exchange: apenas na entrada 2 (i === 1), em todos os modos */}
              {i === 1 && (
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${G.border}`,
                  display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                }}>
                  {/* Checkbox Exchange */}
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

                  {/* Seletor Back/Lay — apenas quando Exchange ativo */}
                  {isExch && (
                    <div style={{
                      display: "flex", gap: 2,
                      background: G.surface, borderRadius: 6, padding: 2,
                    }}>
                      <button onClick={() => setExchTipo("exchange_back")} style={{
                        padding: "2px 12px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: isBack ? "#3b82f622" : "transparent",
                        color: isBack ? "#3b82f6" : G.textDim,
                        fontSize: 11, fontWeight: 700,
                        fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                      }}>
                        Back
                      </button>
                      <button onClick={() => setExchTipo("exchange_lay")} style={{
                        padding: "2px 12px", borderRadius: 5, border: "none", cursor: "pointer",
                        background: isLay ? "#ec489922" : "transparent",
                        color: isLay ? "#ec4899" : G.textDim,
                        fontSize: 11, fontWeight: 700,
                        fontFamily: "'DM Sans', sans-serif", transition: "all 0.15s",
                      }}>
                        Lay
                      </button>
                    </div>
                  )}

                  {/* Comissão — apenas quando Exchange ativo */}
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
          {/* Apenas "Aposta total" usa campo editável; stake_base e freebet mostram calculado */}
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

      {/* Botão de integração — aparece quando há dados suficientes */}
      {onUsarNaOp && temDados && (
        <button onClick={() => onUsarNaOp({
          entradas: odds.map((odd, i) => ({
            odd:   odd,
            valor: stakesCalc[i] !== null ? String(stakesCalc[i]) : "",
            // Passa tipo freebet para a entrada 0 no modo Ext. Freebet
            ...(modo === "freebet" && i === 0 && { tipo: "freebet" }),
            // Passa tipo e comissão para a entrada exchange (apenas stake_base)
            ...(modo === "stake_base" && i === exchIdx && { tipo: exchTipo, comissao: exchComm || "" }),
          })),
        })} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          width: "100%", marginTop: 12,
          background: "#00d4ff22", border: `1px solid ${G.accent}`,
          borderRadius: 8, padding: "10px 16px", cursor: "pointer",
          color: G.accent, fontSize: 13, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif", transition: "background 0.15s",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "#00d4ff33"}
          onMouseLeave={e => e.currentTarget.style.background = "#00d4ff22"}
        >
          🏟️ Usar na operação
        </button>
      )}

    </Modal>
  );
}
