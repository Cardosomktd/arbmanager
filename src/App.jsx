import { useState, useEffect } from "react";
import { G } from "./constants/colors";
import wordmarkUrl    from "./assets/EDGEARB.svg";
import iconDashboard    from "./assets/icons/Dashboard.svg";
import iconOperacoes    from "./assets/icons/Operações.svg";
import iconFreebets     from "./assets/icons/Freebets.svg";
import iconBanca        from "./assets/icons/Banca.svg";
import iconCalculadora  from "./assets/icons/Calculadora.svg";
import { supabase } from "./lib/supabase";
import { useAppData } from "./hooks/useAppData";
import { LoginPage } from "./features/auth/LoginPage";
import { TelaDashboard }        from "./features/dashboard/TelaDashboard";
import { TelaEventos }          from "./features/eventos/TelaEventos";
import { TelaFreebets }         from "./features/freebets/TelaFreebets";
import { TelaCasas }            from "./features/banca/TelaCasas";
import { ModalCalculadora }     from "./features/dashboard/modals/ModalCalculadora";
import { ModalSelecionarEvento} from "./features/dashboard/modals/ModalSelecionarEvento";
import { ModalEvento }          from "./features/eventos/modals/ModalEvento";
import { ModalOperacao }        from "./features/eventos/modals/ModalOperacao";

// ── Navegação ─────────────────────────────────────────────────────────────────
// Bottom nav (mobile — 4 abas principais)
const NAV_ICON_SIZE = 22;
const navIcon = (src, alt) => (
  <img src={src} alt={alt} width={NAV_ICON_SIZE} height={NAV_ICON_SIZE} style={{ display: "block", flexShrink: 0 }} />
);

const ABAS = [
  { id: "dashboard", label: "Dashboard", icon: () => navIcon(iconDashboard, "Dashboard") },
  { id: "eventos",   label: "Operações", icon: () => navIcon(iconOperacoes, "Operações") },
  { id: "freebets",  label: "Freebets",  icon: () => navIcon(iconFreebets,  "Freebets")  },
  { id: "banca",     label: "Banca",     icon: () => navIcon(iconBanca,     "Banca")     },
];

// Sidebar (desktop — inclui Calculadora como ação de modal)
const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard",   icon: () => navIcon(iconDashboard, "Dashboard") },
  { id: "eventos",   label: "Operações",   icon: () => navIcon(iconOperacoes, "Operações") },
  { id: "freebets",  label: "Freebets",    icon: () => navIcon(iconFreebets,  "Freebets")  },
  { id: "banca",     label: "Banca",       icon: () => navIcon(iconBanca,     "Banca")     },
  { id: "calc",      label: "Calculadora", icon: iconCalculadora, isModal: true },
];

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [session,     setSession]     = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [aba,         setAba]         = useState("dashboard");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function logout() { await supabase.auth.signOut(); }

  if (loadingAuth) return <SplashScreen texto="Verificando sessão..." />;
  if (!session)    return <LoginPage />;

  return <AppAutenticado aba={aba} setAba={setAba} session={session} onLogout={logout} />;
}

