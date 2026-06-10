import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { fmt, hojeISODateLocal } from "../../../utils/format";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";
import { CasaSelect } from "../../../components/ui/CasaSelect";
import iconBingo from "../../../assets/icons/Bingo.svg";

export function ModalApostaAvulsa({ open, onClose, onSalvar, casas, freebetsDisponiveis = [] }) {
  const [data,                  setData]                  = useState(hojeISODateLocal);
  const [casa,                  setCasa]                  = useState("");
  const [descricao,             setDescricao]             = useState("");
  const [odd,                   setOdd]                   = useState("");
  const [valor,                 setValor]                 = useState("");
  const [isFb,                  setIsFb]                  = useState(false);
  const [fbTipo,                setFbTipo]                = useState("freebet");
  const [freebetIds,            setFreebetIds]            = useState([]);
  const [usarFreeNaoCadastrada, setUsarFreeNaoCadastrada] = useState(false);
  const [freebetValorUsado,     setFreebetValorUsado]     = useState("");
  const [erro,                  setErro]                  = useState("");

  useEffect(() => {
    if (!open) {
      setData(hojeISODateLocal()); setCasa(""); setDescricao("");
      setOdd(""); setValor(""); setIsFb(false); setFbTipo("freebet");
      setFreebetIds([]); setUsarFreeNaoCadastrada(false); setFreebetValorUsado("");
      setErro("");
    }
  }, [open]);

  function handleCasaChange(v) {
    setCasa(v);
    setFreebetIds([]);
    setUsarFreeNaoCadastrada(false);
    setFreebetValorUsado("");
  }

  function salvar() {
    if (!data)          { setErro("Informe a data."); return; }
    if (!casa)          { setErro("Selecione a casa."); return; }
    if (!odd || !valor) { setErro("Informe a odd e o valor."); return; }

    if (isFb && fbTipo === "freebet") {
      const temAcumulada = freebetsDisponiveis.some(f => f.tipo === "acumulada" && f.casaId === casa);
      if (!temAcumulada) {
        if (!usarFreeNaoCadastrada && freebetIds.length === 0) {
          setErro("Selecione ao menos uma freebet ou marque \"Freebet não cadastrada\".");
          return;
        }
        if (!usarFreeNaoCadastrada && freebetIds.length > 0) {
          const sumSaldos = freebetIds.reduce((acc, fid) => {
            const f = freebetsDisponiveis.find(fb => fb.id === fid);
            return acc + (f ? (f.saldo ?? f.valor ?? 0) : 0);
          }, 0);
          if ((parseFloat(valor) || 0) > sumSaldos + 0.001) {
            setErro(`Saldo das freebets selecionadas (${fmt(sumSaldos)}) insuficiente para ${fmt(parseFloat(valor) || 0)}.`);
            return;
          }
        }
      }
    }

    setErro("");
    const desc   = descricao.trim();
    const acumFb = (isFb && fbTipo === "freebet")
      ? freebetsDisponiveis.find(f => f.tipo === "acumulada" && f.casaId === casa)
      : null;

    onSalvar({
      id:        uid(),
      subtipo:   "bingo",
      tipo:      "avulsa",
      nome:      desc ? `Bingo — ${desc}` : "Bingo",
      data,
      casa,
      odd,
      valor:     parseFloat(valor) || 0,
      tipoValor: isFb ? fbTipo : "dinheiro_real",
      // Freebet linkage — apenas quando tipo freebet selecionado
      ...(isFb && fbTipo === "freebet" && {
        freebetIds:   acumFb ? [acumFb.id] : (usarFreeNaoCadastrada ? [] : freebetIds),
        freebetManual: usarFreeNaoCadastrada,
        ...(acumFb && freebetValorUsado && { freebetValorUsado }),
      }),
      situacao:  "pendente",
      criadoEm:  new Date().toISOString(),
    });
    onClose();
  }

  const casasAtivas = casas.filter(c => c.ativa);
  const casaFbAcum  = (isFb && fbTipo === "freebet" && casa)
    ? freebetsDisponiveis.find(f => f.tipo === "acumulada" && f.casaId === casa)
    : null;
  const fbsDaCasa   = (isFb && fbTipo === "freebet" && casa)
    ? freebetsDisponiveis.filter(f => f.casaId === casa && f.tipo !== "acumulada")
    : [];
  const casaNome    = casas.find(c => c.id === casa)?.nome || "";

  return (
    <Modal open={open} onClose={onClose} title={
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img src={iconBingo} alt="" width={22} height={22} style={{ display: "block" }} />
        BINGO
      </span>
    } width={440}>
      {erro && (
        <div style={{ background: "#F8717122", border: "1px solid #F8717144", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}

      <div style={{ background: "#8B5CF60d", border: "1px solid #8B5CF633", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#A78BFA" }}>
        <img src={iconBingo} alt="" width={14} height={14} style={{ display: "inline-block", verticalAlign: "middle", marginRight: 6 }} />
        Cadastre aqui a sua múltipla.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Data" value={data} onChange={setData} type="date" required placeholder="Informe a data do último evento da múltipla" />

        <CasaSelect casas={casasAtivas} value={casa} onChange={handleCasaChange} required />

        <Input label="Descrição (opcional)" value={descricao} onChange={setDescricao} placeholder="Ex: Flamengo vence em qualquer mercado" />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Odd" value={odd} onChange={setOdd} placeholder="Ex: 2,50" required inputMode="decimal" />
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
        </div>

        {/* ── Checkbox Freebet + sub-seletor de tipo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: isFb ? G.green : G.textDim, userSelect: "none" }}>
            <input
              type="checkbox"
              checked={isFb}
              onChange={e => {
                setIsFb(e.target.checked);
                if (!e.target.checked) {
                  setFbTipo("freebet");
                  setFreebetIds([]);
                  setUsarFreeNaoCadastrada(false);
                  setFreebetValorUsado("");
                }
              }}
              style={{ accentColor: G.green, width: 14, height: 14 }}
            />
            <span style={{ fontWeight: 600 }}>Freebet</span>
          </label>

          {isFb && (
            <select
              value={fbTipo}
              onChange={e => {
                setFbTipo(e.target.value);
                setFreebetIds([]);
                setUsarFreeNaoCadastrada(false);
                setFreebetValorUsado("");
              }}
              style={{ background: G.surface2, border: `1px solid #34D39944`, borderRadius: 6, padding: "3px 10px", color: G.text, fontSize: 12, outline: "none", cursor: "pointer" }}
            >
              <option value="freebet">Freebet</option>
              <option value="bonus">Bônus</option>
            </select>
          )}
        </div>

        {/* ── Seleção de freebet do estoque (apenas quando tipo = freebet) ── */}
        {isFb && fbTipo === "freebet" && (
          <div style={{ background: "#34D3990d", border: "1px solid #34D39933", borderRadius: 8, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, color: "#34D399", fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
              Freebet do estoque
            </div>

            {!casa ? (
              <div style={{ fontSize: 12, color: G.textMuted }}>
                Selecione a casa acima para listar as freebets disponíveis.
              </div>
            ) : casaFbAcum ? (
              /* ── Carteira acumulada ── */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: G.accent, marginBottom: 6 }}>
                  <span>🔄</span>
                  <span style={{ fontWeight: 600 }}>Carteira — {casaNome}</span>
                  <span style={{ color: G.textDim }}>
                    Saldo: <strong style={{ color: G.green }}>{fmt(casaFbAcum.saldo ?? 0)}</strong>
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11, color: G.textDim }}>Valor a usar (R$):</span>
                  <input
                    type="number"
                    value={freebetValorUsado}
                    onChange={ev => setFreebetValorUsado(ev.target.value)}
                    placeholder={String(casaFbAcum.saldo ?? 0)}
                    min="0.01"
                    step="0.01"
                    style={{ background: G.surface2, border: `1px solid #34D39944`, borderRadius: 6, padding: "4px 8px", color: G.text, fontSize: 12, outline: "none", width: 110 }}
                  />
                </div>
              </>
            ) : (
              /* ── Freebets individuais (checkboxes) ── */
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {fbsDaCasa.length === 0 && (
                  <div style={{ fontSize: 12, color: G.textMuted }}>
                    Nenhuma freebet disponível para esta casa.
                  </div>
                )}
                {fbsDaCasa.map(f => {
                  const s        = f.saldo ?? f.valor ?? 0;
                  const parcial  = f.saldo != null && f.saldo < f.valor;
                  const saldoStr = parcial ? `${fmt(s)} de ${fmt(f.valor)}` : fmt(s);
                  let label      = `Freebet ${saldoStr}`;
                  if (f.prazo) {
                    const dp    = new Date(f.prazo + "T12:00:00").toLocaleDateString("pt-BR");
                    const vence = f.vencimentoHora ? `${dp} às ${f.vencimentoHora}` : dp;
                    label       = `Freebet ${saldoStr} (vence ${vence})`;
                  }
                  const checked = freebetIds.includes(f.id);
                  return (
                    <label key={f.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: checked ? G.green : G.textDim }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={ev => setFreebetIds(prev =>
                          ev.target.checked ? [...prev, f.id] : prev.filter(id => id !== f.id)
                        )}
                        style={{ accentColor: G.green, width: 13, height: 13 }}
                      />
                      {label}
                    </label>
                  );
                })}
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, marginTop: fbsDaCasa.length > 0 ? 2 : 0, color: usarFreeNaoCadastrada ? G.yellow : G.textDim }}>
                  <input
                    type="checkbox"
                    checked={usarFreeNaoCadastrada}
                    onChange={ev => setUsarFreeNaoCadastrada(ev.target.checked)}
                    style={{ accentColor: G.yellow, width: 13, height: 13 }}
                  />
                  Freebet não cadastrada
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>Registrar Bingo</Btn>
      </div>
    </Modal>
  );
}
