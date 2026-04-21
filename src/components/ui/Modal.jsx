import { G } from "../../constants/colors";

export function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000a", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px #000a" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${G.border}` }}>
          <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
            {title}
          </span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: G.textDim, fontSize: 20, cursor: "pointer" }}>
            ✕
          </button>
        </div>
        <div style={{ padding: 20 }}>{children}</div>
      </div>
    </div>
  );
}
