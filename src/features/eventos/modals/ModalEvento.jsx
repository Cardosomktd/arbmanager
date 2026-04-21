import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";

export function ModalEvento({ open, onClose, onSalvar, editEvento }) {
  const [mandante, setMandante] = useState("");
  const [visitante, setVisitante] = useState("");
  const [dataStr,   setDataStr]   = useState(""); // obrigatório
  const [hora,      setHora]      = useState(""); // opcional
  const [erro,      setErro]      = useState("");

  useEffect(() => {
    if (editEvento) {
      setMandante(editEvento.mandante || "");
      setVisitante(editEvento.visitante || "");
      const dt = editEvento.data || "";
      if (dt.includes("T")) {
        setDataStr(dt.split("T")[0]);
        setHora(dt.split("T")[1].slice(0, 5));
      } else {
        setDataStr(dt);
        setHora("");
      }
    } else {
      setMandante(""); setVisitante(""); setDataStr(""); setHora("");
    }
    setErro("");
  }, [open, editEvento]);

  function salvar() {
    if (!mandante.trim())  { setErro("Informe o time mandante."); return; }
    if (!visitante.trim()) { setErro("Informe o time visitante."); return; }
    if (!dataStr)          { setErro("Informe a data do evento."); return; }
    const dataFinal = hora ? `${dataStr}T${hora}` : dataStr;
    const nome = `${mandante.trim()} x ${visitante.trim()}`;
    onSalvar({
      id: editEvento?.id || uid(),
      nome,
      mandante: mandante.trim(),
      visitante: visitante.trim(),
      data: dataFinal,
      operacoes: editEvento?.operacoes || [],
      criadoEm: editEvento?.criadoEm || new Date().toISOString(),
    });
    onClose();
  }

  const nomePreview = mandante.trim() && visitante.trim()
    ? `${mandante.trim()} x ${visitante.trim()}` : "";

  return (
    <Modal open={open} onClose={onClose} title={editEvento ? "Editar Evento" : "Novo Evento"} width={460}>
      {erro && (
        <div style={{ background: "#ff444422", border: "1px solid #ff444444", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
          <Input label="Time Mandante" value={mandante} onChange={setMandante} placeholder="Ex: Flamengo" required />
          <div style={{ fontSize: 13, color: G.textDim, fontWeight: 700, paddingBottom: 10, textAlign: "center" }}>x</div>
          <Input label="Time Visitante" value={visitante} onChange={setVisitante} placeholder="Ex: Corinthians" required />
        </div>

        {nomePreview && (
          <div style={{ fontSize: 12, color: G.textDim, textAlign: "center", background: G.surface2, borderRadius: 6, padding: "6px 12px" }}>
            🏟️ <span style={{ color: G.text }}>{nomePreview}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Data *" value={dataStr} onChange={setDataStr} type="date" required />
          <div>
            <label style={{ display: "block", fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 }}>
              Horário <span style={{ color: G.textMuted, fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="time" value={hora} onChange={e => setHora(e.target.value)}
              style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "9px 12px", color: hora ? G.text : G.textMuted, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={salvar}>{editEvento ? "Salvar" : "Criar evento"}</Btn>
      </div>
    </Modal>
  );
}
