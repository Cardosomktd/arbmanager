import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

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

  const titulo = subTipo === "bonus" ? "🎰 Novo Bônus" : "🎁 Nova Freebet";

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
          <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3 }}>
            {[{ value: "freebet", label: "🎁 Freebet" }, { value: "bonus", label: "🎰 Bônus" }].map(t => (
              <button key={t.value} onClick={() => setSubTipo(t.value)} style={{
                flex: 1, padding: "6px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                background: subTipo === t.value ? G.surface : "transparent",
                color: subTipo === t.value ? G.text : G.textDim,
                fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <Input label="Casa" value={casaId} onChange={setCasaId} options={casas.filter(c => c.ativa).map(c => ({ value: c.id, label: c.nome }))} required />
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
