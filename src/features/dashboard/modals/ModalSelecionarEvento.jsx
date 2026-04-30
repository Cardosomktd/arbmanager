import { useState } from "react";
import { G } from "../../../constants/colors";
import { fmtDate } from "../../../utils/format";
import { statusEvento } from "../../../utils/status";
import { Modal } from "../../../components/ui/Modal";
import { Btn } from "../../../components/ui/Btn";

const ST_COR = {
  vazio:      G.textMuted,
  pendente:   G.yellow,
  andamento:  G.accent,
  finalizado: G.green,
};
const ST_LABEL = {
  vazio:      "Vazio",
  pendente:   "Pendente",
  andamento:  "Em andamento",
  finalizado: "Concluído",
};

export function ModalSelecionarEvento({ open, onClose, eventos, onSelecionarEvento, onCriarNovoEvento }) {
  const [busca,        setBusca]        = useState("");
  const [filtroStatus, setFiltroStatus] = useState("pendentes");

  // Separa por status, ordena por data
  const pendentes  = (eventos || []).filter(ev => statusEvento(ev) !== "finalizado");
  const concluidos = (eventos || []).filter(ev => statusEvento(ev) === "finalizado");

  const lista = filtroStatus === "pendentes" ? pendentes : concluidos;

  const filtrados = busca.trim()
    ? lista.filter(ev => ev.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : lista;

  const filtradosOrdenados = [...filtrados].sort((a, b) => new Date(a.data) - new Date(b.data));

  function handleSelecionar(ev) {
    setBusca("");
    onSelecionarEvento(ev);
  }

  function handleCriarNovo() {
    setBusca("");
    onCriarNovoEvento();
  }

  function handleClose() {
    setBusca("");
    onClose();
  }

  function mudarFiltro(id) {
    setFiltroStatus(id);
    setBusca("");
  }

  const msgVazia = busca.trim()
    ? "Nenhum evento encontrado."
    : filtroStatus === "pendentes"
      ? "Nenhum evento pendente cadastrado."
      : "Nenhum evento concluído.";

  return (
    <Modal open={open} onClose={handleClose} title="Selecionar Evento" width={460}>

      {/* Toggle Pendentes / Concluídos */}
      <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3, marginBottom: 12 }}>
        {[{ id: "pendentes", label: "Pendentes" }, { id: "concluidos", label: "Concluídos" }].map(f => (
          <button key={f.id} onClick={() => mudarFiltro(f.id)} style={{
            flex: 1, padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
            background: filtroStatus === f.id ? G.accent : "transparent",
            color:      filtroStatus === f.id ? "#fff"    : G.textDim,
            fontSize: 13, fontWeight: filtroStatus === f.id ? 700 : 500,
            boxShadow: filtroStatus === f.id ? `0 2px 8px ${G.accent}55` : "none",
            transition: "all 0.15s",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Campo de busca */}
      <input
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar evento..."
        autoFocus
        style={{
          width: "100%", boxSizing: "border-box",
          background: G.surface2, border: `1px solid ${G.border}`,
          borderRadius: 6, padding: "8px 12px",
          color: G.text, fontSize: 13, outline: "none",
          marginBottom: 12,
        }}
      />

      {/* Lista de eventos */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 6,
        maxHeight: 320, overflowY: "auto",
        marginBottom: 14,
      }}>
        {filtradosOrdenados.length === 0 ? (
          <div style={{ fontSize: 13, color: G.textMuted, textAlign: "center", padding: "24px 0" }}>
            {msgVazia}
          </div>
        ) : filtradosOrdenados.map(ev => {
          const st  = statusEvento(ev);
          const cor = ST_COR[st]   ?? G.textMuted;
          const lbl = ST_LABEL[st] ?? st;
          return (
            <div key={ev.id} onClick={() => handleSelecionar(ev)} style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: G.surface2, border: `1px solid ${G.border}`,
              borderRadius: 8, padding: "10px 14px", cursor: "pointer",
              transition: "border-color 0.15s",
            }}
              onMouseEnter={e => e.currentTarget.style.borderColor = G.accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = G.border}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: G.text }}>{ev.nome}</div>
                <div style={{ fontSize: 11, color: G.textDim, marginTop: 2 }}>{fmtDate(ev.data)}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: cor, background: `${cor}22`,
                borderRadius: 4, padding: "2px 8px",
                whiteSpace: "nowrap",
              }}>
                {lbl}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rodapé */}
      <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Btn variant="ghost" onClick={handleClose}>Cancelar</Btn>
        <Btn onClick={handleCriarNovo}>+ Criar novo evento</Btn>
      </div>

    </Modal>
  );
}
