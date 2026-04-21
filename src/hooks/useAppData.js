import { useState, useEffect, useRef, useCallback } from "react";
import { loadData, saveData } from "../storage";

const DEBOUNCE_MS = 500;

export function useAppData(userId) {
  const [data,    setDataRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const isDirtyRef    = useRef(false);
  const userIdRef     = useRef(userId);
  const latestDataRef = useRef(null);

  userIdRef.current = userId;

  // ── beforeunload: best-effort ────────────────────────────
  useEffect(() => {
    function handleBeforeUnload() {
      if (!isDirtyRef.current || !userIdRef.current || !latestDataRef.current) return;
      saveData(userIdRef.current, latestDataRef.current).catch(() => {});
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Carregamento inicial ─────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    isDirtyRef.current    = false;
    latestDataRef.current = null;
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

  // ── Auto-save com debounce ───────────────────────────────
  // Usa latestDataRef.current em vez do `data` do closure
  // para evitar salvar estado stale em caso de múltiplas mutações rápidas.
  useEffect(() => {
    if (!isDirtyRef.current || !userId || data === null) return;

    const timer = setTimeout(() => {
      saveData(userId, latestDataRef.current)
        .then(() => { isDirtyRef.current = false; })
        .catch(e  => setError(`Erro ao salvar: ${e.message}`));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [data, userId]);

  // ── setData público ──────────────────────────────────────
  const setData = useCallback((fn) => {
    isDirtyRef.current = true;
    setDataRaw(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      latestDataRef.current = next;
      return next;
    });
  }, []);

  return { data, setData, loading, error };
}
