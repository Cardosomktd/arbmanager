import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

export function ModalApostaAvulsa({ open, onClose, onSalvar, casas }) {
  const [data,      setData]      = useState("");
  const [casa,      setCasa]      = useState("");
  const [descricao, setDescricao] = useState("");
  const [odd,       setOdd]       = useState("");
  const [valor,     setValor]     = useState("");
  const [erro,      setErro]      = useState("");

  useEffect(() => {
    if (!open) {
      setData(""); setCasa(""); setDescricao("");
      setOdd(""); setValor(""); setErro("");
    }
  }, [open]);

  function salvar() {
    if (!data)          { setErro("Informe a data."); return; }
    if (!casa)          { setErro("Selecione a casa."); return; }
    if (!odd || !valor) { setErro("Informe a odd e o valor."); return; }
    setErro("");

    const desc = descricao.trim();
    onSalvar({
      id:       uid(),
      subtipo:  "bingo",                              // distingue de apostas avulsas legadas
      tipo:     "avulsa",                             // mantém compatibilidade com filtros existentes
      nome:     desc ? `Bingo — ${desc}` : "Bingo",
      data,
      casa,
      odd,
      valor:    parseFloat(valor) || 0,
      situacao: "pendente",                           // nasce sempre pendente
      criadoEm: new Date().toISOString(),
    });
    onClose();
  }

  const casasAtivas = casas.filter(c => c.ativa);

  return (
    <Modal open={open} onClose={onClose} title="🎰 Bingo" width={440}>
      {erro && (
        <div style={{ background: "#ff444422", border: "1px solid #ff444444", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}

      <div style={{ background: "#aa66ff0d", border: "1px solid #aa66ff33", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 12, color: "#cc88ff" }}>
        🎲 Registre uma aposta pontual em um único resultado, sem vínculo com evento específico.
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
          value={descricao}
          onChange={setDescricao}
          placeholder="Ex: Flamengo vence em qualquer mercado"
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Odd" value={odd} onChange={setOdd} placeholder="Ex: 2,50" required inputMode="decimal" />
          <Input label="Valor (R$)" value={valor} onChange={setValor} type="number" placeholder="0,00" required />
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>Registrar Bingo</Btn>
      </div>
    </Modal>
  );
}
