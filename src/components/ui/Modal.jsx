import { G } from "../../constants/colors";

export function Modal({ open, onClose, title, children, width = 560 }) {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.7)",
      backdropFilter: "blur(4px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16,
    }}>
      <div
        style={{
          background: G.surface,
          border: `1px solid ${G.border}`,
          borderRadius: 14,
          width: "100%", maxWidth: width,
          maxHeight: "90vh", overflowY: "auto",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 22px",
          borderBottom: `1px solid ${G.border}`,
        }}>
          <span style={{
            fontFamily: "'Barlow Condensed', 'Inter', sans-serif",
            fontSize: 17, fontWeight: 700, letterSpacing: 1,
            textTransform: "uppercase", color: G.text,
          }}>
            {title}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              color: G.textMuted, fontSize: 18, cursor: "pointer",
              padding: "2px 6px", borderRadius: 5,
              transition: "color 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.color = G.text}
            onMouseLeave={e => e.currentTarget.style.color = G.textMuted}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}
