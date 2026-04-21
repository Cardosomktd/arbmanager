import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { G } from "../../constants/colors";

export function LoginPage() {
  const [modo,         setModo]         = useState("senha"); // "senha" | "magic"
  const [isSignUp,     setIsSignUp]     = useState(false);
  const [email,        setEmail]        = useState("");
  const [senha,        setSenha]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [erro,         setErro]         = useState("");
  const [magicEnviado, setMagicEnviado] = useState(false);

  // ── Email + senha ────────────────────────────────────────
  async function entrarComSenha(e) {
    e.preventDefault();
    if (!email.trim() || !senha) { setErro("Preencha email e senha."); return; }
    setLoading(true); setErro("");

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email: email.trim(), password: senha })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });

    setLoading(false);
    if (error) setErro(traduzirErro(error.message));
    // sucesso: onAuthStateChange no App.jsx detecta a sessão automaticamente
  }

  // ── Magic link ───────────────────────────────────────────
  async function enviarMagicLink(e) {
    e.preventDefault();
    if (!email.trim()) { setErro("Informe seu email."); return; }
    setLoading(true); setErro("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (error) setErro(traduzirErro(error.message));
    else setMagicEnviado(true);
  }

  function trocarModo(novo) {
    setModo(novo);
    setErro("");
    setMagicEnviado(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: G.bg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 38, fontWeight: 800, letterSpacing: 3, textTransform: "uppercase" }}>
            <span style={{ color: G.accent }}>ARB</span>
            <span style={{ color: G.text }}>MANAGER</span>
          </div>
          <div style={{ color: G.textDim, fontSize: 13, marginTop: 6 }}>Gestão de arbitragem esportiva</div>
        </div>

        {/* Card */}
        <div style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 12, padding: 28 }}>

          {/* Tabs modo */}
          <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3, marginBottom: 24 }}>
            {[
              { id: "senha", label: "Email e senha" },
              { id: "magic", label: "Magic link"    },
            ].map(t => (
              <button key={t.id} onClick={() => trocarModo(t.id)} style={{
                flex: 1, padding: "7px 0", borderRadius: 6, border: "none", cursor: "pointer",
                background: modo === t.id ? G.surface : "transparent",
                color:      modo === t.id ? G.text    : G.textDim,
                fontSize: 13, fontWeight: 500,
                boxShadow: modo === t.id ? "0 1px 4px #0005" : "none",
                fontFamily: "'DM Sans', sans-serif",
                transition: "all 0.15s",
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Formulário: email + senha ── */}
          {modo === "senha" && (
            <form onSubmit={entrarComSenha} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <Campo label="Email">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoFocus autoComplete="email"
                  style={inputSt()}
                />
              </Campo>

              <Campo label="Senha">
                <input
                  type="password" value={senha} onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••" autoComplete={isSignUp ? "new-password" : "current-password"}
                  style={inputSt()}
                />
              </Campo>

              {erro && <ErroBanner msg={erro} />}

              <BtnPrimary loading={loading}>
                {loading ? "Aguarde..." : isSignUp ? "Criar conta" : "Entrar"}
              </BtnPrimary>

              <button type="button" onClick={() => { setIsSignUp(v => !v); setErro(""); }}
                style={{ background: "none", border: "none", color: G.textDim, fontSize: 12, cursor: "pointer", marginTop: -6 }}>
                {isSignUp ? "Já tenho conta — fazer login" : "Não tenho conta — criar agora"}
              </button>
            </form>
          )}

          {/* ── Formulário: magic link ── */}
          {modo === "magic" && !magicEnviado && (
            <form onSubmit={enviarMagicLink} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.6 }}>
                Informe seu email. Enviaremos um link de acesso — sem necessidade de senha.
              </div>

              <Campo label="Email">
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" autoFocus autoComplete="email"
                  style={inputSt()}
                />
              </Campo>

              {erro && <ErroBanner msg={erro} />}

              <BtnPrimary loading={loading}>
                {loading ? "Enviando..." : "Enviar magic link"}
              </BtnPrimary>
            </form>
          )}

          {/* ── Magic link enviado ── */}
          {modo === "magic" && magicEnviado && (
            <div style={{ textAlign: "center", padding: "8px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📬</div>
              <div style={{ fontWeight: 700, color: G.text, marginBottom: 8, fontSize: 15 }}>Link enviado!</div>
              <div style={{ fontSize: 13, color: G.textDim, lineHeight: 1.7 }}>
                Verifique a caixa de entrada de{" "}
                <strong style={{ color: G.text }}>{email}</strong>{" "}
                e clique no link para entrar.
              </div>
              <button onClick={() => { setMagicEnviado(false); setEmail(""); }}
                style={{ marginTop: 18, background: "none", border: "none", color: G.accent, fontSize: 13, cursor: "pointer" }}>
                Usar outro email
              </button>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 11, color: G.textMuted }}>
          Seus dados ficam salvos na nuvem com segurança.
        </div>
      </div>
    </div>
  );
}

// ── Subcomponentes auxiliares ────────────────────────────────

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, color: G.textDim, fontWeight: 600, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ErroBanner({ msg }) {
  return (
    <div style={{ background: "#ff444415", border: "1px solid #ff444444", borderRadius: 6, padding: "9px 12px", fontSize: 13, color: "#ff6b6b", lineHeight: 1.4 }}>
      {msg}
    </div>
  );
}

function BtnPrimary({ children, loading }) {
  return (
    <button type="submit" disabled={loading} style={{
      background: loading ? G.border : G.accent,
      color: loading ? G.textDim : "#000",
      fontWeight: 700, fontSize: 14,
      border: "none", borderRadius: 8,
      padding: "11px 0", width: "100%",
      cursor: loading ? "not-allowed" : "pointer",
      fontFamily: "'DM Sans', sans-serif",
      transition: "background 0.15s",
    }}>
      {children}
    </button>
  );
}

function inputSt() {
  return {
    display: "block", width: "100%", boxSizing: "border-box",
    background: G.surface2, border: `1px solid ${G.border}`,
    borderRadius: 6, padding: "10px 12px",
    color: G.text, fontSize: 14, outline: "none",
    fontFamily: "'DM Sans', sans-serif",
  };
}

function traduzirErro(msg) {
  if (msg.includes("Invalid login credentials")) return "Email ou senha incorretos.";
  if (msg.includes("Email not confirmed"))       return "Confirme seu email antes de entrar.";
  if (msg.includes("User already registered"))   return "Email já cadastrado. Use 'Entrar' em vez de 'Criar conta'.";
  if (msg.includes("Password should"))           return "A senha deve ter pelo menos 6 caracteres.";
  if (msg.includes("rate limit") || msg.includes("over_email_send_rate_limit"))
                                                 return "Muitas tentativas. Aguarde alguns minutos.";
  if (msg.includes("Unable to validate"))        return "Email inválido.";
  return msg;
}
