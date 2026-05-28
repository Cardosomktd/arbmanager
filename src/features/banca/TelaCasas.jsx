import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt, normalizeSearch } from "../../utils/format";
import { calcRetorno } from "../../utils/calculos";
import { calcSaldoCasa } from "../../utils/saldo";
import { uid } from "../../storage";
import { Btn } from "../../components/ui/Btn";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { ModalMovimento } from "./modals/ModalMovimento";

// Converte valor financeiro para centavos inteiros.
// Elimina resíduo de ponto flutuante: -0.000001 → 0 ct, -0.006 → -1 ct, -10 → -1000 ct.
// Usar para TODAS as comparações de "saldo negativo" — nunca comparar float < 0 diretamente.
const centsOf = v => Math.round((Number(v) || 0) * 100);

// ── Cálculo de pendentes da banca ────────────────────────────────────────────
//
// Varre todas as entradas pendentes e retorna:
//   comprometido: capital real bloqueado (já deducido do saldo atual)
//     normal/exchange_back → valor
//     exchange_lay         → valor × (odd − 1)
//     freebet/bonus        → 0 (stake não é dinheiro próprio)
//
//   potencial: retorno total se todas as entradas pendentes forem green
//     normal         → odd × valor             (via calcRetorno)
//     exchange_back  → valor + valor×(odd−1)×(1−comm)  (via calcRetorno)
//     exchange_lay   → valor×(odd−1) + valor×(1−comm)  (responsabilidade + lucro)
//     freebet/bonus  → odd×valor − valor        (via calcRetorno; stake não era real)
//
// ⚠️  Em operações com back + lay no mesmo evento apenas um lado vira green.
//     O "potencial" é o cenário máximo (tudo green) — apenas indicativo.
//
function calcPendentesBanca(data) {
  let comprometido = 0;
  let potencial    = 0;

  const processarEntrada = e => {
    if (e.situacao !== "pendente") return;
    const valor = parseFloat(e.valor) || 0;
    const odd   = parseFloat(String(e.odd || "").replace(",", ".")) || 0;
    const comm  = parseFloat(e.comissao) / 100 || 0;

    // Capital comprometido (o que já saiu do saldo)
    if (e.tipo === "exchange_lay") {
      comprometido += valor * (odd - 1);
      potencial    += valor * (odd - 1) + valor * (1 - comm); // responsabilidade + lucro
    } else if (e.tipo === "freebet" || e.tipo === "bonus") {
      // stake não era dinheiro real → comprometido = 0; potencial = lucro líquido
      potencial += calcRetorno(e);
    } else {
      // normal / exchange_back
      comprometido += valor;
      potencial    += calcRetorno(e); // inclui stake devolvida + lucro
    }
  };

  // Operações esportivas
  (data.eventos || []).forEach(ev =>
    (ev.operacoes || []).forEach(op =>
      (op.entradas || []).forEach(processarEntrada)
    )
  );

  // Apostas avulsas pendentes (normal simples sem cobertura)
  (data.apostasAvulsas || []).forEach(a => {
    if (a.situacao !== "pendente") return;
    const valor = parseFloat(a.valor) || 0;
    const odd   = parseFloat(String(a.odd || "").replace(",", ".")) || 0;
    comprometido += valor;
    potencial    += odd * valor;
  });

  // Proteções pendentes (mesmo tratamento de aposta normal)
  (data.eventos || []).forEach(ev =>
    (ev.protecoes || []).forEach(p => {
      if (p.situacao !== "pendente") return;
      const valor = parseFloat(p.valor) || 0;
      const odd   = parseFloat(String(p.odd || "").replace(",", ".")) || 0;
      comprometido += valor;
      potencial    += odd * valor;
    })
  );

  return { comprometido, potencial };
}

