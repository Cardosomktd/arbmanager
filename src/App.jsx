import { useState, useEffect } from "react";
import { G } from "./constants/colors";
import wordmarkUrl from "./assets/EDGEARB.svg";
import { supabase } from "./lib/supabase";
import { useAppData } from "./hooks/useAppData";
import { LoginPage } from "./features/auth/LoginPage";
import { TelaDashboard } from "./features/dashboard/TelaDashboard";
import { TelaEventos }   from "./features/eventos/TelaEventos";
import { TelaFreebets }  from "./features/freebets/TelaFreebets";
import { TelaCasas }     from "./features/banca/TelaCasas";

// Itens de navegação principal (usados pelo BottomNav mobile)
const ABAS = [
  { id: "dashboard", label: "Dashboard",  icon: "📊" },
  { id: "eventos",   label: "Operações",  icon: "🏟️" },
  { id: "freebets",  label: "Freebets",   icon: "🎁" },
  { id: "banca",     label: "Banca",      icon: "🏦" },
];

// Itens da sidebar (inclui Calculadora como ação de modal)
const SIDEBAR_ITEMS = [
  { id: "dashboard", label: "Dashboard",   icon: "📊" },
  { id: "eventos",   label: "Operações",   icon: "🏟️" },
  { id: "freebets",  label: "Freebets",    icon: "🎁" },
  { id: "banca",     label: "Banca",       icon: "🏦" },
  { id: "calc",      label: "Calculadora", icon: "🧮", isModal: true },
];

export default function App() {
  const [session,     setSession]     = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [aba,         setAba]         = useState("dashboard");
  const [modalCalc,   setModalCalc]   = useState(false); // levantado para a sidebar abrir

  // ── Sessão ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
  }

  // ── Guards ───────────────────────────────────────────────
  if (loadingAuth) return <SplashScreen texto="Verificando sessão..." />;
  if (!session)    return <LoginPage />;

  return (
    <AppAutenticado
      aba={aba} setAba={setAba}
      session={session} onLogout={logout}
      modalCalc={modalCalc} setModalCalc={setModalCalc}
    />
  );
}

// Separado para que useAppData só monte após autenticação
function AppAutenticado({ aba, setAba, session, onLogout, modalCalc, setModalCalc }) {
  const userId = session.user.id;
  const { data, setData, loading, error } = useAppData(userId);

  return (
    <div style={{ minHeight: "100vh" }}>

      {/* ── Sidebar (desktop) — oculta no mobile via CSS ── */}
      <Sidebar
        aba={aba} setAba={setAba}
        session={session} onLogout={onLogout}
        error={error}
        onOpenCalc={() => setModalCalc(true)}
      />

      {/* ── Header (mobile only) — oculto no desktop via CSS ── */}
      <header className="app-header" style={{
        background: `${G.surface}ee`,
        borderBottom: `1px solid ${G.border}`,
        padding: "0 20px",
        position: "sticky", top: 0, zIndex: 100,
        backdropFilter: "blur(12px)",
      }}>
        <div className="app-header-inner">
          <div className="app-header-logo" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <img src={wordmarkUrl} alt="EdgeArb" height={14} style={{ display: "block" }} />
          </div>

          {/* nav mantido no DOM mas ocultado por CSS no mobile */}
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
            {error && (
              <span title={error} style={{ fontSize: 11, color: G.red, cursor: "default" }}>⚠️</span>
            )}
            <span className="app-header-email" style={{ color: G.textMuted }}>
              {session.user.email}
            </span>
            <button onClick={onLogout} style={{
              background: "transparent", border: `1px solid ${G.border}`,
              borderRadius: 7, padding: "5px 12px", fontSize: 12,
              color: G.textDim, cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              flexShrink: 0,
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

      {/* ── Bottom nav (mobile only) — oculta no desktop via CSS ── */}
      <BottomNav aba={aba} setAba={setAba} />

      {/* ── Main ── */}
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
              {aba === "dashboard" && (
                <TelaDashboard
                  data={data} setData={setData}
                  modalCalc={modalCalc} setModalCalc={setModalCalc}
                />
              )}
              {aba === "eventos"   && <TelaEventos  data={data} setData={setData} />}
              {aba === "freebets"  && <TelaFreebets data={data} setData={setData} />}
              {aba === "banca"     && <TelaCasas    data={data} setData={setData} />}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────
function Sidebar({ aba, setAba, session, onLogout, error, onOpenCalc }) {
  return (
    <aside className="app-sidebar">

      {/* Logo */}
      <div style={{ padding: "22px 20px 20px", borderBottom: `1px solid ${G.border}`, flexShrink: 0 }}>
        <img src={wordmarkUrl} alt="EdgeArb" height={14} style={{ display: "block" }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "8px 0" }}>
        {SIDEBAR_ITEMS.map(item => {
          const ativo = !item.isModal && aba === item.id;
          return (
            <button
              key={item.id}
              className="sidebar-nav-btn"
              onClick={() => item.isModal ? onOpenCalc() : setAba(item.id)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 20px",
                background: ativo ? `${G.accent}12` : "transparent",
                border: "none",
                borderLeft: `3px solid ${ativo ? G.accent : "transparent"}`,
                color: ativo ? G.text : G.textDim,
                fontSize: 13,
                fontWeight: ativo ? 600 : 400,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s, color 0.15s",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: 0.1,
              }}
            >
              <span style={{ fontSize: 15, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 20px", borderTop: `1px solid ${G.border}`, flexShrink: 0 }}>
        {error && (
          <div style={{ fontSize: 11, color: G.red, marginBottom: 8 }}>⚠️ Erro ao salvar</div>
        )}
        <div style={{
          fontSize: 11, color: G.textMuted, marginBottom: 10,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {session.user.email}
        </div>
        <button
          onClick={onLogout}
          style={{
            width: "100%",
            background: "transparent",
            border: `1px solid ${G.border}`,
            borderRadius: 7,
            padding: "6px 12px",
            fontSize: 12,
            color: G.textDim,
            cursor: "pointer",
            fontFamily: "'Inter', sans-serif",
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
      position: "fixed",
      bottom: 0, left: 0, right: 0,
      height: 64,
      background: `${G.surface}f2`,
      borderTop: `1px solid ${G.border}`,
      backdropFilter: "blur(12px)",
      zIndex: 100,
    }}>
      {ABAS.map(a => {
        const ativo = aba === a.id;
        return (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "none",
              border: "none",
              borderTop: `2px solid ${ativo ? G.accent : "transparent"}`,
              color: ativo ? G.accent : G.textMuted,
              fontSize: 10,
              fontWeight: ativo ? 700 : 400,
              cursor: "pointer",
              padding: "10px 0 8px",
              transition: "color 0.15s, border-color 0.15s",
              fontFamily: "'Inter', sans-serif",
              letterSpacing: 0.3,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{a.icon}</span>
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
