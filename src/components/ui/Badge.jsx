import { G } from "../../constants/colors";

const CORES = {
  green:  { bg: "#34D3991A", color: G.green,    border: "#34D39944" },
  red:    { bg: "#F871711A", color: G.red,       border: "#F8717144" },
  yellow: { bg: "#FBBF241A", color: G.yellow,    border: "#FBBF2444" },
  blue:   { bg: "#22D3EE1A", color: G.accent,    border: "#22D3EE44" },
  gray:   { bg: "rgba(255,255,255,0.05)", color: G.textDim, border: "rgba(255,255,255,0.1)" },
  purple: { bg: "#8B5CF61A", color: G.purple,    border: "#8B5CF644" },
};

export function Badge({ cor, children }) {
  const c = CORES[cor] || CORES.gray;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}
