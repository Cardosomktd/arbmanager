import { G } from "../../constants/colors";
import { fmt, fmtOdd, getCasaNome } from "../../utils/format";
import { lucroEfetivoOp } from "../../utils/calculos";
import { statusOp } from "../../utils/status";
import { resolveCategoria, CATEGORIAS } from "../../utils/categoriaOp";
import { Badge } from "../../components/ui/Badge";
import { Btn } from "../../components/ui/Btn";

// Cor da borda do card por categoria
const BORDA_CAT = {
  arbitragem:           G.border,
  procedimento_freebet: "#fbbf2433",
  extracao_freebet:     "#34D39933",
  duplo:                "#8B5CF644",
};

// ── Helper: informação da freebet gerada ──────────────────────────────────────
function getFreebetInfo(op) {
  const fb = op.geraFreebet;
  if (!fb || !(fb.valor > 0)) return null;

  const ents = op.entradas || [];
  const { condicao, entradaGatilhoId } = fb;
  let status;

  if (entradaGatilhoId) {
    const g = ents.find(e => e.id === entradaGatilhoId);
    if (!g || g.situacao === "pendente") {
      status = "aguardando";
    } else {
      status = (condicao === "qualquer" || condicao === g.situacao) ? "gerada" : "perdida";
    }
  } else {
    // Legado: avalia todas as entradas
    const concluida = ents.length > 0 && ents.every(e => e.situacao !== "pendente");
    if (!concluida) {
      status = "aguardando";
    } else {
      const temGreen = ents.some(e => e.situacao === "green");
      const ganhou   = condicao === "qualquer"
        || (condicao === "green" && temGreen)
        || (condicao === "red"   && !temGreen);
      status = ganhou ? "gerada" : "perdida";
    }
  }

  return { valor: fb.valor, status, tipoBeneficio: fb.tipoBeneficio || "freebet" };
}

// ─────────────────────────────────────────────────────────────────────────────

export function CardOperacao({ op, casas, onEditar, onExcluir, onConcluir }) {
  const st        = statusOp(op);
  const lucro     = lucroEfetivoOp(op);
  const categoria = resolveCategoria(op);
  const meta      = CATEGORIAS[categoria];
  const fbInfo    = getFreebetInfo(op);

  // Duplo Green: entradas verdes em resultados distintos
  const resultadosGreen = new Set(
    (op.entradas || [])
      .filter(e => e.situacao === "green")
      .map(e => (e.entradaDisplay || e.entrada || "").trim().toLowerCase())
  );
  const duploGreen = resultadosGreen.size >= 2;

  const statusLabel = { pendente: "Pendente", parcial: "Em andamento", finalizada: "Finalizada" }[st] ?? st;
  const statusCor   = { pendente: "yellow", parcial: "blue", finalizada: "green" }[st];

  // Cores e ícone da info de freebet
  const FB_STYLE = {
    aguardando: { cor: G.yellow,   icon: "🎯", label: "aguardando" },
    gerada:     { cor: G.green,    icon: "✅", label: "gerada"     },
    perdida:    { cor: G.textMuted, icon: "—", label: "não gerada" },
  };
  const fbStyle = fbInfo ? FB_STYLE[fbInfo.status] : null;

  return (
    <div style={{
      background: G.surface2,
      border: `1px solid ${BORDA_CAT[categoria] ?? G.border}`,
      borderRadius: 8, padding: 12,
    }}>

      {/* ── Cabeçalho da operação ─────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>

        {/* Esquerda: tipo + extras */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            {/* Badge de tipo (sempre visível, exceto arbitragem) */}
            {categoria !== "arbitragem" && (
              <Badge cor={meta.badge}>{meta.emoji} {meta.label}</Badge>
            )}
            {duploGreen && <Badge cor="green">🔥 Duplo Green</Badge>}
          </div>
          {/* Info da freebet gerada */}
          {fbInfo && fbStyle && (
            <span style={{ fontSize: 11, color: fbStyle.cor }}>
              {fbStyle.icon} {{ freebet: "Free Bet", bonus: "Bônus", cashback: "Cashback" }[fbInfo.tipoBeneficio] ?? "Free Bet"} {fmt(fbInfo.valor)} — {fbStyle.label}
            </span>
          )}
        </div>

        {/* Direita: status + botões de ação */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0, marginLeft: 8 }}>
          <Badge cor={statusCor}>{statusLabel}</Badge>
          <div style={{ display: "flex", gap: 4 }}>
            {st !== "finalizada" && (
              <>
                <Btn size="sm" variant="ghost" onClick={onEditar}>✏️</Btn>
                <Btn size="sm" variant="danger" onClick={onExcluir}>🗑️</Btn>
              </>
            )}
            {st === "finalizada" && onConcluir && (
              <Btn size="sm" variant="ghost" onClick={onConcluir}>✏️ Resultado</Btn>
            )}
            {st === "finalizada" && (
              <Btn size="sm" variant="danger" onClick={onExcluir}>🗑️</Btn>
            )}
          </div>
        </div>
      </div>

      {/* ── Chips das entradas ────────────────────────────────────────────── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        {(op.entradas || []).map(e => {
          const cor = e.situacao === "green" ? G.green : e.situacao === "red" ? G.red : G.textDim;
          return (
            <div key={e.id} style={{ background: G.surface, border: `1px solid ${G.border}`, borderRadius: 5, padding: "3px 8px", fontSize: 11 }}>
              <span style={{ color: G.textDim }}>{getCasaNome(casas, e.casa)}</span>
              <span style={{ color: G.textMuted, margin: "0 3px" }}>·</span>
              <span style={{ color: G.text }}>{e.entradaDisplay || e.entrada}</span>
              <span style={{ color: G.textMuted, margin: "0 3px" }}>@{fmtOdd(e.odd)}</span>
              <span style={{ color: cor, fontWeight: 600 }}>{e.situacao.toUpperCase()}</span>
              {e.pa && <span style={{ color: G.accent, marginLeft: 4, fontSize: 10 }}>PA</span>}
              {e.tipo !== "normal" && <span style={{ color: G.yellow, marginLeft: 4, fontSize: 10 }}>{e.tipo === "freebet" ? "FB" : "BNS"}</span>}
              {e.multipla && <span style={{ color: G.yellow, marginLeft: 4, fontSize: 10 }} title={e.multiplaDesc || ""}>MÚL</span>}
            </div>
          );
        })}
      </div>

      {/* ── Lucro + concluir ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: G.textDim }}>{st === "pendente" ? "Mín. garantido:" : "Lucro:"}</span>
          <span style={{ fontFamily: "'Barlow Condensed'", fontSize: 17, fontWeight: 700, color: lucro >= 0 ? G.green : G.red }}>{fmt(lucro)}</span>
          {st === "pendente" && <span style={{ fontSize: 10, color: G.textMuted }}>(pior cenário)</span>}
        </div>
        {(st === "pendente" || st === "parcial") && onConcluir && (
          <Btn size="sm" variant="success" onClick={onConcluir}>✓ Concluir</Btn>
        )}
      </div>
    </div>
  );
}
