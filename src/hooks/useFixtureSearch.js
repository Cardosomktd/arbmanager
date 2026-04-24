import { useState, useEffect, useRef } from "react";

/**
 * Hook para busca de jogos via /api/search-fixtures
 *
 * status: "idle" | "searching" | "done" | "error"
 */
export function useFixtureSearch() {
  const [query,    setQuery]    = useState("");
  const [fixtures, setFixtures] = useState([]);
  const [status,   setStatus]   = useState("idle");
  const timerRef = useRef(null);

  useEffect(() => {
    if (query.trim().length < 3) {
      setFixtures([]);
      setStatus("idle");
      clearTimeout(timerRef.current);
      return;
    }

    setStatus("searching");
    clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/search-fixtures?query=${encodeURIComponent(query.trim())}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Erro desconhecido");

        setFixtures(data);
        setStatus("done");
      } catch {
        setFixtures([]);
        setStatus("error");
      }
    }, 400);

    return () => clearTimeout(timerRef.current);
  }, [query]);

  function reset() {
    clearTimeout(timerRef.current);
    setQuery("");
    setFixtures([]);
    setStatus("idle");
  }

  return { query, setQuery, fixtures, status, reset };
}
