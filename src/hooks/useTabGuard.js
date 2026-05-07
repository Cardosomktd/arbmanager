// ── useTabGuard ───────────────────────────────────────────────────────────────
//
// Detecta múltiplas abas do app abertas simultaneamente via localStorage.
//
// Cada aba escreve num key próprio (edgearb_tab_<tabId>) com seu timestamp
// como heartbeat. Qualquer aba pode então varrer os keys de outras abas e
// verificar se alguma está viva.
//
// Vantagens sobre key único compartilhado:
//   - Cada aba mantém sua própria presença sem sobrescrever as outras.
//   - A detecção é bidirecional: ambas as abas se enxergam.
//   - Sem condição de corrida no write.
//
// Multi-aba: não implementamos sincronização de dados. A proteção é apenas
// visual — exibir aviso enquanto outra aba estiver ativa.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";

const KEY_PREFIX   = "edgearb_tab_";
const HEARTBEAT_MS = 3_000;   // intervalo entre heartbeats (3 s)
const DEAD_MS      = 8_000;   // aba considerada morta após 8 s sem heartbeat

// ── TAB_ID: singleton de módulo ───────────────────────────────────────────────
// Gerado UMA VEZ quando o módulo JS é carregado.
// Sobrevive a re-renders do React e à dupla-invocação do StrictMode
// (ambas as execuções do effect usam o mesmo ID, então a aba não se detecta
// como "outra aba").
const TAB_ID = Date.now().toString(36) + Math.random().toString(36).slice(2);
const MY_KEY = KEY_PREFIX + TAB_ID;

// ── Helpers de localStorage (silenciam erros em ambientes sem storage) ─────────

function writeHeartbeat() {
  try { localStorage.setItem(MY_KEY, String(Date.now())); } catch {}
}

function clearMyKey() {
  try { localStorage.removeItem(MY_KEY); } catch {}
}

// Retorna true se houver ao menos uma aba diferente com heartbeat recente.
function hasOtherAliveTab() {
  const now = Date.now();
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX) || key === MY_KEY) continue;
      const lastSeen = Number(localStorage.getItem(key));
      if (lastSeen && now - lastSeen < DEAD_MS) return true;
    }
  } catch {}
  return false;
}

// Remove keys de abas mortas para evitar acúmulo no localStorage.
function pruneDeadTabs() {
  const now     = Date.now();
  const toRemove = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX) || key === MY_KEY) continue;
      const lastSeen = Number(localStorage.getItem(key));
      if (!lastSeen || now - lastSeen >= DEAD_MS) toRemove.push(key);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

// ── Hook público ──────────────────────────────────────────────────────────────

export function useTabGuard() {
  const [otherTabActive, setOtherTabActive] = useState(false);

  useEffect(() => {
    // 1. Verifica antes de registrar a própria presença (detecção imediata)
    setOtherTabActive(hasOtherAliveTab());

    // 2. Registra esta aba
    writeHeartbeat();

    // 3. Heartbeat periódico: renova presença e re-verifica outras abas
    const interval = setInterval(() => {
      writeHeartbeat();
      pruneDeadTabs();
      setOtherTabActive(hasOtherAliveTab());
    }, HEARTBEAT_MS);

    // 4. Evento storage: detecção quase imediata quando outra aba abre/fecha
    //    (o browser dispara "storage" em todas as outras abas da mesma origem)
    function handleStorage(e) {
      if (e.key?.startsWith(KEY_PREFIX) && e.key !== MY_KEY) {
        setOtherTabActive(hasOtherAliveTab());
      }
    }
    window.addEventListener("storage", handleStorage);

    // 5. Limpa o próprio key ao fechar/recarregar a aba
    //    Isso permite que as outras abas percam o rastro desta em < 1 tick.
    function handleBeforeUnload() { clearMyKey(); }
    window.addEventListener("beforeunload", handleBeforeUnload);

    // 6. Cleanup do React (StrictMode double-invoke, desmontagem real)
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      clearMyKey();
    };
  }, []); // executa apenas uma vez por montagem

  return { otherTabActive };
}
