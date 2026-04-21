import { lucroEfetivoOp } from "./calculos";

export function statusOp(op) {
  const ents = op.entradas || [];
  if (!ents.length) return "vazia";
  if (ents.every(e => e.situacao === "pendente")) return "pendente";
  if (ents.some(e => e.situacao === "pendente")) return "parcial";
  return "finalizada";
}

export function statusEvento(evento) {
  const ops = evento.operacoes || [];
  if (!ops.length) return "vazio";
  if (ops.every(op => statusOp(op) === "pendente")) return "pendente";
  if (ops.every(op => statusOp(op) === "finalizada")) return "finalizado";
  return "andamento";
}
