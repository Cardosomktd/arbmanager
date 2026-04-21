import { G } from "../../constants/colors";

const fieldStyle = {
  background: G.surface2, border: `1px solid ${G.border}`,
  borderRadius: 6, padding: "8px 12px", color: G.text,
  fontSize: 13, width: "100%", outline: "none",
};

export function Input({ label, value, onChange, type = "text", placeholder, style: sx = {}, options, required }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...sx }}>
      {label && (
        <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
          {label}{required && <span style={{ color: G.red }}> *</span>}
        </label>
      )}
      {options ? (
        <select value={value} onChange={e => onChange(e.target.value)} style={{ ...fieldStyle, appearance: "none" }}>
          <option value="">— selecionar —</option>
          {options.map(o => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
      ) : (
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={fieldStyle}
        />
      )}
    </div>
  );
}
