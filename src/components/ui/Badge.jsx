import { G } from "../../constants/colors";

const CORES = {
  green:  { bg: "#00e67622", color: G.green,   border: "#00e67644" },
  red:    { bg: "#ff444422", color: G.red,     border: "#ff444444" },
  yellow: { bg: "#ffd60022", color: G.yellow,  border: "#ffd60044" },
  blue:   { bg: "#00d4ff22", color: G.accent,  border: "#00d4ff44" },
  gray:   { bg: "#7a8aaa22", color: G.textDim, border: "#7a8aaa44" },
  purple: { bg: "#aa66ff22", color: "#aa66ff", border: "#aa66ff44" },
};

export function Badge({ cor, children }) {
  const c = CORES[cor] || CORES.gray;
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      {children}
    </span>
  );
}