export function TelaCasas({ data, setData }) {
  const [nomeCasa,     setNomeCasa]     = useState("");
  const [saldoInicial, setSaldoInicial] = useState("");
  const [titular,      setTitular]      = useState("");
  const [editId,       setEditId]       = useState(null);
  const [modalMov,     setModalMov]     = useState(false);
  const [casaDetalhe,  setCasaDetalhe]  = useState(null);
  const [filtro,       setFiltro]       = useState("");

  function salvarCasa() {
    if (!nomeCasa.trim()) return;
    if (editId) {
      setData(d => ({ ...d, casas: d.casas.map(c => c.id === editId ? { ...c, nome: nomeCasa.trim(), saldoInicial: parseFloat(saldoInicial) || 0, titular: titular.trim() } : c) }));
      setEditId(null);
    } else {
      setData(d => ({ ...d, casas: [...d.casas, { id: uid(), nome: nomeCasa.trim(), saldoInicial: parseFloat(saldoInicial) || 0, titular: titular.trim(), ativa: true }] }));
    }
    setNomeCasa(""); setSaldoInicial(""); setTitular("");
  }

  function salvarMovimento(mov) {
    setData(d => ({ ...d, movimentos: [...(d.movimentos || []), mov] }));
  }
  function excluirMovimento(id) {
    if (confirm("Excluir esta movimentação?"))
      setData(d => ({ ...d, movimentos: (d.movimentos || []).filter(m => m.id !== id) }));
  }

  const ativas     = (data.casas || []).filter(c => c.ativa);
  const arquivadas = (data.casas || []).filter(c => !c.ativa);

  // Capital comprometido em entradas pendentes (deducido do saldo atual mas ainda por resolver)
  const { comprometido: pendComprometido } = calcPendentesBanca(data);

  // ── Alerta de depósito pendente ────────────────────────────────────────────
  //
  // Regra única: saldo atual em centavos < 0.
  //
  // • Saldo zero (0 ct) → NÃO pendente.
  // • Resíduo float como -0.000001 → 0 ct → NÃO pendente.
  // • Saldo -0,004 → 0 ct (rounds to 0) → NÃO pendente.
  // • Saldo -0,006 → -1 ct → pendente.
  // • Saldo -10 → -1000 ct → pendente.
  //
  // Usando centsOf() para TODAS as comparações de saldo — banner e badge
  // agora usam exatamente a mesma lógica, eliminando inconsistências.
  function temDepPendente(casa) {
    return centsOf(calcSaldoCasa(casa, data)) < 0;
  }

  const alertas = ativas.filter(c => temDepPendente(c));
  const saldoTotal = ativas.reduce((s, c) => s + Math.max(0, calcSaldoCasa(c, data)), 0);
  // "com pendentes" = saldo atual + capital comprometido (o que voltaria se tudo cancelado)
  const saldoComPendentes = saldoTotal + pendComprometido;
  const casasFiltradas = ativas
    .filter(c => normalizeSearch(c.nome).includes(normalizeSearch(filtro)))
    .map(c => ({ c, saldo: calcSaldoCasa(c, data) }))
    .sort((a, b) => {
      const sa = a.saldo, sb = b.saldo;
      // 1. Positivos antes de negativos, negativos antes de zeros
      const grpA = sa > 0 ? 0 : sa < 0 ? 1 : 2;
      const grpB = sb > 0 ? 0 : sb < 0 ? 1 : 2;
      if (grpA !== grpB) return grpA - grpB;
      // 2. Dentro do grupo positivo: maior saldo primeiro (desc)
      if (grpA === 0) return sb - sa;
      // 3. Dentro do grupo negativo: mais negativo primeiro (asc: -500 antes de -100)
      if (grpA === 1) return sa - sb;
      // 4. Dentro do grupo zero: alfabético
      return a.c.nome.localeCompare(b.c.nome, "pt-BR");
    })
    .map(({ c }) => c);

  return (
    <div style={{ maxWidth: 780, margin: "0 auto" }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", marginBottom: 4, color: G.text }}>
        Banca
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div style={{ background: "#F8717111", border: "1px solid #F8717133", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: G.red, fontWeight: 700, marginBottom: 6 }}>⚠️ DEPÓSITO PENDENTE DE LANÇAMENTO</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {alertas.map(c => (
              <div key={c.id} style={{ background: "#F871710A", border: "1px solid #F8717133", borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
                <span style={{ color: G.text, fontWeight: 600 }}>{c.nome}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI total — duas colunas: saldo atual | em operações */}
      <Card style={{ marginBottom: 16, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "stretch", gap: 0 }}>

          {/* Saldo atual */}
          <div style={{ flex: 1, textAlign: "center", padding: "2px 8px" }}>
            <div style={{ fontSize: 10, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Saldo Atual</div>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 26, fontWeight: 800, color: G.green, whiteSpace: "nowrap" }}>{fmt(saldoTotal)}</div>
            {pendComprometido > 0 && (
              <div style={{ fontSize: 11, color: G.textDim, marginTop: 3, whiteSpace: "nowrap" }}>
                com pendentes: <span style={{ color: G.text, fontWeight: 600 }}>{fmt(saldoComPendentes)}</span>
              </div>
            )}
          </div>

          <div style={{ width: 1, background: G.border, alignSelf: "stretch", margin: "0 4px" }} />

          {/* Em operações */}
          <div style={{ flex: 1, textAlign: "center", padding: "2px 8px" }}>
            <div style={{ fontSize: 10, color: G.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Em Operações</div>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 26, fontWeight: 800, color: "#F59E0B", whiteSpace: "nowrap" }}>{fmt(pendComprometido)}</div>
          </div>

        </div>
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
          const temAlerta = centsOf(saldo) < 0;

          return (
            <Card key={c.id} style={{ padding: 0, overflow: "hidden", border: `1px solid ${temAlerta ? "#F8717133" : G.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", cursor: "pointer", gap: 10 }}
                onClick={() => setCasaDetalhe(aberta ? null : c.id)}>

                {/* ── Lado esquerdo: nome + info ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                  <span style={{ color: G.textDim, fontSize: 12, flexShrink: 0 }}>{aberta ? "▼" : "▶"}</span>
                  <div style={{ minWidth: 0, overflow: "hidden" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, overflow: "hidden" }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{c.nome}</span>
                      {temAlerta && <span style={{ fontSize: 10, color: G.red, background: "#F8717122", borderRadius: 4, padding: "1px 6px", fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>DEP. PENDENTE</span>}
                    </div>
                    <div style={{ fontSize: 11, color: G.textDim, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {c.titular && <span style={{ marginRight: 4 }}>👤 {c.titular} ·</span>}
                      Inicial: {fmt(c.saldoInicial)} · {movs.length} mov.
                    </div>
                  </div>
                </div>

                {/* ── Lado direito: saldo + botões ── */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: G.textDim, whiteSpace: "nowrap" }}>Saldo atual</div>
                    <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 700, color: saldo >= 0 ? G.green : G.red, whiteSpace: "nowrap" }}>{fmt(saldo)}</div>
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                    <Btn size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setEditId(c.id); setNomeCasa(c.nome); setSaldoInicial(String(c.saldoInicial || "")); setTitular(c.titular || ""); setCasaDetalhe(c.id); }}>✏️</Btn>
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
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 10, marginBottom: 10 }}>
                        <Input label="Nome" value={nomeCasa} onChange={setNomeCasa} required />
                        <Input label="Titular da conta" value={titular} onChange={setTitular} placeholder="Ex: João Silva" />
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 12 }}>
            <Input label="Nome" value={nomeCasa} onChange={setNomeCasa} placeholder="Ex: Betano" required />
            <Input label="Titular da conta" value={titular} onChange={setTitular} placeholder="Ex: João Silva" />
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
