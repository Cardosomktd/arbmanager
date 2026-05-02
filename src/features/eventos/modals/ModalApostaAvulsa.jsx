import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";
import { CasaSelect } from "../../../components/ui/CasaSelect";
import iconBingo from "../../../assets/icons/Bingo.svg";
import { hojeISODateLocal } from "../../../utils/format";

export function ModalApostaAvulsa({ open, onClose, onSalvar, casas }) {
  const [data,      setData]      = useState(hojeISODateLocal);
  const [casa,      setCasa]      = useState("");
  const [descricao, setDescricao] = useState("");
  const [odd,       setOdd]       = useState("");
  const [valor,     setValor]     = useState("");
  const [isFb,      setIsFb]      = useState(false);   // checkbox "Freebet"
  const [fbTipo,    setFbTipo]    = useState("freebet"); // "freebet" | "bonus"
  const [erro,      setErro]      = useState("");

  useEffect(() => {
    if (!open) {
      setData(hojeISODateLocal()); setCasa(""); setDescricao("");
      setOdd(""); setValor(""); setIsFb(false); setFbTipo("freebet"); setErro("");
    }
  }, [open]);

  function salvar() {
    if (!data)          { setErro("Informe a data."); return; }
    if (!casa)          { setErro("Selecione a casa."); return; }
    if (!odd || !valor) { setErro("Informe a odd e o valor."); return; }
    setErro("");

    const desc = descricao.trim();
    onSalvar({
      id:        uid(),
      subtipo:   "bingo",                             // distingue de apostas avulsas legadas
      tipo:      "avulsa",                            // mantém compatibilidade com filtros existentes
      nome:      desc ? `Bingo — ${desc}` : "Bingo",
      data,
      casa,
      odd,
      valor:     parseFloat(valor) || 0,
      tipoValor: isFb ? fbTipo : "dinheiro_real",     // "dinheiro_real" | "freebet" | "bonus"
      situacao:  "pendente",                          // nasce sempre pendente
      criadoEm:  new Date().toISOString(),
    });
    onClose();
  }

  const casasAtivas = casas.filter(c => c.ativa);

  return (
    <Modal open={open} onClose={onClose} title={<span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={iconBingo} alt="" width={22} height={22} style={{ display: "block" }} />BINGO</span>} width={440}>
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

        <CasaSelect casas={casasAtivas} value={casa} onChange={setCasa} required />

        <Input
          label="Descrição (opcional)"
          value={descricao}
          onChange={setDescricao}
          placeholder="Ex: Flamengo vence em qualquer mercado"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Odd" value={odd} onChange={setOdd} placeholder="Ex: 2,50" required inputMode="decimal" />
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
        </div>

        {/* ── Checkbox Freebet + sub-seletor ──────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12, color: isFb ? G.green : G.textDim, userSelect: "none" }}>
            <input
              type="checkbox"
              checked={isFb}
              onChange={e => { setIsFb(e.target.checked); if (!e.target.checked) setFbTipo("freebet"); }}
              style={{ accentColor: G.green, width: 14, height: 14 }}
            />
            <span style={{ fontWeight: 600 }}>Freebet</span>
          </label>

          {isFb && (
            <select
              value={fbTipo}
              onChange={e => setFbTipo(e.target.value)}
              style={{
                background: G.surface2,
                border: `1px solid #34D39944`,
                borderRadius: 6,
                padding: "3px 10px",
                color: G.text,
                fontSize: 12,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="freebet">Freebet</option>
              <option value="bonus">Bônus</option>
            </select>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>Registrar Bingo</Btn>
      </div>
    </Modal>
  );
}
