import { useState } from "react";
import { G } from "../../constants/colors";
import { fmt, fmtDate, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp, calcRetorno } from "../../utils/calculos";
import { statusEvento } from "../../utils/status";
import { Badge } from "../../components/ui/Badge";
import { Btn } from "../../components/ui/Btn";
import { Card } from "../../components/ui/Card";
import { CardOperacao } from "./CardOperacao";
import { ModalConcluirOp } from "./modals/ModalConcluirOp";

function lucroProtecao(p) {
  const odd   = parseFloat(String(p.odd).replace(",", ".")) || 0;
  const valor = parseFloat(p.valor) || 0;
  if (p.situacao === "green") return (odd - 1) * valor;
  if (p.situacao === "red")   return -valor;
  return 0;
}

export function CardEvento({ evento, casas, onEditarEvento, onExcluirEvento, onAddOp, onEditarOp, onExcluirOp, onConcluirOp, onAddProtecao, onConcluirProtecao, onExcluirProtecao }) {
  const [expandido, setExpandido] = useState(false);
  const [concluindoOp, setConcluindoOp] = useState(null);

  const lucroOps  = (evento.operacoes || []).reduce((s, op) => s + lucroEfetivoOp(op), 0);
  const lucroProts = (evento.protecoes || []).reduce((s, p) => {
    if (p.situacao === "pendente") return s;
    return s + lucroProtecao(p);
  }, 0);
  const lucro = lucroOps + lucroProts;

  const st = statusEvento(evento);
  const statusCor   = { vazio: "gray", pendente: "yellow", andamento: "blue", finalizado: lucro >= 0 ? "green" : "red" }[st];
  const statusLabel = { vazio: "Sem operações", pendente: "Pendente", andamento: "Em andamento", finalizado: "Finalizado" }[st];

  const todasEntradas = (evento.operacoes || []).flatMap(op => op.entradas || []);
  const entradasPA    = todasEntradas.filter(e => e.pa);

  return (
    <Card className="evento-card" style={{ padding: 0, overflow: "hidden" }}>
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div
        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        onClick={() => setExpandido(v => !v)}
      >
        {/* Nome + data */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ color: G.textDim, fontSize: 14, flexShrink: 0 }}>{expandido ? "▼" : "▶"}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{evento.nome}</div>
            <div style={{ fontSize: 12, color: G.textDim }}>{fmtDate(evento.data)}</div>
          </div>
        </div>

        {/* Ações rápidas + status + lucro */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, marginLeft: 12 }}>
          {/* Botões de ação rápida — stopPropagation para não colapsar o card */}
          <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
            <Btn size="sm" onClick={() => onAddOp(evento.id)}>+ Op</Btn>
            <Btn size="sm" variant="secondary" onClick={() => onAddProtecao(evento.id)}>🛡️</Btn>
          </div>
          {/* Status + lucro */}
          <div style={{ textAlign: "right" }}>
            <Badge cor={statusCor}>{statusLabel}</Badge>
            <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 700, color: lucro >= 0 ? G.green : G.red, marginTop: 4 }}>
              {fmt(lucro)}
            </div>
          </div>
        </div>
      </div>

      {/* ── Conteúdo expandido ────────────────────────────────────────────── */}
      {expandido && (
        <div style={{ borderTop: `1px solid ${G.border}`, padding: "12px 16px" }}>

          {/* Painel PA */}
          {entradasPA.length > 0 && (
            <div style={{ background: "#00d4ff0a", border: "1px solid #00d4ff22", borderRadius: 8, padding: "10px 14px", marginBottom: 12 }}>
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
              <div style={{ fontSize: 11, color: G.yellow, fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>🛡️ PROTEÇÕES</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(evento.protecoes || []).map(p => {
                  const cor = p.situacao === "green" ? G.green : p.situacao === "red" ? G.red : G.textDim;
                  return (
                    <div key={p.id} style={{ background: "#ffd60008", border: "1px solid #ffd60033", borderRadius: 6, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: G.textDim }}>{getCasaNome(casas, p.casa)}</span>
                        <span style={{ fontSize: 12, color: G.text }}>· {p.entrada}</span>
                        <span style={{ fontSize: 12, color: G.textMuted }}>@{p.odd}</span>
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
            {(evento.operacoes || []).map((op, i) => (
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