// ── AppAutenticado ────────────────────────────────────────────────────────────
// Separado para que useAppData e todo o flow da calc só montem após autenticação.
function AppAutenticado({ aba, setAba, session, onLogout }) {
  const userId = session.user.id;
  const { data, setData, loading, error } = useAppData(userId);

  // ── Flow global da Calculadora ───────────────────────────────────────────────
  // Vive aqui (não no Dashboard) para funcionar sobre qualquer tela.
  const [modalCalc,       setModalCalc]       = useState(false);
  const [calcRascunho,    setCalcRascunho]    = useState(null);
  const [modalSel,        setModalSel]        = useState(false);
  const [modalEventoCalc, setModalEventoCalc] = useState(false);
  const [modalOpCalc,     setModalOpCalc]     = useState(false);
  const [eventoAlvoId,    setEventoAlvoId]    = useState(null);

  function handleUsarNaOp(rascunho) {
    setCalcRascunho(rascunho);
    setModalCalc(false);
    setModalSel(true);
  }
  function handleSelecionarEvento(ev) {
    setEventoAlvoId(ev.id);
    setModalSel(false);
    setModalOpCalc(true);
  }
  function handleCriarNovoEvento() {
    setModalSel(false);
    setModalEventoCalc(true);
  }
  function salvarEventoCalc(ev) {
    setData(d => {
      const existe = d.eventos.find(e => e.id === ev.id);
      return {
        ...d,
        eventos: existe
          ? d.eventos.map(e => e.id === ev.id ? { ...e, ...ev } : e)
          : [...d.eventos, ev],
      };
    });
    setEventoAlvoId(ev.id);
    setModalEventoCalc(false);
    setModalOpCalc(true);
  }
  function salvarOpCalc(op) {
    setData(d => ({
      ...d,
      eventos: d.eventos.map(ev => ev.id !== eventoAlvoId ? ev : {
        ...ev,
        operacoes: [...(ev.operacoes || []), op],
      }),
    }));
    setCalcRascunho(null);
    setEventoAlvoId(null);
    setModalOpCalc(false);
  }
  function cancelarOpCalc() {
    setCalcRascunho(null);
    setEventoAlvoId(null);
    setModalOpCalc(false);
  }

  const openCalc = () => setModalCalc(true);

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Sidebar (desktop) ── */}
      <Sidebar
        aba={aba} setAba={setAba}
        session={session} onLogout={onLogout}
        error={error}
        onOpenCalc={openCalc}
      />

      {/* ── Header (mobile only — oculto no desktop via CSS) ── */}
      <header className="app-header" style={{
        background: `${G.surface}ee`,
        borderBottom: `1px solid ${G.border}`,
        padding: "0 20px",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div className="app-header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
            <img src={wordmarkUrl} alt="EdgeArb" height={14} style={{ display: "block" }} />
            <button
              onClick={openCalc}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
            >
              <img src={iconCalculadora} alt="Calculadora" width={26} height={26} style={{ display: "block" }} />
            </button>
          </div>
          <nav className="app-header-nav" style={{ display: "flex", gap: 2 }}>
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)}
                className="app-header-nav-btn"
                style={{
                  background: aba === a.id ? G.surface2 : "transparent",
                  border: `1px solid ${aba === a.id ? G.border : "transparent"}`,
                  color: aba === a.id ? G.text : G.textDim,
                  fontWeight: aba === a.id ? 600 : 500,
                }}>
                <span>{a.icon}</span><span>{a.label}</span>
              </button>
            ))}
          </nav>
          <div className="app-header-user">
            {error && <span title={error} style={{ fontSize: 11, color: G.red }}>⚠️</span>}
            <span className="app-header-email" style={{ color: G.textMuted }}>{session.user.email}</span>
            <button onClick={onLogout} style={{
              background: "transparent", border: `1px solid ${G.border}`,
              borderRadius: 7, padding: "5px 12px", fontSize: 12,
              color: G.textDim, cursor: "pointer",
              fontFamily: "'Inter', sans-serif", flexShrink: 0,
              transition: "border-color 0.15s, color 0.15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = G.red; e.currentTarget.style.color = G.red; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textDim; }}
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* ── Bottom nav (mobile only) ── */}
      <BottomNav aba={aba} setAba={setAba} />

      {/* ── Conteúdo principal ── */}
      <main className="app-main" style={{ padding: "32px 24px", minHeight: "100vh" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: G.textMuted }}>Carregando dados...</div>
            </div>
          )}

          {!loading && error && !data && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
              <div style={{ background: "#F8717115", border: "1px solid #F8717144", borderRadius: 10, padding: "20px 28px", textAlign: "center" }}>
                <div style={{ color: G.red, fontWeight: 700, marginBottom: 8 }}>Erro ao carregar dados</div>
                <div style={{ color: G.textDim, fontSize: 13, marginBottom: 16 }}>{error}</div>
                <button onClick={() => window.location.reload()} style={{
                  background: G.accent, color: "#fff", border: "none", borderRadius: 7,
                  padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {aba === "dashboard" && <TelaDashboard data={data} setData={setData} onOpenCalc={openCalc} />}
              {aba === "eventos"   && <TelaEventos   data={data} setData={setData} />}
              {aba === "freebets"  && <TelaFreebets  data={data} setData={setData} />}
              {aba === "banca"     && <TelaCasas     data={data} setData={setData} />}
            </>
          )}

        </div>
      </main>

      {/* ── Modais globais da Calculadora ─────────────────────────────────────────
           Renderizados aqui (fora do <main>) para sobrepor qualquer tela.        ── */}
      <ModalCalculadora
        open={modalCalc}
        onClose={() => setModalCalc(false)}
        onUsarNaOp={handleUsarNaOp}
      />

      {data && (
        <>
          <ModalSelecionarEvento
            open={modalSel}
            onClose={() => setModalSel(false)}
            eventos={data.eventos || []}
            onSelecionarEvento={handleSelecionarEvento}
            onCriarNovoEvento={handleCriarNovoEvento}
          />

          <ModalEvento
            open={modalEventoCalc}
            onClose={() => setModalEventoCalc(false)}
            onSalvar={salvarEventoCalc}
            eventosList={data.eventos || []}
          />

          {eventoAlvoId && (
            <ModalOperacao
              open={modalOpCalc}
              onClose={cancelarOpCalc}
              onSalvar={salvarOpCalc}
              casas={data.casas || []}
              evento={(data.eventos || []).find(ev => ev.id === eventoAlvoId) ?? null}
              rascunhoCalc={calcRascunho}
            />
          )}
        </>
      )}

    </div>
  );
}

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────
function Sidebar({ aba, setAba, session, onLogout, error, onOpenCalc }) {
  return (
    <aside className="app-sidebar">

      <div style={{ padding: "22px 20px 20px", flexShrink: 0 }}>
        <img src={wordmarkUrl} alt="EdgeArb" height={14} style={{ display: "block" }} />
      </div>

      <nav style={{ flex: 1, padding: "8px 0" }}>
        {SIDEBAR_ITEMS.map(item => {
          if (item.isModal) {
            return (
              <button
                key={item.id}
                className="sidebar-nav-btn"
                onClick={onOpenCalc}
                style={{
                  width: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "14px 20px",
                  background: "transparent", border: "none",
                  borderTop: "none",
                  cursor: "pointer",
                  transition: "background 0.15s",
                }}
              >
                <img src={item.icon} alt="Calculadora" width={48} height={48} style={{ display: "block" }} />
              </button>
            );
          }
          const ativo = aba === item.id;
          return (
            <button
              key={item.id}
              className="sidebar-nav-btn"
              onClick={() => setAba(item.id)}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 20px",
                background: ativo ? `${G.accent}12` : "transparent",
                border: "none",
                borderLeft: `3px solid ${ativo ? G.accent : "transparent"}`,
                color: ativo ? G.text : G.textDim,
                fontSize: 13, fontWeight: ativo ? 600 : 400,
                cursor: "pointer", textAlign: "left",
                transition: "background 0.15s, color 0.15s",
                fontFamily: "'Inter', sans-serif", letterSpacing: 0.1,
              }}
            >
              <span style={{ lineHeight: 1, flexShrink: 0 }}>{item.icon()}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "16px 20px", flexShrink: 0 }}>
        {error && <div style={{ fontSize: 11, color: G.red, marginBottom: 8 }}>⚠️ Erro ao salvar</div>}
        <div style={{
          fontSize: 11, color: G.textMuted, marginBottom: 10,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {session.user.email}
        </div>
        <button onClick={onLogout} style={{
          width: "100%", background: "transparent",
          border: `1px solid ${G.border}`, borderRadius: 7,
          padding: "6px 12px", fontSize: 12, color: G.textDim,
          cursor: "pointer", fontFamily: "'Inter', sans-serif",
          transition: "border-color 0.15s, color 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = G.red; e.currentTarget.style.color = G.red; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = G.border; e.currentTarget.style.color = G.textDim; }}
        >
          Sair
        </button>
      </div>

    </aside>
  );
}

// ── Bottom nav (mobile) ───────────────────────────────────────────────────────
function BottomNav({ aba, setAba }) {
  return (
    <nav className="bottom-nav" style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      height: 64,
      background: `${G.surface}f2`,
      borderTop: `1px solid ${G.border}`,
      backdropFilter: "blur(12px)",
      zIndex: 100,
    }}>
      {ABAS.map(a => {
        const ativo = aba === a.id;
        return (
          <button key={a.id} onClick={() => setAba(a.id)} style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 3,
            background: "none", border: "none",
            borderTop: `2px solid ${ativo ? G.accent : "transparent"}`,
            color: ativo ? G.accent : G.textMuted,
            fontSize: 10, fontWeight: ativo ? 700 : 400,
            cursor: "pointer", padding: "10px 0 8px",
            transition: "color 0.15s, border-color 0.15s",
            fontFamily: "'Inter', sans-serif", letterSpacing: 0.3,
          }}>
            <span style={{ lineHeight: 1 }}>{a.icon()}</span>
            <span>{a.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── Splash ────────────────────────────────────────────────────────────────────
function SplashScreen({ texto }) {
  return (
    <div style={{
      minHeight: "100vh", background: G.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 18,
    }}>
      <img src={wordmarkUrl} alt="EdgeArb" height={20} style={{ display: "block" }} />
      <div style={{ fontSize: 13, color: G.textMuted }}>{texto}</div>
    </div>
  );
}
