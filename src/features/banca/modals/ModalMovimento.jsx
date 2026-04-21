import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

export function ModalMovimento({ open, onClose, onSalvar, casas }) {
  const [casaId, setCasaId] = useState("");
  const [tipo, setTipo] = useState("deposito");
  const [valor, setValor] = useState("");
  const [obs, setObs] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) { setCasaId(""); setTipo("deposito"); setValor(""); setObs(""); setErro(""); }
  }, [open]);

  function salvar() {
    if (!casaId) { setErro("Selecione a casa."); return; }
    if (!valor || parseFloat(valor) <= 0) { setErro("Informe um valor válido."); return; }
    onSalvar({ id: uid(), casaId, tipo, valor: parseFloat(valor), obs: obs.trim(), data: new Date().toISOString() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova Movimentação" width={400}>
      {erro && (
        <div style={{ background: "#ff444422", border: "1px solid #ff444444", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Casa" value={casaId} onChange={setCasaId} options={casas.filter(c => c.ativa).map(c => ({ value: c.id, label: c.nome }))} required />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Tipo</label>
            <div style={{ display: "flex", gap: 6 }}>
              {["deposito", "saque"].map(t => (
                <button key={t} onClick={() => setTipo(t)} style={{
                  flex: 1, padding: "8px", borderRadius: 6,
                  border: `1px solid ${tipo === t ? (t === "deposito" ? G.green : G.red) : G.border}`,
                  background: tipo === t ? (t === "deposito" ? "#00e67622" : "#ff444422") : "transparent",
                  color: tipo === t ? (t === "deposito" ? G.green : G.red) : G.textDim,
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                }}>
                  {t === "deposito" ? "⬆️ Depósito" : "⬇️ Saque"}
                </button>
              ))}
            </div>
          </div>
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
        </div>
        <Input label="Observação (opcional)" value={obs} onChange={setObs} placeholder="Ex: Bônus de boas-vindas" />
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant={tipo === "deposito" ? "success" : "danger"} onClick={salvar}>
          {tipo === "deposito" ? "Registrar depósito" : "Registrar saque"}
        </Btn>
      </div>
    </Modal>
  );
}
