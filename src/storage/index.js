import { CASAS_DEFAULT } from "../constants/casas";
import { supabase } from "../lib/supabase";

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function defaultData() {
  return {
    casas:             CASAS_DEFAULT.map(nome => ({ id: uid(), nome, saldoInicial: 0, ativa: true })),
    eventos:           [],
    movimentos:        [],
    freebets:          [],
    freebetsAutoUsadas: [],
    apostasAvulsas:    [],
  };
}

export async function loadData(userId) {
  const { data: row, error } = await supabase
    .from("user_data")
    .select("data")
    .eq("user_id", userId)
    .single();

  // PGRST116 = nenhuma linha encontrada → usuário novo
  if (error && error.code !== "PGRST116") throw error;

  if (row) return row.data;

  // Primeira vez: inicializa com dados padrão e persiste
  const initial = defaultData();
  await saveData(userId, initial);
  return initial;
}

export async function saveData(userId, data) {
  const { error } = await supabase
    .from("user_data")
    .upsert({ user_id: userId, data }, { onConflict: "user_id" });

  if (error) throw error;
}
