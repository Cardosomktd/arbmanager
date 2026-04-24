import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt, getCasaNome } from "../../utils/format";
import { getFreebets } from "../../utils/freebets";
import { Badge } from "../../components/ui/Badge";
import { Btn } from "../../components/ui/Btn";
import { Card } from "../../components/ui/Card";
import { ModalNovaFreebet } from "./modals/ModalNovaFreebet";

export function TelaFreebets({ data, setData }) {
  const [modalNova,    setModalNova]    = useState(false);
  const [filtro,       setFiltro]       = useState("");
  const [editPrazoId,  setEditPrazoId]  = useState(null);
  const [editPrazoVal, setEditPrazoVal] = useState("");
  const PCT_EXTRACAO = 65;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  function diasParaVencer(prazo) {
    if (!prazo) return null;
    const v = new Date(prazo);
    v.setHours(0, 0, 0, 0);
    return Math.round((v - hoje) / (1000 * 60 * 60 * 24));
  }

  function salvarFreebet(fb) {
    setData(d => ({ ...d, freebets: [...(d.freebets || []), fb] }));
  }
  function excluirFreebet(id) {
    if (confirm("Excluir esta freebet?"))
      setData(d => ({ ...d, freebets: (d.freebets || []).filter(f => f.id !== id) }));
  }
  function abrirEditPrazo(f) {
    setEditPrazoId(f.id);
    setEditPrazoVal(f.prazo || "");
  }
  function salvarPrazo(id) {
    if (id.startsWith("auto_")) {
      // Freebet automática: atualiza prazo diretamente no op.geraFreebet
      const opId = id.replace(/^auto_/, "");
      setData(d => ({
        ...d,
        eventos: (d.eventos || []).map(ev => ({
          ...ev,
          operacoes: (ev.operacoes || []).map(op =>
            op.id !== opId ? op : {
              ...op,
              geraFreebet: op.geraFreebet ? { ...op.geraFreebet, prazo: editPrazoVal } : op.geraFreebet,
            }
          ),
        })),
      }));
    } else {
      setData(d => ({
        ...d,
        freebets: (d.freebets || []).map(f => f.id !== id ? f : { ...f, prazo: editPrazoVal }),
      }));
    }
    setEditPrazoId(null);
    setEditPrazoVal("");
  }

  function marcarUsada(id) {
    if (id.startsWith("auto_")) {
      setData(d => ({ ...d, freebetsAutoUsadas: [...(d.freebetsAutoUsadas || []), id] }));
    } else {
      setData(d => ({ ...d, freebets: (d.freebets || []).map(f => f.id !== id ? f : { ...f, usada: true }) }));
    }
  }

  const todas    = getFreebets(data);
  const ativas   = todas.filter(f => !f.usada && (f.prazo ? new Date(f.prazo) >= hoje : true));
  const usadas   = todas.filter(f => f.usada);
  const vencidas = todas.filter(f => !f.usada && f.prazo && new Date(f.prazo) < hoje);

  const filtradas = ativas.filter(f => getCasaNome(data.casas || [], f.casaId).toLowerCase().includes(filtro.toLowerCase()));
  const alertas   = ativas.filter(f => { const d = diasParaVencer(f.prazo); return d !== null && d <= 3; });

  const totalDisponivel = ativas.reduce((s, f) => s + (f.valor || 0), 0);
  const totalEstimado   = ativas.reduce((s, f) => s + (f.valor || 0) * (PCT_EXTRACAO / 100), 0);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, color: G.text }}>
        Freebets
      </div>

      {/* Alertas de vencimento */}
      {alertas.length > 0 && (
        <div style={{ background: "#FBBF2411", border: "1px solid #FBBF2444", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: G.yellow, fontWeight: 700, marginBottom: 6 }}>⏰ VENCENDO EM BREVE</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {alertas.map(f => {
              const dias = diasParaVencer(f.prazo);
              return (
                <div key={f.id} style={{ background: "#FBBF2411", border: "1px solid #FBBF2433", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                  <span style={{ color: G.text, fontWeight: 600 }}>{getCasaNome(data.casas || [], f.casaId)}</span>
                  <span style={{ color: G.textDim, marginLeft: 4 }}>{fmt(f.valor)}</span>
                  <span style={{ color: dias <= 0 ? G.red : G.yellow, fontWeight: 700, marginLeft: 6 }}>
                    {dias <= 0 ? "HOJE" : dias === 1 ? "amanhã" : `${dias} dias`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Total disponível</div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: G.accent }}>{fmt(totalDisponivel)}</div>
          <div style={{ fontSize: 11, color: G.textDim, marginTop: 2 }}>{ativas.length} freebet{ativas.length !== 1 ? "s" : ""}</div>
        </Card>
        <Card style={{ padding: "12px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 11, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Estimado (65%)</div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 24, fontWeight: 800, color: G.green }}>{fmt(totalEstimado)}</div>
          <div style={{ fontSize: 11, color: G.textDim, marginTop: 2 }}>lucro esperado</div>
        </Card>
      </div>

      {/* Ações */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Btn onClick={() => setModalNova(true)}>+ Nova freebet</Btn>
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="🔍 Buscar por casa..."
          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none", flex: 1, minWidth: 140 }} />
      </div>

      {/* Lista ativas */}
      {filtradas.length === 0
        ? <Card style={{ textAlign: "center", padding: 32, color: G.textMuted }}><div style={{ fontSize: 28, marginBottom: 8 }}>🎁</div>Nenhuma freebet disponível.</Card>
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {[...filtradas].sort((a, b) => {
              const da = diasParaVencer(a.prazo), db = diasParaVencer(b.prazo);
              if (da === null && db === null) return 0;
              if (da === null) return 1;
              if (db === null) return -1;
              return da - db;
            }).map(f => {
              const dias      = diasParaVencer(f.prazo);
              const urgente   = dias !== null && dias <= 3;
              const estimado  = (f.valor || 0) * (PCT_EXTRACAO / 100);
              return (
                <Card key={f.id} style={{ border: `1px solid ${urgente ? "#FBBF2444" : G.border}`, padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{getCasaNome(data.casas || [], f.casaId)}</span>
                        {f.tipo === "gerada" && <Badge cor="blue">Auto</Badge>}
                        {urgente && <Badge cor="yellow">{dias <= 0 ? "Vence HOJE" : `${dias}d`}</Badge>}
                      </div>
                      {f.obs && <div style={{ fontSize: 11, color: G.textDim, marginBottom: 4 }}>{f.obs}</div>}

                      {/* Prazo — exibição e edição inline */}
                      {editPrazoId === f.id ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <input
                            type="date" value={editPrazoVal} onChange={e => setEditPrazoVal(e.target.value)}
                            style={{ background: G.surface2, border: `1px solid ${G.accent}`, borderRadius: 6, padding: "4px 8px", color: G.text, fontSize: 12, outline: "none" }}
                          />
                          <Btn size="sm" variant="success" onClick={() => salvarPrazo(f.id)}>✓</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => { setEditPrazoId(null); setEditPrazoVal(""); }}>✕</Btn>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          {f.prazo ? (
                            <>
                              <span style={{ fontSize: 12, color: G.textDim }}>Vence: {new Date(f.prazo + "T12:00:00").toLocaleDateString("pt-BR")}</span>
                              <button onClick={() => abrirEditPrazo(f)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: 12, color: G.textMuted, lineHeight: 1 }} title="Editar prazo">✏️</button>
                            </>
                          ) : (
                            <button onClick={() => abrirEditPrazo(f)}
                              style={{ background: "none", border: `1px dashed ${G.border}`, borderRadius: 4, cursor: "pointer", padding: "2px 8px", fontSize: 11, color: G.textMuted,  }}>
                              + Adicionar vencimento
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 22, fontWeight: 800, color: G.accent }}>{fmt(f.valor)}</div>
                        <div style={{ fontSize: 11, color: G.green }}>≈ {fmt(estimado)} esperado</div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexDirection: "column" }}>
                        <Btn size="sm" variant="success" onClick={() => marcarUsada(f.id)}>✓ Usar</Btn>
                        {f.tipo !== "gerada" && <Btn size="sm" variant="danger" onClick={() => excluirFreebet(f.id)}>🗑️</Btn>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      }

      {/* Vencidas */}
      {vencidas.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, color: G.red, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Vencidas ({vencidas.length})</div>
          {vencidas.map(f => (
            <Card key={f.id} style={{ opacity: 0.5, marginBottom: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{getCasaNome(data.casas || [], f.casaId)}</span>
                <span style={{ color: G.red, marginLeft: 8, fontSize: 12 }}>{fmt(f.valor)}</span>
                <span style={{ color: G.textMuted, marginLeft: 8, fontSize: 11 }}>Venceu {new Date(f.prazo + "T12:00:00").toLocaleDateString("pt-BR")}</span>
              </div>
              <Btn size="sm" variant="danger" onClick={() => excluirFreebet(f.id)}>🗑️</Btn>
            </Card>
          ))}
        </div>
      )}

      {/* Usadas */}
      {usadas.length > 0 && (
        <div>
          <div style={{ fontSize: 12, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Utilizadas ({usadas.length})</div>
          {usadas.slice(0, 5).map(f => (
            <Card key={f.id} style={{ opacity: 0.4, marginBottom: 6, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{getCasaNome(data.casas || [], f.casaId)}</span>
                <span style={{ color: G.textDim, marginLeft: 8, fontSize: 12 }}>{fmt(f.valor)}</span>
                {f.obs && <span style={{ color: G.textMuted, marginLeft: 8, fontSize: 11 }}>{f.obs}</span>}
              </div>
              <Badge cor="gray">Usada</Badge>
            </Card>
          ))}
        </div>
      )}

      <ModalNovaFreebet open={modalNova} onClose={() => setModalNova(false)} onSalvar={salvarFreebet} casas={data.casas || []} />
    </div>
  );
}
