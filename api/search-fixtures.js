/**
 * Vercel Serverless Function — /api/search-fixtures?query=arsenal
 *
 * Usa TheSportsDB (plano free, key pública "3"):
 *   1. searchteams.php?t={query}   — busca e filtra times pelo nome
 *   2. eventsnext.php?id={teamId}  — próximos jogos de cada time
 *   3. Filtra eventos: só mantém jogos onde o time é mandante ou visitante
 */

const BASE = "https://www.thesportsdb.com/api/v1/json/3";

// Normaliza: lowercase + sem acentos + trim
function norm(str) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Verifica se os dois textos se contêm mutuamente
function matches(a, b) {
  const na = norm(a);
  const nb = norm(b);
  return na.length > 0 && nb.length > 0 && (na.includes(nb) || nb.includes(na));
}

// Converte "YYYY-MM-DD" + "HH:MM:SS+00:00" (UTC) → horário de Brasília
function toBrasilia(dateStr, timeStr) {
  const rawTime = (timeStr || "00:00:00").replace(/\+.*$/, "").trim();
  const isoUtc  = `${dateStr}T${rawTime}Z`;
  const dt      = new Date(isoUtc);

  if (isNaN(dt.getTime())) return { date: dateStr, time: "", rawDate: isoUtc };

  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Sao_Paulo",
    year:  "numeric", month:  "2-digit", day:    "2-digit",
    hour:  "2-digit", minute: "2-digit", hour12: false,
  });

  const parts = Object.fromEntries(
    fmt.formatToParts(dt).map((p) => [p.type, p.value])
  );

  return {
    date:    `${parts.year}-${parts.month}-${parts.day}`,
    time:    `${parts.hour}:${parts.minute}`,
    rawDate: isoUtc,
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { query, debug } = req.query;
  const isDebug = debug === "1";

  if (!query || query.trim().length < 3) {
    return res.status(400).json({ error: "Query muito curta (mín. 3 caracteres)" });
  }

  try {
    // ── 1. Buscar times pelo nome ────────────────────────────
    const teamsRes  = await fetch(`${BASE}/searchteams.php?t=${encodeURIComponent(query.trim())}`);
    const teamsData = await teamsRes.json();
    const teams     = teamsData.teams || [];

    if (teams.length === 0) {
      if (isDebug) return res.json({ step: "teams", result: "empty", rawTeamsResponse: teamsData });
      return res.json([]);
    }

    // Filtra times cujo nome contém a query; exatos primeiro
    const q        = query.trim();
    const relevant = teams
      .filter((t) => norm(t.strTeam).includes(norm(q)))
      .sort((a, b) => (norm(a.strTeam) === norm(q) ? -1 : 1));

    if (relevant.length === 0) {
      if (isDebug) return res.json({ step: "filter", result: "no_relevant_teams", allTeamNames: teams.map((t) => t.strTeam) });
      return res.json([]);
    }

    const topTeams = relevant.slice(0, 3);

    // ── 2. Buscar próximos jogos de cada time ─────────────────
    const fixtureResults = await Promise.all(
      topTeams.map((t) =>
        fetch(`${BASE}/eventsnext.php?id=${t.idTeam}`).then((r) => r.json())
      )
    );

    // ── 3. Filtrar, normalizar e deduplicar ───────────────────
    // Só mantém eventos onde o time buscado é mandante ou visitante.
    const debugDiscarded = [];
    const fixtures = [];
    const seen     = new Set();

    for (let i = 0; i < fixtureResults.length; i++) {
      const teamName = topTeams[i].strTeam;
      const events   = fixtureResults[i].events || [];

      for (const ev of events) {
        if (seen.has(ev.idEvent)) continue;

        const homeMatch = matches(ev.strHomeTeam, teamName);
        const awayMatch = matches(ev.strAwayTeam, teamName);

        if (!homeMatch && !awayMatch) {
          if (isDebug) debugDiscarded.push({
            team:        teamName,
            strEvent:    ev.strEvent,
            strHomeTeam: ev.strHomeTeam,
            strAwayTeam: ev.strAwayTeam,
          });
          continue;
        }

        seen.add(ev.idEvent);

        const { date, time, rawDate } = toBrasilia(ev.dateEvent, ev.strTime);

        fixtures.push({
          id:      ev.idEvent,
          home:    ev.strHomeTeam,
          away:    ev.strAwayTeam,
          date,
          time,
          league:  ev.strLeague || "",
          rawDate,
        });
      }
    }

    fixtures.sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate));
    const normalized = fixtures.slice(0, 12);

    // ── Debug ─────────────────────────────────────────────────
    if (isDebug) {
      return res.json({
        query,
        teamsCount:    teams.length,
        relevantCount: relevant.length,
        selectedTeams: topTeams.map((t) => ({ id: t.idTeam, name: t.strTeam, country: t.strCountry })),
        fixturesByTeam: fixtureResults.map((result, i) => ({
          teamId:    topTeams[i].idTeam,
          teamName:  topTeams[i].strTeam,
          rawCount:  (result.events || []).length,
          events: (result.events || []).map((ev) => ({
            strEvent:    ev.strEvent,
            strHomeTeam: ev.strHomeTeam,
            strAwayTeam: ev.strAwayTeam,
            dateEvent:   ev.dateEvent,
            strLeague:   ev.strLeague,
          })),
        })),
        beforeFilter:  fixtures.length + debugDiscarded.length,
        afterFilter:   normalized.length,
        discarded:     debugDiscarded,
        normalized,
      });
    }

    return res.json(normalized);

  } catch (err) {
    console.error("Erro na busca de jogos:", err.message);
    if (isDebug) return res.status(500).json({ error: err.message, stack: err.stack });
    return res.status(500).json({ error: "Não foi possível buscar jogos agora" });
  }
}
