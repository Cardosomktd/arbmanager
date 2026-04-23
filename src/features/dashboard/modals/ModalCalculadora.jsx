import { useState } from "react";
import { G } from "../../../constants/colors";
import { fmt, fmtNum } from "../../../utils/format";
import { Modal } from "../../../components/ui/Modal";

export function ModalCalculadora({ open, onClose }) {
  const [numEntradas, setNumEntradas] = useState(2);
  const [odds,        setOdds]        = useState(["", ""]);
  const [stakeBase,   setStakeBase]   = useState("");

  function ajustarEntradas(n) {
    setNumEntradas(n);
    setOdds(prev =>
      n > prev.length
        ? [...prev, ...Array(n - prev.length).fill("")]
        : prev.slice(0, n)
    );
  }

  function setOdd(i, v) {
    setOdds(prev => prev.map((o, idx) => (idx === i ? v : o)));
  }

  // ── Cálculo ─────────────────────────────────────────────────────────────────
  const stakeNum = parseFloat(stakeBase) || 0;
  const odd0     = parseFloat(String(odds[0] || "").replace(",", ".")) || 0;
  const retorno  = stakeNum * odd0;                        // stake_base × odd_base

  const stakes = odds.map((o, i) => {
    if (i === 0) return stakeNum;
    const odd = parseFloat(String(o || "").replace(",", ".")) || 0;
    return retorno > 0 && odd > 0 ? retorno / odd : 0;   // retorno / odd_i
  });

  const totalStakes = stakes.reduce((s, v) => s + v, 0);
  const lucro       = retorno - totalStakes;
  const temDados    = stakeNum > 0 && odd0 > 0;

  return (
    <Modal open={open} onClose={onClose} title="🧮 Calculadora de Arbitragem" width={480}>

      {/* ── Número de entradas ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
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

      {/* ── Lista de entradas ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {odds.map((odd, i) => {
          const stake  = stakes[i];
          const oddNum = parseFloat(String(odd || "").replace(",", ".")) || 0;
          const isBase = i === 0;

          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "56px 1fr 1fr",
              gap: 8, alignItems: "end",
              background: G.surface2,
              border: `1px solid ${isBase ? G.accent + "44" : G.border}`,
              borderRadius: 8, padding: "10px 12px",
            }}>
              {/* Label */}
              <div style={{ fontSize: 11, color: isBase ? G.accent : G.textDim, fontWeight: 700, letterSpacing: 0.5 }}>
                ENT. {i + 1}
                {isBase && <div style={{ fontSize: 9, color: G.accent, fontWeight: 400, marginTop: 2 }}>base</div>}
              </div>

              {/* Odd */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 10, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Odd
                </label>
                <input
                  value={odd}
                  onChange={e => setOdd(i, e.target.value)}
                  placeholder="Ex: 2,50"
                  inputMode="decimal"
                  style={{
                    background: G.surface, border: `1px solid ${G.border}`,
                    borderRadius: 6, padding: "7px 10px", color: G.text,
                    fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
                  }}
                />
              </div>

              {/* Stake */}
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <label style={{ fontSize: 10, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Stake (R$)
                </label>
                {isBase ? (
                  <input
                    value={stakeBase}
                    onChange={e => setStakeBase(e.target.value)}
                    placeholder="0,00"
                    type="number"
                    inputMode="decimal"
                    style={{
                      background: G.surface, border: `1px solid ${G.accent}66`,
                      borderRadius: 6, padding: "7px 10px", color: G.text,
                      fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <div style={{
                    background: G.surface, border: `1px solid ${G.border}`,
                    borderRadius: 6, padding: "7px 10px",
                    color: (temDados && oddNum > 0) ? G.text : G.textMuted,
                    fontSize: 13, fontWeight: 600, minHeight: 35,
                    display: "flex", alignItems: "center",
                  }}>
                    {(temDados && oddNum > 0) ? fmtNum(stake) : "—"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Resultado ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: G.surface2, border: `1px solid ${G.border}`,
        borderRadius: 8, padding: "14px 16px",
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
      }}>
        <div>
          <div style={{ fontSize: 10, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            Retorno
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: temDados ? G.text : G.textMuted }}>
            {temDados ? fmt(retorno) : "—"}
          </div>
          {temDados && (
            <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>
              igual para todas as entradas
            </div>
          )}
        </div>
        <div>
          <div style={{ fontSize: 10, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>
            Lucro
          </div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: temDados ? (lucro >= 0 ? G.green : G.red) : G.textMuted }}>
            {temDados ? fmt(lucro) : "—"}
          </div>
          {temDados && (
            <div style={{ fontSize: 10, color: G.textMuted, marginTop: 2 }}>
              total stakes: {fmt(totalStakes)}
            </div>
          )}
        </div>
      </div>

    </Modal>
  );
}
