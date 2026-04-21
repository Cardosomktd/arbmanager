import { G } from "../../constants/colors";

const SIZES = {
  sm: { padding: "5px 12px",  fontSize: 12 },
  md: { padding: "8px 16px",  fontSize: 13 },
  lg: { padding: "11px 22px", fontSize: 14 },
};

const VARIANTS = {
  primary:   { background: G.accent,      color: "#000" },
  secondary: { background: G.surface2,    color: G.text,    border: `1px solid ${G.border}` },
  danger:    { background: "#ff444422",   color: G.red,     border: "1px solid #ff444444" },
  ghost:     { background: "transparent", color: G.textDim, border: `1px solid ${G.border}` },
  success:   { background: "#00e67622",   color: G.green,   border: "1px solid #00e67644" },
};

export function Btn({ onClick, children, variant = "primary", size = "md", style: sx = {}, disabled }) {
  const base = {
    border: "none", borderRadius: 6, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "all 0.15s",
    display: "inline-flex", alignItems: "center", gap: 6,
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...SIZES[size], ...VARIANTS[variant], ...sx }}>
      {children}
    </button>
  );
}
