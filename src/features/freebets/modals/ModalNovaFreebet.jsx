import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

export function ModalNovaFreebet({ open, onClose, onSalvar, casas }) {
  const [casaId, setCasaId] = useState("");
  const [valor, setValor] = useState("");
  const [prazo, setPrazo] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) { setCasaId(""); setValor(""); setPrazo(""); setObs(""); setErro(""); }
  }, [open]);

  function salvar() {
    if (!casaId) { setErro("Selecione a casa."); return; }
    if (!valor || parseFloat(valor) <= 0) { setErro("Informe um valor válido."); return; }
    setErro("");
    onSalvar({
      id: uid(), casaId, valor: parseFloat(valor),
      prazo, obs: obs.trim(), tipo: "manual", usada: false,
      criadoEm: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="🎁 Nova Freebet" width={400}>
      {erro && (
        <div style={{ background: "#ff444422", border: "1px solid #ff444444", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Casa" value={casaId} onChange={setCasaId} options={casas.filter(c => c.ativa).map(c => ({ value: c.id, label: c.nome }))} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
          <Input label="Prazo de vencimento" value={prazo} onChange={setPrazo} type="date" />
        </div>
        <Input label="Observação (opcional)" value={obs} onChange={setObs} placeholder="Ex: Bônus de aniversário" />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>Registrar freebet</Btn>
      </div>
    </Modal>
  );
}
