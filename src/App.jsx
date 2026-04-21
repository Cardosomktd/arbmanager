import { useState, useEffect } from "react";
import { G } from "./constants/colors";
import { supabase } from "./lib/supabase";
import { useAppData } from "./hooks/useAppData";
import { LoginPage } from "./features/auth/LoginPage";
import { TelaDashboard } from "./features/dashboard/TelaDashboard";
import { TelaEventos }   from "./features/eventos/TelaEventos";
import { TelaFreebets }  from "./features/freebets/TelaFreebets";
import { TelaCasas }     from "./features/banca/TelaCasas";

const ABAS = [
  { id: "dashboard", label: "Dashboard",   icon: "📊" },
  { id: "eventos",   label: "Lançamentos", icon: "🏟️" },
  { id: "freebets",  label: "Freebets",    icon: "🎁" },
  { id: "banca",     label: "Banca",       icon: "🏦" },
];

export default function App() {
  const [session,     setSession]     = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [aba,         setAba]         = useState("dashboard");

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

  return <AppAutenticado aba={aba} setAba={setAba} session={session} onLogout={logout} />;
}

// Separado para que useAppData só monte após autenticação
function AppAutenticado({ aba, setAba, session, onLogout }) {
  const userId = session.user.id;
  const { data, setData, loading, error } = useAppData(userId);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Header ── */}
      <header style={{ background: G.surface, borderBottom: `1px solid ${G.border}`, padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 960, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: 54 }}>

          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
            <span style={{ color: G.accent }}>ARB</span><span style={{ color: G.text }}>MANAGER</span>
          </div>

          <nav style={{ display: "flex", gap: 2 }}>
            {ABAS.map(a => (
              <button key={a.id} onClick={() => setAba(a.id)} style={{
                background: aba === a.id ? G.surface2 : "transparent",
                border: `1px solid ${aba === a.id ? G.border : "transparent"}`,
                color: aba === a.id ? G.text : G.textDim,
                borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <span>{a.icon}</span><span>{a.label}</span>
              </button>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Indicador de save em andamento */}
            {error && (
              <span title={error} style={{ fontSize: 11, color: G.red, cursor: "default" }}>
                ⚠️ Erro ao salvar
              </span>
            )}
            <span style={{ fontSize: 11, color: G.textMuted, maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session.user.email}
            </span>
            <button onClick={onLogout} style={{
              background: "transparent", border: `1px solid ${G.border}`,
              borderRadius: 6, padding: "5px 10px", fontSize: 12,
              color: G.textDim, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
            }}>
              Sair
            </button>
          </div>

        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ flex: 1, padding: "24px 20px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {loading && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300, flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: G.textMuted }}>Carregando dados...</div>
            </div>
          )}

          {!loading && error && !data && (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
              <div style={{ background: "#ff444415", border: "1px solid #ff444444", borderRadius: 10, padding: "20px 28px", textAlign: "center" }}>
                <div style={{ color: G.red, fontWeight: 700, marginBottom: 8 }}>Erro ao carregar dados</div>
                <div style={{ color: G.textDim, fontSize: 13, marginBottom: 16 }}>{error}</div>
                <button onClick={() => window.location.reload()} style={{
                  background: G.accent, color: "#000", border: "none", borderRadius: 6,
                  padding: "8px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  Tentar novamente
                </button>
              </div>
            </div>
          )}

          {!loading && data && (
            <>
              {aba === "dashboard" && <TelaDashboard data={data} />}
              {aba === "eventos"   && <TelaEventos   data={data} setData={setData} />}
              {aba === "freebets"  && <TelaFreebets  data={data} setData={setData} />}
              {aba === "banca"     && <TelaCasas     data={data} setData={setData} />}
            </>
          )}

        </div>
      </main>
    </div>
  );
}

function SplashScreen({ texto }) {
  return (
    <div style={{
      minHeight: "100vh", background: G.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>
        <span style={{ color: G.accent }}>ARB</span><span style={{ color: G.textDim }}>MANAGER</span>
      </div>
      <div style={{ fontSize: 13, color: G.textMuted }}>{texto}</div>
    </div>
  );
}
