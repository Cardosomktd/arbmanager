import { useState, useEffect, useRef } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";
import { useFixtureSearch } from "../../../hooks/useFixtureSearch";
import { hojeISODateLocal } from "../../../utils/format";

// ── Feature flag — mudar para true quando a API estiver funcional ──
const ENABLE_FIXTURE_SEARCH = false;

// ── Formatação de data para exibição ──────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export function ModalEvento({ open, onClose, onSalvar, editEvento, eventosList = [] }) {
  const [mandante,    setMandante]    = useState("");
  const [visitante,   setVisitante]   = useState("");
  const [dataStr,     setDataStr]     = useState("");
  const [hora,        setHora]        = useState("");
  const [erro,        setErro]        = useState("");
  const [avisoExiste, setAvisoExiste] = useState(false);

  const { query, setQuery, fixtures, status, reset: resetSearch } = useFixtureSearch();
  const [showList, setShowList] = useState(false);
  const searchRef = useRef(null);

  // Abre a lista quando há resultados
  useEffect(() => {
    if (status === "done" || status === "searching") setShowList(true);
    if (status === "idle") setShowList(false);
  }, [status]);

  // Fecha lista ao clicar fora
  useEffect(() => {
    function onClickOut(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowList(false);
      }
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, []);

  // Reset completo ao abrir/fechar modal
  useEffect(() => {
    if (editEvento) {
      setMandante(editEvento.mandante || "");
      setVisitante(editEvento.visitante || "");
      const dt = editEvento.data || "";
      if (dt.includes("T")) {
        setDataStr(dt.split("T")[0]);
        setHora(dt.split("T")[1].slice(0, 5));
      } else {
        setDataStr(dt);
        setHora("");
      }
    } else {
      setMandante(""); setVisitante(""); setDataStr(hojeISODateLocal()); setHora("");
    }
    setErro("");
    setAvisoExiste(false);
    resetSearch();
  }, [open, editEvento]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Preenche campos ao selecionar um jogo
  function selecionarJogo(jogo) {
    setMandante(jogo.home);
    setVisitante(jogo.away);
    setDataStr(jogo.date);
    setHora(jogo.time || "");
    setErro("");
    setAvisoExiste(false);
    resetSearch();
    setShowList(false);
  }

  function salvar(forcar = false) {
    if (!mandante.trim())  { setErro("Informe o time mandante."); return; }
    if (!visitante.trim()) { setErro("Informe o time visitante."); return; }
    if (!dataStr)          { setErro("Informe a data do evento."); return; }

    if (!forcar && !editEvento) {
      const mand = mandante.trim().toLowerCase();
      const vis  = visitante.trim().toLowerCase();
      const duplicado = eventosList.some(ev =>
        (ev.data || "").startsWith(dataStr) &&
        (ev.mandante  || "").toLowerCase() === mand &&
        (ev.visitante || "").toLowerCase() === vis
      );
      if (duplicado) { setAvisoExiste(true); return; }
    }

    const dataFinal = hora ? `${dataStr}T${hora}` : dataStr;
    const nome = `${mandante.trim()} x ${visitante.trim()}`;
    onSalvar({
      id: editEvento?.id || uid(),
      nome,
      mandante:  mandante.trim(),
      visitante: visitante.trim(),
      data:      dataFinal,
      operacoes: editEvento?.operacoes || [],
      criadoEm:  editEvento?.criadoEm  || new Date().toISOString(),
    });
    onClose();
  }

  const nomePreview = mandante.trim() && visitante.trim()
    ? `${mandante.trim()} x ${visitante.trim()}` : "";

  return (
    <Modal open={open} onClose={onClose} title={editEvento ? "Editar Evento" : "Novo Evento"} width={460}>

      {/* ── Busca inteligente (só em criação) ── */}
      {/* Para reativar: mudar ENABLE_FIXTURE_SEARCH para true no topo do arquivo */}
      {ENABLE_FIXTURE_SEARCH && !editEvento && (
        <div ref={searchRef} style={{ marginBottom: 20, position: "relative" }}>
          <label style={labelSt}>
            🔍 Buscar jogo
          </label>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => (status === "done") && setShowList(true)}
              placeholder="Digite o nome do time..."
              style={{
                ...inputSt(),
                paddingRight: query ? 32 : 12,
              }}
            />
            {/* Botão limpar */}
            {query && (
              <button
                onClick={resetSearch}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", color: G.textMuted,
                  fontSize: 14, cursor: "pointer", lineHeight: 1, padding: 2,
                }}
              >✕</button>
            )}
          </div>

          {/* ── Lista de resultados ── */}
          {showList && (
            <div style={{
              position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
              background: G.surface2, border: `1px solid ${G.border}`,
              borderTop: "none", borderRadius: "0 0 8px 8px",
              maxHeight: 240, overflowY: "auto",
              boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            }}>

              {status === "searching" && (
                <div style={msgSt()}> Buscando jogos...</div>
              )}

              {status === "done" && fixtures.length === 0 && (
                <div style={msgSt()}>Nenhum jogo encontrado. Preencha manualmente.</div>
              )}

              {status === "error" && (
                <div style={{ ...msgSt(), color: G.red }}>Não foi possível buscar jogos agora.</div>
              )}

              {status === "done" && fixtures.map((jogo, i) => (
                <button
                  key={jogo.id}
                  onClick={() => selecionarJogo(jogo)}
                  style={{
                    display: "block", width: "100%", textAlign: "left",
                    background: "transparent", border: "none",
                    borderTop: i > 0 ? `1px solid ${G.border}` : "none",
                    padding: "10px 14px", cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = G.surface3}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: G.text }}>
                      {jogo.home} <span style={{ color: G.textMuted, fontWeight: 400 }}>×</span> {jogo.away}
                    </span>
                    <span style={{ fontSize: 11, color: G.textDim, whiteSpace: "nowrap", flexShrink: 0 }}>
                      {fmtDate(jogo.date)}{jogo.time ? ` · ${jogo.time}` : ""}
                    </span>
                  </div>
                  {jogo.league && (
                    <div style={{ fontSize: 11, color: G.textMuted, marginTop: 2 }}>{jogo.league}</div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Separador ── */}
      {ENABLE_FIXTURE_SEARCH && !editEvento && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: G.border }} />
          <span style={{ fontSize: 11, color: G.textMuted, whiteSpace: "nowrap" }}>
            ou preencha manualmente
          </span>
          <div style={{ flex: 1, height: 1, background: G.border }} />
        </div>
      )}

      {/* ── Mensagens de erro / aviso ── */}
      {erro && (
        <div style={{ background: "#F8717122", border: "1px solid #F8717144", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 12, fontSize: 13 }}>
          {erro}
        </div>
      )}
      {avisoExiste && (
        <div style={{ background: "#fbbf2411", border: "1px solid #fbbf2444", borderRadius: 6, padding: "10px 12px", marginBottom: 12, fontSize: 13, color: "#fbbf24" }}>
          ⚠️ Já existe um evento com esse confronto nessa data. Confira antes de criar.
        </div>
      )}

      {/* ── Campos manuais (sempre visíveis e editáveis) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "end" }}>
          <Input label="Time Mandante" value={mandante} onChange={setMandante} placeholder="Ex: Flamengo" required />
          <div style={{ fontSize: 13, color: G.textDim, fontWeight: 700, paddingBottom: 10, textAlign: "center" }}>x</div>
          <Input label="Time Visitante" value={visitante} onChange={setVisitante} placeholder="Ex: Corinthians" required />
        </div>

        {nomePreview && (
          <div style={{ fontSize: 12, color: G.textDim, textAlign: "center", background: G.surface2, borderRadius: 6, padding: "6px 12px" }}>
            🏟️ <span style={{ color: G.text }}>{nomePreview}</span>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Input label="Data *" value={dataStr} onChange={setDataStr} type="date" required />
          <div>
            <label style={labelSt}>
              Horário <span style={{ color: G.textMuted, fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="time" value={hora} onChange={e => setHora(e.target.value)}
              style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 7, padding: "9px 12px", color: hora ? G.text : G.textMuted, fontSize: 13, outline: "none", width: "100%", boxSizing: "border-box" }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        {avisoExiste
          ? <Btn onClick={() => salvar(true)}>Criar mesmo assim</Btn>
          : <Btn onClick={() => salvar()}>{editEvento ? "Salvar" : "Criar evento"}</Btn>
        }
      </div>
    </Modal>
  );
}

// ── Estilos ──────────────────────────────────────────────────

const labelSt = {
  display: "block", fontSize: 11, color: G.textDim,
  fontWeight: 600, letterSpacing: 0.5,
  textTransform: "uppercase", marginBottom: 6,
};

function inputSt() {
  return {
    display: "block", width: "100%", boxSizing: "border-box",
    background: G.surface2, border: `1px solid ${G.border}`,
    borderRadius: 7, padding: "9px 12px",
    color: G.text, fontSize: 13, outline: "none",
  };
}

function msgSt() {
  return {
    padding: "12px 14px", fontSize: 13, color: G.textDim,
    textAlign: "center",
  };
}
