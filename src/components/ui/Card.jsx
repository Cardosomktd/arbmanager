import { G } from "../../constants/colors";

export function Card({ children, style: sx = {}, className = "", onClick }) {
  return (
    <div
      className={className}
      onClick={onClick}
      style={{
        background: G.surface,
        border: `1px solid ${G.border}`,
        borderRadius: 12,
        padding: 16,
        ...sx,
      }}
    >
      {children}
    </div>
  );
}
