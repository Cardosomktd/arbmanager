import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { calcRetorno } from "../../../utils/calculos";
import { fmt, fmtOdd, getCasaNome } from "../../../utils/format";
import { Modal } from "../../../components/ui/Modal";
import { Btn } from "../../../components/ui/Btn";

export function ModalConcluirOp({ open, onClose, op, casas, onConcluir }) {
  const [greens, setGreens] = useState([]);

  const isEditando = (op?.entradas || []).some(e => e.situacao !== "pendente");

  useEffect(() => {
    if (open) setGreens((op?.entradas || []).filter(e => e.situacao === "green").map(e => e.id));
  }, [open]);

  function toggleGreen(id) {
    setGreens(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  function finalizar() {
    const entradasFinal = (op?.entradas || []).map(e => ({
      ...e,
      situacao: greens.includes(e.id) ? "green" : "red",
    }));
    onConcluir(entradasFinal);
    onClose();
  }

  if (!op) return null;

  return (
    <Modal open={open} onClose={onClose} title={isEditando ? "Editar Resultado" : "Concluir Operação"} width={480}>
      <div style={{ fontSize: 13, color: G.textDim, marginBottom: 16 }}>
        Selecione qual(is) entrada(s) deram{" "}
        <span style={{ color: G.green, fontWeight: 700 }}>GREEN</span>. As demais serão marcadas como{" "}
        <span style={{ color: G.red, fontWeight: 700 }}>RED</span>.
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
        {(op.entradas || []).map(e => {
          const sel = greens.includes(e.id);
          const retorno = calcRetorno(e);
          return (
            <div key={e.id} onClick={() => toggleGreen(e.id)}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: sel ? "#00e67611" : G.surface2, border: `1px solid ${sel ? G.green : G.border}`, borderRadius: 8, padding: "10px 14px", cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${sel ? G.green : G.border}`, background: sel ? G.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {sel && <span style={{ color: "#000", fontSize: 11, fontWeight: 900 }}>✓</span>}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {getCasaNome(casas, e.casa)} · {e.entradaDisplay || e.entrada}
                  </div>
                  <div style={{ fontSize: 11, color: G.textDim }}>
                    @{fmtOdd(e.odd)} · {fmt(e.valor)}{e.tipo !== "normal" ? ` · ${e.tipo === "freebet" ? "FB" : "BNS"}` : ""}
                  </div>
                  {e.multipla && e.multiplaDesc && (
                    <div style={{ fontSize: 11, color: G.yellow, marginTop: 3 }}>
                      Múltipla: {e.multiplaDesc}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, color: G.textDim }}>retorno</div>
                <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 16, fontWeight: 700, color: G.green }}>{fmt(retorno)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        <Btn variant="success" onClick={finalizar}>{isEditando ? "✓ Salvar resultado" : "✓ Finalizar operação"}</Btn>
      </div>
    </Modal>
  );
}
