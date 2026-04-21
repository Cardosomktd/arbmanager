import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

export function ModalProtecao({ open, onClose, onSalvar, casas, evento }) {
  const [casa, setCasa] = useState("");
  const [entrada, setEntrada] = useState("");
  const [odd, setOdd] = useState("");
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!open) { setCasa(""); setEntrada(""); setOdd(""); setValor(""); setErro(""); }
  }, [open]);

  function salvar() {
    if (!casa) { setErro("Selecione a casa."); return; }
    if (!entrada) { setErro("Selecione o resultado."); return; }
    if (!odd || !valor) { setErro("Informe a odd e o valor."); return; }
    setErro("");
    onSalvar({ id: uid(), casa, entrada, odd, valor: parseFloat(valor) || 0, situacao: "pendente", tipo: "normal", pa: false, protecao: true, criadoEm: new Date().toISOString() });
    onClose();
  }

  const casasAtivas = casas.filter(c => c.ativa);

  return (
    <Modal open={open} onClose={onClose} title="🛡️ Proteção do Duplo" width={440}>
      {erro && (
        <div style={{ background: "#ff444422", border: "1px solid #ff444444", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}
      <div style={{ background: "#ffd60011", border: "1px solid #ffd60033", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: G.yellow }}>
        Entrada avulsa de proteção — cobre o lucro de todas as operações do evento somadas.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input label="Casa" value={casa} onChange={setCasa} options={casasAtivas.map(c => ({ value: c.id, label: c.nome }))} required />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
            Resultado <span style={{ color: G.red }}>*</span>
          </label>
          <select value={entrada} onChange={e => setEntrada(e.target.value)}
            style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none", appearance: "none" }}>
            <option value="">— selecionar —</option>
            {evento?.mandante && <option value={evento.mandante}>{evento.mandante}</option>}
            <option value="Empate">Empate</option>
            {evento?.visitante && <option value={evento.visitante}>{evento.visitante}</option>}
          </select>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Odd" value={odd} onChange={setOdd} placeholder="Ex: 1,80" required inputMode="decimal" />
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="success" onClick={salvar}>Adicionar proteção</Btn>
      </div>
    </Modal>
  );
}
