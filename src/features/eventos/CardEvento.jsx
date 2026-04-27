import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt, fmtDate, fmtOdd, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp, calcRetorno } from "../../utils/calculos";
import { lucroProtecao } from "../../utils/lucroProtecao";
import { statusEvento, statusOp } from "../../utils/status";
import { Badge } from "../../components/ui/Badge";
import { Btn } from "../../components/ui/Btn";
import { Card } from "../../components/ui/Card";
import { CardOperacao } from "./CardOperacao";
import { ModalConcluirOp } from "./modals/ModalConcluirOp";

export function CardEvento({ evento, casas, atrasado = false, onEditarEvento, onExcluirEvento, onEditarOp, onExcluirOp, onConcluirOp, onAddProtecao, onConcluirProtecao, onExcluirProtecao }) {
  const [expandido, setExpandido] = useState(false);
  const [concluindoOp, setConcluindoOp] = useState(null);

  const lucroOps  = (evento.operacoes || []).reduce((s, op) => s + lucroEfetivoOp(op), 0);
  const lucroProts = (evento.protecoes || []).reduce((s, p) => {
    if (p.situacao === "pendente") return s;
    return s + lucroProtecao(p);
  }, 0);
  const lucro = lucroOps + lucroProts;

  const st = statusEvento(evento);
  const statusCor   = atrasado && (st === "pendente" || st === "andamento")
    ? "red"
    : { vazio: "gray", pendente: "yellow", andamento: "blue", finalizado: "green" }[st];
  const statusLabel = { vazio: "Sem operações", pendente: "Pendente", andamento: "Em andamento", finalizado: "Finalizado" }[st];

  const todasEntradas = (evento.operacoes || []).flatMap(op => op.entradas || []);
  const entradasPA    = todasEntradas.filter(e => e.pa);

  return (
    <Card className="evento-card" style={{
      padding: 0, overflow: "hidden",
      background: expandido ? "#182033" : undefined,
    }}>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      {(() => {
        const n = (evento.protecoes || []).length;
        const sub = n === 0 ? "nenhuma" : n === 1 ? "1 ativa" : `${n} ativas`;
        return (
          <div
            className="evento-card-header"
            style={{ padding: "14px 16px", cursor: "pointer" }}
            onClick={() => setExpandido(v => !v)}
          >
            {/* Linha 1: seta + nome + data (desktop: data abaixo do nome) */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
              <span style={{ color: G.textDim, fontSize: 14, flexShrink: 0 }}>{expandido ? "▼" : "▶"}</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="evento-nome" style={{ fontWeight: 600, fontSize: 15 }}>{evento.nome}</div>
                {/* Data abaixo do nome — visível apenas no desktop */}
                <div className="evento-data-desktop" style={{ fontSize: 12, color: G.textDim, marginTop: 2 }}>
                  {fmtDate(evento.data)}
                </div>
              </div>
            </div>

            {/* Linha 2 (meta): data (mobile) + proteção + status + lucro */}
            <div className="evento-card-meta" style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0, marginLeft: 24 }}>
              {/* Data/hora — visível apenas no mobile */}
              {(() => {
                const parts = fmtDate(evento.data).split(" ");
                return (
                  <div className="evento-card-data" style={{ flexShrink: 0 }}>
                    <span style={{ fontSize: 12, color: G.textDim }}>{parts[0]}</span>
                    {parts[1] && <span className="evento-card-hora">{parts[1]}</span>}
                  </div>
                );
              })()}

              {/* Proteção + status sempre agrupados à direita */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
                <button
                  className="evento-protecao-btn"
                  onClick={e => { e.stopPropagation(); onAddProtecao(evento.id); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: "#8B5CF618", border: "1px solid #8B5CF644",
                    borderRadius: 7, padding: "6px 12px",
                    color: "#8B5CF6", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🛡</span>
                  <div className="evento-protecao-texto" style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.5, lineHeight: 1.2 }}>PROTEÇÃO</span>
                    <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.75, lineHeight: 1.2 }}>{sub}</span>
                  </div>
                </button>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <Badge cor={statusCor}>{statusLabel}</Badge>
                  <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 700, color: lucro >= 0 ? G.green : G.red, marginTop: 4 }}>
                    {fmt(lucro)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Conteúdo expandido ────────────────────────────────────────────── */}
      {expandido && (
        <div style={{ borderTop: `1px solid ${G.border}`, padding: "12px 16px" }}>

          {/* Painel PA */}
          {entradasPA.length > 0 && (
            <div style={{ background: "#22D3EE0a", border: "1px solid #22D3EE22", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: G.accent, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PAGAMENTO ANTECIPADO</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {[{ label: evento.mandante, key: evento.mandante }, { label: evento.visitante, key: evento.visitante }]
                  .filter(t => t.key)
                  .map(({ label, key }) => {
                    const retorno = entradasPA
                      .filter(e => (e.entradaDisplay || e.entrada) === key)
                      .reduce((s, e) => s + calcRetorno(e), 0);
                    return (
                      <div key={key} style={{ fontSize: 13 }}>
                        <span style={{ color: G.textDim }}>{label}:</span>
                        <span style={{ color: retorno > 0 ? G.accent : G.textMuted, fontWeight: 700, marginLeft: 4, fontFamily: "'Barlow Condensed'", fontSize: 15 }}>
                          {fmt(retorno)}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Proteções */}
          {(evento.protecoes || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: G.purple, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>🛡️ PROTEÇÕES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(evento.protecoes || []).map(p => {
                  const cor = p.situacao === "green" ? G.green : p.situacao === "red" ? G.red : G.textDim;
                  return (
                    <div key={p.id} style={{ background: "#FBBF2408", border: "1px solid #FBBF2433", borderRadius: 6, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: G.textDim }}>{getCasaNome(casas, p.casa)}</span>
                        <span style={{ fontSize: 12, color: G.text }}>· {p.entrada}</span>
                        <span style={{ fontSize: 12, color: G.textMuted }}>@{fmtOdd(p.odd)}</span>
                        <span style={{ fontSize: 12, color: G.textDim }}>{fmt(p.valor)}</span>
                        <span style={{ fontSize: 11, color: cor, fontWeight: 700 }}>{p.situacao.toUpperCase()}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {p.situacao === "pendente" && (
                          <>
                            <Btn size="sm" variant="success" onClick={() => onConcluirProtecao(evento.id, p.id, "green")}>✓ G</Btn>
                            <Btn size="sm" variant="danger"  onClick={() => onConcluirProtecao(evento.id, p.id, "red")}>✕ R</Btn>
                          </>
                        )}
                        <Btn size="sm" variant="danger" onClick={() => onExcluirProtecao(evento.id, p.id)}>🗑️</Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operações */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
            {(evento.operacoes || []).length === 0 && (
              <div style={{ textAlign: "center", padding: "12px", color: G.textMuted, fontSize: 13 }}>Nenhuma operação neste evento ainda.</div>
            )}
            {[...(evento.operacoes || [])].sort((a, b) => {
              const ord = { pendente: 0, parcial: 1, finalizada: 2, vazia: 3 };
              return (ord[statusOp(a)] ?? 9) - (ord[statusOp(b)] ?? 9);
            }).map((op, i) => (
              <div key={op.id}>
                <div style={{ fontSize: 11, color: G.textMuted, marginBottom: 4, fontWeight: 600 }}>OPERAÇÃO {i + 1}</div>
                <CardOperacao
                  op={op} casas={casas}
                  onEditar={() => onEditarOp(evento.id, op)}
                  onExcluir={() => onExcluirOp(evento.id, op.id)}
                  onConcluir={() => setConcluindoOp(op)}
                />
              </div>
            ))}
          </div>

          {/* Editar / Excluir evento */}
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <Btn size="sm" variant="ghost" onClick={() => onEditarEvento(evento)}>✏️ Editar</Btn>
            <Btn size="sm" variant="danger" onClick={() => onExcluirEvento(evento.id)}>🗑️</Btn>
          </div>
        </div>
      )}

      <ModalConcluirOp
        open={!!concluindoOp} onClose={() => setConcluindoOp(null)}
        op={concluindoOp} casas={casas}
        onConcluir={entradasFinal => onConcluirOp(evento.id, concluindoOp.id, entradasFinal)}
      />
    </Card>
  );
}
