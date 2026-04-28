import { useState, useEffect } from "react";
import { G, GRAD } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";
import { CasaSelect } from "../../../components/ui/CasaSelect";
import iconFreebets from "../../../assets/icons/Freebets.svg";

export function ModalNovaFreebet({ open, onClose, onSalvar, casas }) {
  const [subTipo,        setSubTipo]        = useState("freebet"); // "freebet" | "bonus"
  const [casaId,         setCasaId]         = useState("");
  const [valor,          setValor]          = useState("");
  const [prazo,          setPrazo]          = useState("");
  const [vencimentoHora, setVencimentoHora] = useState("");
  const [obs,            setObs]            = useState("");
  const [erro,           setErro]           = useState("");

  useEffect(() => {
    if (!open) {
      setSubTipo("freebet");
      setCasaId(""); setValor(""); setPrazo(""); setVencimentoHora(""); setObs(""); setErro("");
    }
  }, [open]);

  function salvar() {
    if (!casaId) { setErro("Selecione a casa."); return; }
    if (!valor || parseFloat(valor) <= 0) { setErro("Informe um valor válido."); return; }
    setErro("");
    const v = parseFloat(valor);
    onSalvar({
      id: uid(), casaId, valor: v,
      saldo: v,
      prazo,
      vencimentoHora: vencimentoHora.trim() || null,
      obs: obs.trim(),
      tipo: "manual", // salvarFreebet em TelaFreebets decide se vira "acumulada" (Bet365)
      subTipo,
      usada: false,
      criadoEm: new Date().toISOString(),
    });
    onClose();
  }

  const titulo = (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img src={iconFreebets} width={26} height={26} />
      {subTipo === "bonus" ? "NOVO BÔNUS" : "NOVA FREEBET"}
    </span>
  );

  return (
    <Modal open={open} onClose={onClose} title={titulo} width={420}>
      {erro && (
        <div style={{ background: "#F8717122", border: "1px solid #F8717144", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Tipo: Freebet | Bônus */}
        <div>
          <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>Tipo</div>
          <div style={{ display: "flex", gap: 6 }}>
            {[
              { value: "freebet", label: "Freebet" },
              { value: "bonus",   label: "Bônus"   },
            ].map(t => {
              const ativo = subTipo === t.value;
              return (
                <button key={t.value} onClick={() => setSubTipo(t.value)} style={{
                  flex: 1, padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: ativo ? GRAD : G.surface2,
                  color: ativo ? "#fff" : G.textDim,
                  fontSize: 13, fontWeight: 700,
                  boxShadow: ativo ? "0 2px 8px #7C3AED44" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                  transition: "all 0.15s",
                }}>
                  <img src={iconFreebets} width={16} height={16}
                    style={{ opacity: ativo ? 1 : 0.4, filter: ativo ? "brightness(10)" : "none" }}
                  />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <CasaSelect casas={casas.filter(c => c.ativa)} value={casaId} onChange={setCasaId} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
          <Input label="Prazo de vencimento" value={prazo} onChange={setPrazo} type="date" />
        </div>
        {prazo && (
          <Input label="Horário de vencimento (opcional)" value={vencimentoHora} onChange={setVencimentoHora} type="time" placeholder="Ex: 18:00" />
        )}
        <Input label="Observação (opcional)" value={obs} onChange={setObs} placeholder="Ex: Bônus de depósito" />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>Registrar {subTipo === "bonus" ? "bônus" : "freebet"}</Btn>
      </div>
    </Modal>
  );
}
