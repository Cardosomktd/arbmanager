import { useState, useEffect, useRef, useCallback } from "react";
import { loadData, saveData } from "../storage";

const DEBOUNCE_MS = 500;

// saveStatus: "idle" | "unsaved" | "saving" | "saved" | "error"
export function useAppData(userId) {
  const [data,       setDataRaw]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");

  const isDirtyRef    = useRef(false);
  const userIdRef     = useRef(userId);
  const latestDataRef = useRef(null);

  userIdRef.current = userId;

  // ── beforeunload: bloqueia saída quando há alterações não salvas ─────────────
  //
  // NÃO tenta save assíncrono aqui — o browser cancela Promises durante a
  // navegação, então saveData() dentro de beforeunload é ineficaz.
  //
  // Estratégia adotada: exibir o diálogo nativo do browser ("Sair da página?")
  // quando isDirtyRef for true. Isso impede a saída imediata e dá ao usuário
  // a chance de cancelar e esperar o indicador "Salvo" aparecer antes de sair.
  //
  // Multi-aba: não implementado — cada aba mantém snapshot independente do
  // Supabase. Última aba a salvar vence (last-write-wins). Para evitar
  // corrupção, não use o app em duas abas simultaneamente.
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!isDirtyRef.current) return; // sem alterações pendentes → sai normalmente
      e.preventDefault();
      e.returnValue = ""; // Chrome/Edge requerem esta linha para exibir o diálogo
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Carregamento inicial ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    isDirtyRef.current    = false;
    latestDataRef.current = null;
    setSaveStatus("idle");
    setLoading(true);
    setError(null);
    setDataRaw(null);

    loadData(userId)
      .then(d => {
        latestDataRef.current = d;
        setDataRaw(d);
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  }, [userId]);

  // ── Auto-save com debounce ───────────────────────────────────────────────────
  // Usa latestDataRef.current para garantir o dado mais recente mesmo em
  // mutações rápidas. setSaveStatus("saving") é chamado dentro do setTimeout,
  // não no início do efeito, para evitar um render extra antes do save começar.
  useEffect(() => {
    if (!isDirtyRef.current || !userId || data === null) return;

    const timer = setTimeout(() => {
      setSaveStatus("saving");
      saveData(userId, latestDataRef.current)
        .then(() => {
          isDirtyRef.current = false;
          setSaveStatus("saved");
        })
        .catch(e => {
          setError(`Erro ao salvar: ${e.message}`);
          setSaveStatus("error");
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [data, userId]);

  // ── setData público ──────────────────────────────────────────────────────────
  const setData = useCallback((fn) => {
    isDirtyRef.current = true;
    setSaveStatus("unsaved");
    setDataRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      latestDataRef.current = next;
      return next;
    });
  }, []);

  return { data, setData, loading, error, saveStatus };
}
