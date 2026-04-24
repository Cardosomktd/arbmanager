import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

const TIPO_OPTS = [
  { value: "giros",    label: "🎡 Giros Grátis"   },
  { value: "bonus",    label: "🎰 Bônus"           },
  { value: "cashback", label: "💰 Cashback"        },
];

export function ModalCassino({ open, onClose, onSalvar, casas }) {
  const [data,          setData]          = useState("");
  const [casa,          setCasa]          = useState("");
  const [nome,          setNome]          = useState("");
  const [tipoBeneficio, setTipoBeneficio] = useState("giros");
  const [valorApostado, setValorApostado] = useState("");
  const [lucro,         setLucro]         = useState("");
  const [erro,          setErro]          = useState("");

  useEffect(() => {
    if (!open) {
      setData(""); setCasa(""); setNome(""); setTipoBeneficio("giros");
      setValorApostado(""); setLucro(""); setErro("");
    }
  }, [open]);

  function salvar() {
    if (!data)        { setErro("Informe a data."); return; }
    if (!casa)        { setErro("Selecione a casa."); return; }
    if (lucro === "") { setErro("Informe o lucro ou prejuízo."); return; }
    setErro("");

    const tipoLabel = TIPO_OPTS.find(t => t.value === tipoBeneficio)?.label ?? tipoBeneficio;
    onSalvar({
      id:           uid(),
      tipo:         "cassino",
      nome:         nome.trim() || `Cassino — ${tipoLabel}`,
      data,
      casa,
      tipoBeneficio,
      valorApostado: parseFloat(valorApostado) || 0,
      lucro:         parseFloat(lucro) || 0,
      criadoEm:     new Date().toISOString(),
    });
    onClose();
  }

  const casasAtivas = casas.filter(c => c.ativa);

  return (
    <Modal open={open} onClose={onClose} title="🎲 Cassino" width={460}>
      {erro && (
        <div style={{ background: "#F8717122", border: "1px solid #F8717144", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}

      <div style={{ background: "#34D3990d", border: "1px solid #34D39933", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: G.green }}>
        🎲 Registre o resultado de giros, bônus ou cashback de cassino.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Data" value={data} onChange={setData} type="date" required />

        <Input
          label="Casa"
          value={casa}
          onChange={setCasa}
          options={casasAtivas.map(c => ({ value: c.id, label: c.nome }))}
          required
        />

        <Input
          label="Descrição (opcional)"
          value={nome}
          onChange={setNome}
          placeholder="Ex: Fortune Tiger, Aviator…"
        />

        {/* Tipo de benefício */}
        <div>
          <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
            Tipo de benefício
          </label>
          <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3 }}>
            {TIPO_OPTS.map(t => (
              <button key={t.value} onClick={() => setTipoBeneficio(t.value)} style={{
                flex: 1, padding: "6px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                background: tipoBeneficio === t.value ? "#34D39922" : "transparent",
                color: tipoBeneficio === t.value ? G.green : G.textDim,
                fontSize: 12, fontWeight: 600,
                transition: "all 0.15s",
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Valor apostado (R$)" value={valorApostado} onChange={setValorApostado} type="number" placeholder="0,00" />
          <Input label="Lucro / Prejuízo (R$)" value={lucro} onChange={setLucro} placeholder="Ex: 45 ou -20" required />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>Registrar</Btn>
      </div>
    </Modal>
  );
}
