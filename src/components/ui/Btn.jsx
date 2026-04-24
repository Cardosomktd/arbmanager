import { G, GRAD } from "../../constants/colors";

const SIZES = {
  sm: { padding: "5px 12px",  fontSize: 12 },
  md: { padding: "8px 18px",  fontSize: 13 },
  lg: { padding: "11px 24px", fontSize: 14 },
};

const VARIANTS = {
  primary:   {
    background: GRAD, color: "#fff", border: "none",
    fontWeight: 700,
  },
  secondary: {
    background: G.surface2, color: G.text,
    border: `1px solid ${G.border}`,
  },
  danger:    {
    background: "#F871711A", color: G.red,
    border: "1px solid #F8717140",
  },
  ghost:     {
    background: "transparent", color: G.textDim,
    border: `1px solid ${G.border}`,
  },
  success:   {
    background: "#34D3991A", color: G.green,
    border: "1px solid #34D39940",
  },
};

export function Btn({ onClick, children, variant = "primary", size = "md", style: sx = {}, disabled }) {
  const base = {
    border: "none", borderRadius: 7, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "opacity 0.15s, box-shadow 0.15s",
    display: "inline-flex", alignItems: "center", gap: 6,
    fontFamily: "'Inter', sans-serif",
  };
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={variant === "primary" ? "btn-primary-glow" : ""}
      style={{ ...base, ...SIZES[size], ...v, ...sx }}
    >
      {children}
    </button>
  );
}
