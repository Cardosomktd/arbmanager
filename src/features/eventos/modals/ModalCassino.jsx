import { useState, useEffect } from "react";
import { G } from "../../../constants/colors";
import { uid } from "../../../storage";
import { Modal } from "../../../components/ui/Modal";
import { Input } from "../../../components/ui/Input";
import { Btn } from "../../../components/ui/Btn";
import { fmt } from "../../../utils/format";

// Tipos do novo fluxo
const TIPOS = [
  { value: "dinheiro_real", label: "💵 Dinheiro real" },
  { value: "bonus",         label: "🎰 Bônus"         },
];

export function ModalCassino({ open, onClose, onSalvar, casas }) {
  const [tipo,          setTipo]          = useState(null); // null = nenhum escolhido
  const [data,          setData]          = useState("");
  const [casa,          setCasa]          = useState("");
  const [descricao,     setDescricao]     = useState("");
  const [valorApostado, setValorApostado] = useState("");
  const [retorno,       setRetorno]       = useState("");
  const [valorGanho,    setValorGanho]    = useState("");
  const [erro,          setErro]          = useState("");

  // Reset completo ao fechar
  useEffect(() => {
    if (!open) {
      setTipo(null);
      setData(""); setCasa(""); setDescricao("");
      setValorApostado(""); setRetorno(""); setValorGanho("");
      setErro("");
    }
  }, [open]);

  function selecionarTipo(t) {
    setTipo(t);
    setValorApostado(""); setRetorno(""); setValorGanho("");
    setErro("");
  }

  function salvar() {
    if (!data) { setErro("Informe a data."); return; }
    if (!casa) { setErro("Selecione a casa."); return; }

    if (tipo === "dinheiro_real") {
      if (valorApostado === "") { setErro("Informe o valor apostado."); return; }
      if (retorno       === "") { setErro("Informe o retorno."); return; }
      const vAp  = parseFloat(valorApostado) || 0;
      const vRet = parseFloat(retorno)       || 0;
      const lucro = vRet - vAp;
      onSalvar({
        id:            uid(),
        tipo:          "dinheiro_real",
        tipoBeneficio: "dinheiro_real", // mantido para compatibilidade com exibição
        nome:          descricao.trim() || "Cassino — Dinheiro real",
        data, casa,
        valorApostado: vAp,
        retorno:       vRet,
        lucro,
        criadoEm: new Date().toISOString(),
      });
    } else {
      // bonus
      if (valorGanho === "") { setErro("Informe o valor ganho."); return; }
      const vG = parseFloat(valorGanho) || 0;
      onSalvar({
        id:            uid(),
        tipo:          "bonus",
        tipoBeneficio: "bonus", // mapeia para "🎰 Bônus" nos modais de detalhe
        nome:          descricao.trim() || "Cassino — Bônus",
        data, casa,
        valorApostado: 0,
        valorGanho:    vG,
        lucro:         vG,
        criadoEm: new Date().toISOString(),
      });
    }
    onClose();
  }

  // Preview de lucro calculado em tempo real
  const lucroPreview = (() => {
    if (tipo === "dinheiro_real" && valorApostado !== "" && retorno !== "") {
      return (parseFloat(retorno) || 0) - (parseFloat(valorApostado) || 0);
    }
    if (tipo === "bonus" && valorGanho !== "") {
      return parseFloat(valorGanho) || 0;
    }
    return null;
  })();

  const casasAtivas = casas.filter(c => c.ativa);

  return (
    <Modal open={open} onClose={onClose} title="🎲 Cassino" width={460}>

      {/* ── Erro ─────────────────────────────────────────────────────────────── */}
      {erro && (
        <div style={{ background: "#F8717122", border: "1px solid #F8717144", color: G.red, borderRadius: 6, padding: "8px 12px", marginBottom: 14, fontSize: 13 }}>
          {erro}
        </div>
      )}

      {/* ── Seletor de tipo (sempre visível) ─────────────────────────────────── */}
      <div style={{ display: "flex", gap: 2, background: G.surface2, borderRadius: 8, padding: 3, marginBottom: tipo ? 20 : 0 }}>
        {TIPOS.map(t => {
          const ativo = tipo === t.value;
          return (
            <button
              key={t.value}
              onClick={() => selecionarTipo(t.value)}
              style={{
                flex: 1, padding: "10px 8px", borderRadius: 6, border: "none", cursor: "pointer",
                background: ativo ? G.surface3 : "transparent",
                color: ativo ? G.text : G.textDim,
                fontSize: 13, fontWeight: ativo ? 700 : 500,
                boxShadow: ativo ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                transition: "all 0.15s",
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Campos — só aparecem após escolha ────────────────────────────────── */}
      {tipo && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Data" value={data} onChange={setData} type="date" required />
            <Input
              label="Casa"
              value={casa}
              onChange={setCasa}
              options={casasAtivas.map(c => ({ value: c.id, label: c.nome }))}
              required
            />
          </div>

          <Input
            label="Descrição (opcional)"
            value={descricao}
            onChange={setDescricao}
            placeholder={tipo === "dinheiro_real" ? "Ex: Fortune Tiger, Aviator…" : "Ex: Bônus de boas-vindas…"}
          />

          {/* ── Campos: Dinheiro real ── */}
          {tipo === "dinheiro_real" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Input label="Valor apostado (R$)" value={valorApostado} onChange={setValorApostado} type="number" placeholder="0,00" required />
              <Input label="Retorno (R$)"         value={retorno}       onChange={setRetorno}       type="number" placeholder="0,00" required />
            </div>
          )}

          {/* ── Campos: Bônus ── */}
          {tipo === "bonus" && (
            <Input label="Valor ganho (R$)" value={valorGanho} onChange={setValorGanho} type="number" placeholder="0,00" required />
          )}

          {/* ── Preview do lucro ── */}
          {lucroPreview !== null && (
            <div style={{
              background: G.surface2, borderRadius: 6, padding: "9px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              border: `1px solid ${lucroPreview >= 0 ? G.green : G.red}22`,
            }}>
              <span style={{ fontSize: 12, color: G.textDim }}>Lucro / Prejuízo</span>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontSize: 20, fontWeight: 700,
                color: lucroPreview >= 0 ? G.green : G.red,
              }}>
                {lucroPreview >= 0 ? "+" : ""}{fmt(lucroPreview)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Ações ────────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
        {tipo && <Btn onClick={salvar}>Registrar</Btn>}
      </div>
    </Modal>
  );
}
