import { useState } from "react";
import { G } from "../../constants/colors";
import iconBingo   from "../../assets/icons/Bingo.svg";
import iconCassino from "../../assets/icons/Cassino.svg";
import { fmt, fmtDate, fmtOdd, getCasaNome } from "../../utils/format";
import { lucroAvulsa } from "../../utils/lucroAvulsa";
import { statusEvento } from "../../utils/status";
import { getFreebets } from "../../utils/freebets";
import { Badge } from "../../components/ui/Badge";
import { Btn } from "../../components/ui/Btn";
import { Card } from "../../components/ui/Card";
import { CardEvento } from "./CardEvento";
import { ModalEvento } from "./modals/ModalEvento";
import { ModalOperacao } from "./modals/ModalOperacao";
import { ModalApostaAvulsa } from "./modals/ModalApostaAvulsa";
import { ModalCassino } from "./modals/ModalCassino";
import { ModalProtecao } from "./modals/ModalProtecao";
import { ModalSelecionarEvento } from "../dashboard/modals/ModalSelecionarEvento";
import { lucroCassino } from "../../utils/lucroCassino";

export function TelaEventos({ data, setData }) {
  const [modalSel,         setModalSel]         = useState(false);
  const [modalEvento,      setModalEvento]      = useState(false);
  const [editEvento,       setEditEvento]       = useState(null);
  const [modalOp,          setModalOp]          = useState(false);
  const [editOp,           setEditOp]           = useState(null);
  const [eventoAlvoId,     setEventoAlvoId]     = useState(null);
  const [modalAvulsa,      setModalAvulsa]      = useState(false);
  const [modalCassino,     setModalCassino]     = useState(false);
  const [modalProtecao,    setModalProtecao]    = useState(false);
  const [eventoProtecaoId, setEventoProtecaoId] = useState(null);
  const [filtroStatus,     setFiltroStatus]     = useState("pendentes"); // "pendentes" | "concluidos"
  const [busca,            setBusca]            = useState("");

  // ── Eventos ──────────────────────────────────────────────────────────────────
  function salvarEvento(ev) {
    const isNovo = !data.eventos.find(e => e.id === ev.id);
    setData(d => {
      const existe = d.eventos.find(e => e.id === ev.id);
      return { ...d, eventos: existe ? d.eventos.map(e => e.id === ev.id ? { ...e, ...ev } : e) : [...d.eventos, ev] };
    });
    // Novo evento: abre automaticamente o modal de primeira operação
    if (isNovo) {
      setEventoAlvoId(ev.id);
      setEditOp(null);
      setModalOp(true);
    }
  }
  function excluirEvento(id) {
    if (confirm("Excluir este evento e todas as operações?"))
      setData(d => ({ ...d, eventos: d.eventos.filter(e => e.id !== id) }));
  }

  // ── Operações ─────────────────────────────────────────────────────────────────
  function abrirNovaOp(eventoId)       { setEventoAlvoId(eventoId); setEditOp(null); setModalOp(true); }
  function abrirEditarOp(eventoId, op) { setEventoAlvoId(eventoId); setEditOp(op);  setModalOp(true); }

  // ── Fluxo "Nova Operação" (modal seleção → operação) ──────────────────────────
  function handleSelecionarEventoParaOp(ev) {
    setModalSel(false);
    abrirNovaOp(ev.id);
  }
  function handleCriarNovoEventoParaOp() {
    setModalSel(false);
    setEditEvento(null);
    setModalEvento(true);
  }

  function salvarOp(op) {
    setData(d => {
      // ── Baixa de freebets ──────────────────────────────────────────────────
      let freebets = d.freebets || [];
      const freebetsAutoUsadas = [...(d.freebetsAutoUsadas || [])];

      for (const e of (op.entradas || [])) {
        // ── Multi-freebet (freebetIds array) ──────────────────────────────────
        if ((e.freebetIds || []).length > 0) {
          const ids = e.freebetIds;

          // ① Auto-geradas (de procedimento_freebet): apenas marca como usadas
          //    Não existem em d.freebets — baixa de saldo não se aplica
          for (const fid of ids) {
            if (String(fid).startsWith("auto_")) freebetsAutoUsadas.push(fid);
          }

          // ② Manuais: consumo sequencial até cobrir o valor da entrada
          const manualIds = ids.filter(fid => !String(fid).startsWith("auto_"));
          if (manualIds.length > 0) {
            let restante = parseFloat(e.valor) || 0;
            for (const fid of manualIds) {
              freebets = freebets.map(f => {
                if (f.id !== fid) return f;
                const saldoAtual = f.saldo ?? f.valor ?? 0;
                const usado     = Math.min(saldoAtual, restante);
                restante -= usado;
                const novoSaldo = saldoAtual - usado;
                return { ...f, saldo: novoSaldo, usada: f.tipo === "acumulada" ? false : novoSaldo <= 0 };
              });
            }
          }
          // ③ "Freebet não cadastrada": cobre o restante sem baixa no estoque

          continue; // já tratado — não cai no bloco legado abaixo
        }

        // ── Legado single freebetId (incl. acumulada injetada) ────────────────
        if (!e.freebetId || e.freebetManual) continue;
        if (e.freebetId.startsWith("auto_")) {
          // Freebet automática: marca como usada integralmente (sem saldo parcial)
          freebetsAutoUsadas.push(e.freebetId);
        } else {
          // Freebet manual: baixa parcial — subtrai valorUsado do saldo
          freebets = freebets.map(f => {
            if (f.id !== e.freebetId) return f;
            const saldoAtual  = f.saldo ?? f.valor ?? 0;
            const valorUsado  = parseFloat(e.freebetValorUsado) || saldoAtual; // vazio → usa tudo
            const novoSaldo   = Math.max(0, saldoAtual - valorUsado);
            // Acumulada: saldo pode zerar mas nunca marca como usada (carteira permanente)
            return { ...f, saldo: novoSaldo, usada: f.tipo === "acumulada" ? false : novoSaldo <= 0 };
          });
        }
      }

      // ── Baixa de bônus ─────────────────────────────────────────────────────
      let bonus = d.bonus || [];
      for (const e of (op.entradas || [])) {
        if (!e.bonusId || e.bonusManual) continue;
        bonus = bonus.map(b => {
          if (b.id !== e.bonusId) return b;
          const saldoAtual = b.saldo ?? b.valor ?? 0;
          const valorUsado = parseFloat(e.bonusValorUsado) || saldoAtual;
          const novoSaldo  = Math.max(0, saldoAtual - valorUsado);
          return { ...b, saldo: novoSaldo, usada: b.tipo === "acumulada" ? false : novoSaldo <= 0 };
        });
      }

      return {
        ...d,
        eventos: d.eventos.map(ev => ev.id !== eventoAlvoId ? ev : {
          ...ev,
          operacoes: editOp
            ? ev.operacoes.map(o => o.id === op.id ? op : o)
            : [...(ev.operacoes || []), op],
        }),
        freebets,
        freebetsAutoUsadas: [...new Set(freebetsAutoUsadas)],
        bonus,
      };
    });
  }
  function excluirOp(eventoId, opId) {
    const ev  = (data.eventos || []).find(e => e.id === eventoId);
    const op  = (ev?.operacoes || []).find(o => o.id === opId);
    const concluida = (op?.entradas || []).every(e => e.situacao !== "pendente") && (op?.entradas || []).length > 0;
    const msg = concluida
      ? "Excluir esta operação concluída?\n\nO lucro e as freebets geradas por ela serão removidos do evento."
      : "Excluir esta operação?";
    if (confirm(msg))
      setData(d => ({
        ...d,
        eventos: d.eventos.map(e => e.id !== eventoId ? e : { ...e, operacoes: e.operacoes.filter(o => o.id !== opId) }),
      }));
  }
  function concluirOp(eventoId, opId, entradasFinal) {
    setData(d => ({
      ...d,
      eventos: d.eventos.map(ev => ev.id !== eventoId ? ev : {
        ...ev,
        operacoes: ev.operacoes.map(op => op.id !== opId ? op : { ...op, entradas: entradasFinal }),
      }),
    }));
  }

  // ── Proteções ─────────────────────────────────────────────────────────────────
  function salvarProtecao(protecao) {
    setData(d => ({
      ...d,
      eventos: d.eventos.map(ev => ev.id !== eventoProtecaoId ? ev : {
        ...ev, protecoes: [...(ev.protecoes || []), protecao],
      }),
    }));
  }
  function concluirProtecao(eventoId, protecaoId, situacao) {
    setData(d => ({
      ...d,
      eventos: d.eventos.map(ev => ev.id !== eventoId ? ev : {
        ...ev, protecoes: (ev.protecoes || []).map(p => p.id !== protecaoId ? p : { ...p, situacao }),
      }),
    }));
  }
  function excluirProtecao(eventoId, protecaoId) {
    if (confirm("Excluir esta proteção?"))
      setData(d => ({
        ...d,
        eventos: d.eventos.map(ev => ev.id !== eventoId ? ev : {
          ...ev, protecoes: (ev.protecoes || []).filter(p => p.id !== protecaoId),
        }),
      }));
  }

  // ── Apostas avulsas ───────────────────────────────────────────────────────────
  function salvarAposta(aposta) {
    setData(d => ({ ...d, apostasAvulsas: [...(d.apostasAvulsas || []), aposta] }));
  }
  function excluirAvulsa(id) {
    if (confirm("Excluir esta aposta?"))
      setData(d => ({ ...d, apostasAvulsas: (d.apostasAvulsas || []).filter(a => a.id !== id) }));
  }
  function concluirAvulsa(id, situacao) {
    setData(d => ({ ...d, apostasAvulsas: (d.apostasAvulsas || []).map(a => a.id !== id ? a : { ...a, situacao }) }));
  }

  // ── Cassinos ─────────────────────────────────────────────────────────────────
  function salvarCassino(cassino) {
    setData(d => ({ ...d, cassinos: [...(d.cassinos || []), cassino] }));
  }
  function excluirCassino(id) {
    if (confirm("Excluir este registro de cassino?"))
      setData(d => ({ ...d, cassinos: (d.cassinos || []).filter(c => c.id !== id) }));
  }

  // ── Alertas: eventos atrasados (2h+ com ops pendentes) ───────────────────────
  const agora = new Date();
  const alertasAtraso = (data.eventos || []).filter(ev => {
    if (!ev.data || !ev.data.includes("T")) return false; // sem horário, não alertar
    const diff = (agora - new Date(ev.data)) / (1000 * 60 * 60);
    if (diff < 2) return false;
    const st = statusEvento(ev);
    return st === "pendente" || st === "andamento";
  });

  // ── Filtro e busca ────────────────────────────────────────────────────────────
  const ativo = (st) => st === "vazio" || st === "pendente" || st === "andamento";
  const buscaLC = busca.toLowerCase();

  const eventosFiltrados = [...(data.eventos || [])]
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .filter(ev => {
      const passaStatus = filtroStatus === "pendentes" ? ativo(statusEvento(ev)) : statusEvento(ev) === "finalizado";
      const passaBusca  = !busca || ev.nome.toLowerCase().includes(buscaLC);
      return passaStatus && passaBusca;
    });

  const avulsasFiltradas = [...(data.apostasAvulsas || [])]
    .sort((a, b) => new Date(a.data) - new Date(b.data))
    .filter(a => {
      const passaStatus = filtroStatus === "pendentes" ? a.situacao === "pendente" : a.situacao !== "pendente";
      const passaBusca  = !busca || a.nome.toLowerCase().includes(buscaLC);
      return passaStatus && passaBusca;
    });

  // Cassinos: sempre aparecem nos concluídos (não têm estado pendente)
  const cassinosFiltrados = filtroStatus === "concluidos"
    ? [...(data.cassinos || [])].filter(c => !busca || c.nome.toLowerCase().includes(buscaLC))
    : [];

  const lancamentos = [
    ...eventosFiltrados.map(e => ({ tipo: "evento",  item: e })),
    ...avulsasFiltradas.map(a => ({ tipo: "avulsa",  item: a })),
    ...cassinosFiltrados.map(c => ({ tipo: "cassino", item: c })),
  ].sort((a, b) => filtroStatus === "concluidos"
    ? new Date(b.item.data) - new Date(a.item.data)   // mais recente primeiro
    : new Date(a.item.data) - new Date(b.item.data));  // mais próximo primeiro

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>

      {/* ── Cabeçalho ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 28, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", color: G.text }}>
          Lançamentos
        </div>
        <div className="lancamentos-acoes" style={{ display: "flex", alignItems: "stretch", gap: 8, height: 42 }}>
          <Btn variant="ghost" onClick={() => setModalAvulsa(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px", height: "100%" }}>
            <img src={iconBingo} alt="" width={18} height={18} style={{ display: "block", flexShrink: 0 }} />
            Bingo
          </Btn>
          <img
            src={iconCassino} alt="Cassino"
            onClick={() => setModalCassino(true)}
            style={{ display: "block", height: "80%", width: "auto", cursor: "pointer", alignSelf: "center" }}
          />
          <Btn onClick={() => setModalSel(true)} style={{ padding: "0 14px", height: "100%" }}>+ Nova Operação</Btn>
        </div>
      </div>

      {/* ── Filtro + busca ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3 }}>
          {[{ id: "pendentes", label: "Pendentes" }, { id: "concluidos", label: "Concluídos" }].map(f => (
            <button key={f.id} onClick={() => setFiltroStatus(f.id)} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer",
              background: filtroStatus === f.id ? G.accent : "transparent",
              color: filtroStatus === f.id ? "#fff" : G.textDim,
              fontSize: 13, fontWeight: filtroStatus === f.id ? 700 : 500,
              boxShadow: filtroStatus === f.id ? `0 2px 8px ${G.accent}55` : "none",
              transition: "all 0.15s",
            }}>
              {f.label}
            </button>
          ))}
        </div>
        <input
          value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="🔍 Buscar evento..."
          style={{ background: G.surface2, border: `1px solid ${G.border}`, borderRadius: 6, padding: "8px 12px", color: G.text, fontSize: 13, outline: "none", flex: 1, minWidth: 160 }}
        />
      </div>

      {/* ── Lista ── */}
      {lancamentos.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48, color: G.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🏟️</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {busca ? "Nenhum resultado para a busca" : filtroStatus === "pendentes" ? "Nenhum lançamento pendente" : "Nenhum lançamento concluído"}
          </div>
          <div style={{ fontSize: 12 }}>
            {!busca && filtroStatus === "concluidos" && "Conclua operações para vê-las aqui."}
            {!busca && filtroStatus === "pendentes" && "Crie um evento para arbitragem ou registre uma aposta avulsa."}
          </div>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {lancamentos.map(({ tipo, item }) => {
          if (tipo === "evento") return (
            <CardEvento key={item.id} evento={item} casas={data.casas || []}
              atrasado={alertasAtraso.some(a => a.id === item.id)}
              onEditarEvento={e => { setEditEvento(e); setModalEvento(true); }}
              onExcluirEvento={excluirEvento}
              onEditarOp={abrirEditarOp}
              onExcluirOp={excluirOp}
              onConcluirOp={concluirOp}
              onAddProtecao={id => { setEventoProtecaoId(id); setModalProtecao(true); }}
              onConcluirProtecao={concluirProtecao}
              onExcluirProtecao={excluirProtecao}
            />
          );

          // Cassino
          if (tipo === "cassino") {
            const c = item;
            const lucro = lucroCassino(c);
            const tipoLabel = { giros: "🎡 Giros", bonus: "🎰 Bônus", cashback: "💰 Cashback" }[c.tipoBeneficio] ?? "🎲";
            return (
              <Card key={c.id} style={{ border: "1px solid #34D39922" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <Badge cor="green">🎲 Cassino</Badge>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{c.nome}</span>
                    </div>
                    <div style={{ fontSize: 12, color: G.textDim, marginBottom: 4 }}>{fmtDate(c.data)}</div>
                    <div style={{ fontSize: 12 }}>
                      <span style={{ color: G.textDim }}>{getCasaNome(data.casas || [], c.casa)}</span>
                      <span style={{ color: G.textMuted, margin: "0 4px" }}>·</span>
                      <span style={{ color: G.text }}>{tipoLabel}</span>
                      {c.valorApostado > 0 && <><span style={{ color: G.textMuted, margin: "0 4px" }}>·</span><span style={{ color: G.textDim }}>apostado: {fmt(c.valorApostado)}</span></>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700, color: lucro >= 0 ? G.green : G.red }}>{fmt(lucro)}</div>
                    <Btn size="sm" variant="danger" onClick={() => excluirCassino(c.id)}>🗑️</Btn>
                  </div>
                </div>
              </Card>
            );
          }

          // Aposta avulsa
          const a = item;
          const cor              = a.situacao === "green" ? G.green : a.situacao === "red" ? G.red : G.yellow;
          const retornoPotencial = (parseFloat(String(a.odd).replace(",", ".")) || 0) * (parseFloat(a.valor) || 0);
          const retorno          = a.situacao === "green" ? retornoPotencial
                                 : a.situacao === "red"   ? -(parseFloat(a.valor) || 0) : 0;

          return (
            <Card key={a.id} style={{ border: "1px solid #8B5CF633" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <Badge cor="purple">{a.subtipo === "bingo" ? "🎰 Bingo" : "Aposta"}</Badge>
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{a.nome}</span>
                  </div>
                  <div style={{ fontSize: 12, color: G.textDim, marginBottom: 4 }}>{fmtDate(a.data)}</div>
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: G.textDim }}>{getCasaNome(data.casas || [], a.casa)}</span>
                    {a.entrada && <><span style={{ color: G.textMuted, margin: "0 4px" }}>·</span><span style={{ color: G.text }}>{a.entrada}</span></>}
                    <span style={{ color: G.textMuted, margin: "0 4px" }}>@{fmtOdd(a.odd)}</span>
                    <span style={{ color: G.textDim }}>{fmt(a.valor)}</span>
                    <span style={{ color: cor, fontWeight: 700, marginLeft: 6 }}>{a.situacao.toUpperCase()}</span>
                    <span style={{ color: G.textMuted, margin: "0 4px" }}>·</span>
                    <span style={{ color: G.textDim }}>Retorno: {fmt(retornoPotencial)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {a.situacao !== "pendente" && (
                    <div style={{ fontFamily: "'Barlow Condensed'", fontSize: 18, fontWeight: 700, color: retorno >= 0 ? G.green : G.red }}>{fmt(retorno)}</div>
                  )}
                  {a.situacao === "pendente" && (
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn size="sm" variant="success" onClick={() => concluirAvulsa(a.id, "green")}>✓ Green</Btn>
                      <Btn size="sm" variant="danger"  onClick={() => concluirAvulsa(a.id, "red")}>✕ Red</Btn>
                    </div>
                  )}
                  <Btn size="sm" variant="danger" onClick={() => excluirAvulsa(a.id)}>🗑️</Btn>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <ModalSelecionarEvento
        open={modalSel}
        onClose={() => setModalSel(false)}
        eventos={data.eventos || []}
        onSelecionarEvento={handleSelecionarEventoParaOp}
        onCriarNovoEvento={handleCriarNovoEventoParaOp}
      />
      <ModalEvento       open={modalEvento}   onClose={() => setModalEvento(false)}   onSalvar={salvarEvento}  editEvento={editEvento} eventosList={data.eventos || []} />
      <ModalOperacao
        open={modalOp} onClose={() => setModalOp(false)} onSalvar={salvarOp}
        casas={data.casas || []} editOp={editOp}
        evento={(data.eventos || []).find(e => e.id === eventoAlvoId)}
        freebetsDisponiveis={getFreebets(data).filter(f => !f.usada)}
        bonusDisponiveis={(data.bonus || []).filter(b => !b.usada)}
      />
      <ModalApostaAvulsa open={modalAvulsa}   onClose={() => setModalAvulsa(false)}   onSalvar={salvarAposta}  casas={data.casas || []} />
      <ModalCassino      open={modalCassino}  onClose={() => setModalCassino(false)}  onSalvar={salvarCassino} casas={data.casas || []} />
      <ModalProtecao     open={modalProtecao} onClose={() => setModalProtecao(false)} onSalvar={salvarProtecao} casas={data.casas || []} evento={(data.eventos || []).find(e => e.id === eventoProtecaoId)} />
    </div>
  );
}
