import { useState, useEffect, useRef } from "react";
import { G } from "../../constants/colors";

/**
 * Seletor de casa com busca por digitação.
 * Filtra a lista conforme o usuário digita e pré-seleciona o primeiro resultado.
 * Compatível com teclado: ↑↓ navega, Enter/Tab confirma, Esc fecha.
 *
 * Quando uma casa tem titular cadastrado, exibe-o junto ao nome:
 *   - No dropdown: nome em destaque + titular menor e apagado
 *   - No campo selecionado: "Nome · Titular"
 *   - Na busca: pesquisa em nome E titular
 */
export function CasaSelect({ casas, value, onChange, required }) {
  const [busca,          setBusca]          = useState("");
  const [aberto,         setAberto]         = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const wrapRef  = useRef(null);
  const inputRef = useRef(null);
  const listRef  = useRef(null);

  const casaSelecionada = value ? casas.find(c => c.id === value) : null;

  // Texto exibido no input quando fechado: "Nome · Titular" ou só "Nome"
  const labelSelecionado = casaSelecionada
    ? casaSelecionada.titular
      ? `${casaSelecionada.nome} · ${casaSelecionada.titular}`
      : casaSelecionada.nome
    : "";

  // Filtra por nome E titular
  const filtradas = busca.trim()
    ? casas.filter(c => {
        const q = busca.toLowerCase();
        return (
          c.nome.toLowerCase().includes(q) ||
          (c.titular && c.titular.toLowerCase().includes(q))
        );
      })
    : casas;

  // Reset highlight ao primeiro item sempre que a lista muda
  useEffect(() => { setHighlightedIdx(0); }, [filtradas.length, busca]);

  // Scroll do item destacado para a área visível
  useEffect(() => {
    if (!listRef.current || !aberto) return;
    const item = listRef.current.children[highlightedIdx];
    if (item) item.scrollIntoView({ block: "nearest" });
  }, [highlightedIdx, aberto]);

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setAberto(false);
        setBusca("");
      }
    }
    if (aberto) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  function selecionar(id) {
    onChange(id);
    setAberto(false);
    setBusca("");
  }

  function handleKeyDown(e) {
    if (!aberto) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setAberto(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIdx(i => Math.min(i + 1, filtradas.length - 1));
        break;

      case "ArrowUp":
        e.preventDefault();
        setHighlightedIdx(i => Math.max(i - 1, 0));
        break;

      case "Enter":
        e.preventDefault();
        if (filtradas[highlightedIdx]) selecionar(filtradas[highlightedIdx].id);
        break;

      case "Tab":
        if (filtradas[highlightedIdx]) selecionar(filtradas[highlightedIdx].id);
        break;

      case "Escape":
        e.preventDefault();
        setAberto(false);
        setBusca("");
        inputRef.current?.blur();
        break;

      default:
        break;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>
        Casa {required && <span style={{ color: G.red }}>*</span>}
      </label>
      <div ref={wrapRef} style={{ position: "relative" }}>
        <input
          ref={inputRef}
          value={aberto ? busca : labelSelecionado}
          placeholder={value ? labelSelecionado : "— selecionar —"}
          onFocus={() => { setAberto(true); setBusca(""); }}
          onChange={e => setBusca(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%", boxSizing: "border-box",
            background: G.surface2, border: `1px solid ${aberto ? G.accent : G.border}`,
            borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none",
            cursor: "text", transition: "border-color 0.15s",
          }}
        />
        {aberto && (
          <div ref={listRef} style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 999,
            background: G.surface, border: `1px solid ${G.border}`, borderRadius: 8,
            boxShadow: "0 8px 24px #00000055", maxHeight: 220, overflowY: "auto",
          }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: "10px 12px", fontSize: 12, color: G.textMuted }}>Nenhuma casa encontrada.</div>
            ) : filtradas.map((c, idx) => {
              const isHighlighted = idx === highlightedIdx;
              const isSelected    = c.id === value;
              return (
                <div
                  key={c.id}
                  onMouseDown={() => selecionar(c.id)}
                  onMouseEnter={() => setHighlightedIdx(idx)}
                  style={{
                    padding: "8px 12px", cursor: "pointer",
                    background: isHighlighted ? G.surface3 : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <div style={{
                    fontSize: 13,
                    color: isSelected ? G.accent : G.text,
                    fontWeight: isSelected ? 700 : 400,
                  }}>
                    {c.nome}
                  </div>
                  {c.titular && (
                    <div style={{ fontSize: 11, color: G.textMuted, marginTop: 1 }}>
                      {c.titular}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
