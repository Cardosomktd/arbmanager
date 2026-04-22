import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt } from "../../utils/format";
import { calcRetorno } from "../../utils/calculos";
import { calcSaldoCasa } from "../../utils/saldo";
import { uid } from "../../storage";
import { Btn } from "../../components/ui/Btn";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ModalMovimento } from "./modals/ModalMovimento";

export function TelaCasas({ data, setData }) {
  const [nomeCasa,     setNomeCasa]     = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [editId,       setEditId]       = useState(null);
  const [modalMov,     setModalMov]     = useState(false);
  const [casaDetalhe,  setCasaDetalhe]  = useState(null);
  const [filtro,       setFiltro]       = useState("");

  function salvarCasa() {
    if (!nomeCasa.trim()) return;
    if (editId) {
      setData(d => ({ ...d, casas: d.casas.map(c => c.id === editId ? { ...c, nome: nomeCasa.trim(), saldoInicial: parseFloat(saldoInicial) || 0 } : c) }));
      setEditId(null);
    } else {
      setData(d => ({ ...d, casas: [...d.casas, { id: uid(), nome: nomeCasa.trim(), saldoInicial: parseFloat(saldoInicial) || 0, ativa: true }] }));
    }
    setNomeCasa(""); setSaldoInicial("");
  }

  function salvarMovimento(mov) {
    setData(d => ({ ...d, movimentos: [...(d.movimentos || []), mov] }));
  }
  function excluirMovimento(id) {
    if (confirm("Excluir esta movimentação?"))
      setData(d => ({ ...d, movimentos: (d.movimentos || []).filter(m => m.id !== id) }));
  }

  function temDepPendente(casa) {
    // Rastreia o timestamp da última operação com entrada "normal" nesta casa.
    // O alerta permanece enquanto não houver depósito registrado APÓS essa operação,
    // independentemente de o saldo ter ficado positivo por um green.
    let ultimaOpNormalTs = null;
    (data.eventos || []).forEach(ev => (ev.operacoes || []).forEach(op => {
      const temNormal = (op.entradas || []).some(e => e.casa === casa.id && e.tipo === "normal");
      if (!temNormal) return;
      const ts = op.criadoEm ? new Date(op.criadoEm).getTime() : 0;
      if (ts > (ultimaOpNormalTs || 0)) ultimaOpNormalTs = ts;
    }));
    if (!ultimaOpNormalTs) return false;
    const deps = (data.movimentos || []).filter(m => m.casaId === casa.id && m.tipo === "deposito");
    return !deps.some(m => new Date(m.data).getTime() >= ultimaOpNormalTs);
  }

  const ativas     = (data.casas || []).filter(c => c.ativa);
  const arquivadas = (data.casas || []).filter(c => !c.ativa);
  const alertas    = ativas.filter(c => temDepPendente(c));
  const saldoTotal = ativas.reduce((s, c) => s + Math.max(0, calcSaldoCasa(c, data)), 0);
  const casasFiltradas = ativas.filter(c => c.nome.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, color: G.accent }}>
        Banca
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ background: "#ff440011", border: "1px solid #ff444433", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: G.red, fontWeight: 700, marginBottom: 6 }}>⚠️ DEPÓSITO PENDENTE DE LANÇAMENTO</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {alertas.map(c => (
              <div key={c.id} style={{ background: "#ff44440a", border: "1px solid #ff444433", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                <span style={{ color: G.text, fontWeight: 600 }}>{c.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI total */}
      <Card style={{ marginBottom: 16, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: 12, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Saldo Total da Banca</div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 26, fontWeight: 800, color: G.green }}>{fmt(saldoTotal)}</div>
      </Card>

      {/* Ações */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Btn onClick={() => setModalMov(true)}>+ Depósito / Saque</Btn>
        <input value={filtro} onChange={e => setFiltro(e.target.value)} placeholder="🔍 Buscar casa..."
          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none", flex: 1, minWidth: 160 }} />
      </div>

      {/* Lista de casas */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {casasFiltradas.map(c => {
          const saldo    = calcSaldoCasa(c, data);
          const movs     = (data.movimentos || []).filter(m => m.casaId === c.id);
          const aberta   = casaDetalhe === c.id;
          const temAlerta = saldo < 0;

          return (
            <Card key={c.id} style={{ padding: 0, overflow: "hidden", border: `1px solid ${temAlerta ? "#ff444433" : G.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", cursor: "pointer" }}
                onClick={() => setCasaDetalhe(aberta ? null : c.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: G.textDim, fontSize: 12 }}>{aberta ? "▼" : "▶"}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                      {c.nome}
                      {temAlerta && <span style={{ fontSize: 10, color: G.red, background: "#ff444422", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>DEP. PENDENTE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: G.textDim, marginTop: 1 }}>
                      Inicial: {fmt(c.saldoInicial)} · {movs.length} movimentação{movs.length !== 1 ? "ões" : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: G.textDim }}>Saldo atual</div>
                    <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 700, color: saldo >= 0 ? G.green : G.red }}>{fmt(saldo)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setEditId(c.id); setNomeCasa(c.nome); setSaldoInicial(String(c.saldoInicial || "")); setCasaDetalhe(c.id); }}>✏️</Btn>
                    <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); if (!window.confirm("Tem certeza que deseja arquivar esta casa?")) return; setData(d => ({ ...d, casas: d.casas.map(x => x.id === c.id ? { ...x, ativa: false } : x) })); }}>📦</Btn>
                  </div>
                </div>
              </div>

              {aberta && (
                <div style={{ borderTop: `1px solid ${G.border}`, padding: "10px 14px" }}>
                  {editId === c.id ? (
                    /* ── Edição inline ── */
                    <div>
                      <div style={{ fontSize: 12, color: G.textDim, fontWeight: 600, marginBottom: 10 }}>✏️ Editar casa</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10, marginBottom: 10 }}>
                        <Input label="Nome" value={nomeCasa} onChange={setNomeCasa} required />
                        <Input label="Saldo inicial (R$)" value={saldoInicial} onChange={setSaldoInicial} type="number" />
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Btn onClick={salvarCasa}>Salvar</Btn>
                        <Btn variant="ghost" onClick={() => { setEditId(null); setNomeCasa(""); setSaldoInicial(""); }}>Cancelar</Btn>
                      </div>
                    </div>
                  ) : movs.length === 0 ? (
                    <div style={{ color: G.textMuted, fontSize: 12, textAlign: "center", padding: "8px 0" }}>Nenhuma movimentação registrada.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {[...movs].reverse().map(m => (
                        <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: G.surface2, borderRadius: 6, padding: "7px 10px" }}>
                          <div>
                            <div style={{ fontSize: 12, color: m.tipo === "deposito" ? G.green : G.red, fontWeight: 600 }}>
                              {m.tipo === "deposito" ? "⬆️ Depósito" : "⬇️ Saque"}
                            </div>
                            {m.obs && <div style={{ fontSize: 11, color: G.textDim, marginTop: 1 }}>{m.obs}</div>}
                            <div style={{ fontSize: 10, color: G.textMuted, marginTop: 1 }}>{new Date(m.data).toLocaleDateString("pt-BR")}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 16, fontWeight: 700, color: m.tipo === "deposito" ? G.green : G.red }}>
                              {m.tipo === "deposito" ? "+" : "-"}{fmt(m.valor)}
                            </span>
                            <Btn size="sm" variant="danger" onClick={() => excluirMovimento(m.id)}>🗑️</Btn>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* Nova casa */}
      {!editId && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>➕ Nova casa</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 12 }}>
            <Input label="Nome" value={nomeCasa} onChange={setNomeCasa} placeholder="Ex: Betano" required />
            <Input label="Saldo inicial" value={saldoInicial} onChange={setSaldoInicial} type="number" placeholder="0,00" />
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn onClick={salvarCasa}>Adicionar casa</Btn>
          </div>
        </Card>
      )}

      {/* Arquivadas */}
      {arquivadas.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, color: G.textDim, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Arquivadas ({arquivadas.length})</div>
          {arquivadas.map(c => (
            <Card key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", opacity: 0.5, marginBottom: 6 }}>
              <span style={{ fontSize: 13 }}>{c.nome}</span>
              <Btn size="sm" variant="ghost" onClick={() => setData(d => ({ ...d, casas: d.casas.map(x => x.id === c.id ? { ...x, ativa: true } : x) }))}>Reativar</Btn>
            </Card>
          ))}
        </div>
      )}

      <ModalMovimento open={modalMov} onClose={() => setModalMov(false)} onSalvar={salvarMovimento} casas={data.casas || []} />
    </div>
  );
}
