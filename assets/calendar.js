(function () {
  const fallbackData = {
    season: "Temporada por confirmar",
    updated: "",
    nextMatch: null,
    matches: [],
    standings: [],
  };

  let calendarData = fallbackData;
  let activeScope = "centinela"; // 'centinela' (predeterminado) | 'all'
  let activeFilter = "all";       // 'all' | 'upcoming' | 'finished'
  let activeJornada = "all";      // 'all' | 1..30

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isCentinela(team) {
    return String(team || "").toLowerCase().includes("centinela");
  }

  const TEAM_SHIELDS = {
    'centinela': '/assets/img/escudo-centinela.webp',
    'portezuelo': '/assets/img/teams/portezuelo.webp',
    'perdoma': '/assets/img/teams/atletico-perdoma-b.webp',
    'silense': '/assets/img/teams/cd-juventud-silense.webp',
    'tegueste': '/assets/img/teams/afb-tegueste.webp',
    'buenavista': '/assets/img/teams/cd-buenavista.webp',
    'once piratas': '/assets/img/teams/cd-once-piratas.webp',
    'piratas': '/assets/img/teams/cd-once-piratas.webp',
    'san diego': '/assets/img/teams/cd-san-diego.webp',
    'san jer': '/assets/img/teams/cd-san-jeronimo.webp',
    'interi': '/assets/img/teams/cd-juventud-interian.webp',
    'gara': '/assets/img/teams/rcd-gara.webp',
    'ravelo': '/assets/img/teams/sd-ravelo-b.webp',
    'tacoronte c': '/assets/img/teams/tacoronte-cf.webp',
    'matanza': '/assets/img/teams/ud-matanza.webp',
    'tacoronte': '/assets/img/teams/ud-tacoronte.webp',
    'vistalm': '/assets/img/teams/vlm-fc.webp',
    'vlm': '/assets/img/teams/vlm-fc.webp'
  };

  function getTeamLogo(team, customLogo) {
    if (customLogo) return customLogo;
    const lower = String(team || '').toLowerCase();
    for (const [key, path] of Object.entries(TEAM_SHIELDS)) {
      if (lower.includes(key)) return path;
    }
    return '';
  }

  function teamMark(team, customLogo) {
    const logoUrl = getTeamLogo(team, customLogo);
    if (logoUrl) {
      return `<img src="${logoUrl}" alt="${escapeHtml(team)}" class="team-shield-hero h-20 w-20 md:h-24 md:w-24 object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">`;
    }
    const initials = String(team || "Rival")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return `<span class="grid h-20 w-20 md:h-24 md:w-24 place-items-center rounded-full border border-white/10 bg-white/5 font-heading text-xl font-black text-gray-300">${escapeHtml(initials)}</span>`;
  }

  function renderNextMatch(match) {
    const card = document.getElementById("nextMatchCard");
    if (!card || !match) return;
    card.innerHTML = `
      <div class="border-b border-white/10 px-6 py-4 text-center">
        <p class="text-xs font-black tracking-[0.22em] text-brand-neon uppercase">${escapeHtml(match.round || "Próximo partido")}</p>
      </div>
      <div class="p-6 md:p-10">
        <div class="mb-7 text-center">
          <p class="text-sm font-bold text-white">${escapeHtml(match.date || "Fecha por confirmar")}${match.time ? ` · ${escapeHtml(match.time)}` : ""}</p>
          <p class="mt-2 text-sm text-gray-400">${escapeHtml(match.venue || "Campo por confirmar")}</p>
        </div>
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8">
          <div class="flex min-w-0 flex-col items-center gap-3 text-center">
            ${teamMark(match.home, match.homeLogo)}
            <span class="font-heading text-lg font-black text-white md:text-2xl">${escapeHtml(match.home || "Local")}</span>
          </div>
          <div class="rounded-xl border border-brand-neon/30 bg-brand-neon/10 px-4 py-3 font-heading text-xl font-black text-brand-neon">VS</div>
          <div class="flex min-w-0 flex-col items-center gap-3 text-center">
            ${teamMark(match.away, match.awayLogo)}
            <span class="font-heading text-lg font-black text-white md:text-2xl">${escapeHtml(match.away || "Visitante")}</span>
          </div>
        </div>
      </div>
    `;
  }

  function matchStatus(match) {
    if (match.status === "finished") return "Finalizado";
    if (match.status === "postponed") return "Aplazado";
    return match.time || "Por confirmar";
  }

  function populateJornadaSelector() {
    const select = document.getElementById("jornadaSelect");
    if (!select) return;
    const currentVal = select.value || "all";
    const rounds = Array.from(new Set((calendarData.matches || []).map(m => m.roundNumber || m.round))).sort((a, b) => {
      const numA = typeof a === 'number' ? a : parseInt(String(a).replace(/\D+/g, ''), 10) || 0;
      const numB = typeof b === 'number' ? b : parseInt(String(b).replace(/\D+/g, ''), 10) || 0;
      return numA - numB;
    });

    if (!rounds.length) return;

    select.innerHTML = '<option value="all">Todas las jornadas (1 - 30)</option>' +
      rounds.map(r => {
        const num = typeof r === 'number' ? r : parseInt(String(r).replace(/\D+/g, ''), 10) || r;
        return `<option value="${num}" ${String(currentVal) === String(num) ? 'selected' : ''}>Jornada ${num}</option>`;
      }).join('');
  }

  function renderMatches() {
    const container = document.getElementById("calendarMatches");
    if (!container) return;

    let matches = calendarData.matches || [];

    // Filter by scope (Centinela vs Todos)
    if (activeScope === "centinela") {
      matches = matches.filter((m) => 
        isCentinela(m.home) || isCentinela(m.away) || m.homeId === "ud-centinela" || m.awayId === "ud-centinela"
      );
    }

    // Filter by status (Todos / Próximos / Resultados)
    if (activeFilter === "upcoming") {
      matches = matches.filter((m) => m.status === "upcoming" || m.homeScore === null);
    } else if (activeFilter === "finished") {
      matches = matches.filter((m) => m.status === "finished" || (m.homeScore !== null && m.awayScore !== null));
    }

    // Filter by Jornada
    if (activeJornada !== "all") {
      const jNum = parseInt(activeJornada, 10);
      matches = matches.filter((m) => m.roundNumber === jNum || String(m.round).includes(String(jNum)));
    }

    if (!matches.length) {
      container.innerHTML = `
        <div class="rounded-2xl border border-white/10 bg-white/5 p-9 text-center">
          <p class="font-heading text-xl font-black text-white">Sin partidos que coincidan con el filtro</p>
          <p class="mt-2 text-sm text-gray-400">Prueba cambiando los filtros de equipo, estado o jornada.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = matches
      .map((match) => {
        const isCentMatch = isCentinela(match.home) || isCentinela(match.away) || match.homeId === "ud-centinela" || match.awayId === "ud-centinela";
        const finished = match.status === "finished" || (match.homeScore !== null && match.awayScore !== null);
        const score = finished
          ? `<span class="font-heading text-2xl font-black text-white">${escapeHtml(match.homeScore)} - ${escapeHtml(match.awayScore)}</span>`
          : `<span class="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-gray-300">${escapeHtml(matchStatus(match))}</span>`;
        
        let eventsHtml = "";
        if (finished && Array.isArray(match.events) && match.events.length > 0) {
          eventsHtml = `
            <div class="col-span-full border-t border-white/5 pt-3 mt-1 flex flex-wrap gap-2">
              ${match.events.filter(e => e.type === 'goal').map(g => {
                const minText = g.minute ? `${escapeHtml(g.minute)}'` : '';
                const scorer = g.scorerId ? escapeHtml(g.scorerId) : 'Gol';
                const assist = g.assistId ? ` (Asist: ${escapeHtml(g.assistId)})` : '';
                return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-neon/10 border border-brand-neon/20 text-xs font-semibold text-brand-neon">⚽ ${minText} ${scorer}${assist}</span>`;
              }).join('')}
            </div>
          `;
        }

        const homeLogo = getTeamLogo(match.home, match.homeLogo);
        const awayLogo = getTeamLogo(match.away, match.awayLogo);
        const homeIsCent = isCentinela(match.home) || match.homeId === "ud-centinela";
        const awayIsCent = isCentinela(match.away) || match.awayId === "ud-centinela";

        return `
          <article class="grid gap-4 sm:gap-5 rounded-2xl border ${isCentMatch ? 'border-brand-neon/40 bg-brand-neon/[0.04] shadow-[0_0_20px_rgba(0,210,255,0.08)]' : 'border-white/10 bg-white/5'} p-4 sm:p-5 md:grid-cols-[160px_1fr_120px] md:items-center transition-all hover:border-white/20">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-black tracking-widest text-brand-neon uppercase">${escapeHtml(match.round || "Jornada")}</span>
                ${isCentMatch ? '<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-black bg-brand-neon/20 text-brand-neon border border-brand-neon/30 uppercase">UDC</span>' : ''}
              </div>
              <p class="mt-1.5 text-sm font-bold text-white">${escapeHtml(match.date || "Fecha por confirmar")}</p>
              <p class="mt-0.5 text-xs text-gray-400 truncate" title="${escapeHtml(match.venue || "")}">${escapeHtml(match.venue || "")}</p>
            </div>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div class="flex items-center justify-end gap-2.5 text-right">
                <span class="font-bold text-sm sm:text-base ${homeIsCent ? 'text-brand-neon' : 'text-gray-200'}">${escapeHtml(match.home || "Local")}</span>
                ${homeLogo ? `<img src="${homeLogo}" alt="" class="team-shield-match h-8 w-8 object-contain flex-shrink-0 filter drop-shadow-sm">` : ''}
              </div>
              <div class="text-center min-w-[70px]">${score}</div>
              <div class="flex items-center justify-start gap-2.5 text-left">
                ${awayLogo ? `<img src="${awayLogo}" alt="" class="team-shield-match h-8 w-8 object-contain flex-shrink-0 filter drop-shadow-sm">` : ''}
                <span class="font-bold text-sm sm:text-base ${awayIsCent ? 'text-brand-neon' : 'text-gray-200'}">${escapeHtml(match.away || "Visitante")}</span>
              </div>
            </div>
            <div class="text-left text-xs font-bold tracking-widest text-brand-neon uppercase md:text-right">${finished ? "Resultado" : "Próximo"}</div>
            ${eventsHtml}
          </article>
        `;
      })
      .join("");
  }

  function normalizeTeamId(name) {
    if (!name) return "";
    return String(name)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function computeStandings(calendarData) {
    const rawStandings = calendarData.standings || [];
    const teams = calendarData.teams || [];
    const matches = calendarData.matches || [];

    const teamMap = new Map();
    const baseList = teams.length ? teams : rawStandings;

    baseList.forEach((t, index) => {
      const id = t.id || normalizeTeamId(t.name || t.team);
      teamMap.set(id, {
        id: id,
        team: t.name || t.team,
        shortName: t.shortName || t.name || t.team,
        logo: t.logo || getTeamLogo(t.name || t.team),
        played: Number(t.played) || 0,
        won: Number(t.won) || 0,
        drawn: Number(t.drawn) || 0,
        lost: Number(t.lost) || 0,
        goalsFor: Number(t.goalsFor) || 0,
        goalsAgainst: Number(t.goalsAgainst) || 0,
        goalDifference: Number(t.goalDifference) || 0,
        points: Number(t.points) || 0,
        initialPos: t.position || index + 1
      });
    });

    const finishedMatches = matches.filter((m) => 
      (m.status === "finished" || m.finished === true || (m.homeScore !== null && m.awayScore !== null && m.homeScore !== "" && m.awayScore !== "")) &&
      !isNaN(Number(m.homeScore)) &&
      !isNaN(Number(m.awayScore))
    );

    if (finishedMatches.length > 0) {
      // Reset stats for computation from matches
      teamMap.forEach((obj) => {
        obj.played = 0;
        obj.won = 0;
        obj.drawn = 0;
        obj.lost = 0;
        obj.goalsFor = 0;
        obj.goalsAgainst = 0;
        obj.goalDifference = 0;
        obj.points = 0;
      });

      finishedMatches.forEach((m) => {
        const homeKey = m.homeId || normalizeTeamId(m.home);
        const awayKey = m.awayId || normalizeTeamId(m.away);

        let homeObj = teamMap.get(homeKey);
        if (!homeObj) {
          for (const [, v] of teamMap.entries()) {
            if (v.team.toLowerCase().includes(String(m.home || '').toLowerCase()) || String(m.home || '').toLowerCase().includes(v.team.toLowerCase())) {
              homeObj = v;
              break;
            }
          }
        }

        let awayObj = teamMap.get(awayKey);
        if (!awayObj) {
          for (const [, v] of teamMap.entries()) {
            if (v.team.toLowerCase().includes(String(m.away || '').toLowerCase()) || String(m.away || '').toLowerCase().includes(v.team.toLowerCase())) {
              awayObj = v;
              break;
            }
          }
        }

        if (homeObj && awayObj) {
          const hs = Number(m.homeScore);
          const as = Number(m.awayScore);

          homeObj.played += 1;
          awayObj.played += 1;

          homeObj.goalsFor += hs;
          homeObj.goalsAgainst += as;
          homeObj.goalDifference = homeObj.goalsFor - homeObj.goalsAgainst;

          awayObj.goalsFor += as;
          awayObj.goalsAgainst += hs;
          awayObj.goalDifference = awayObj.goalsFor - awayObj.goalsAgainst;

          if (hs > as) {
            homeObj.won += 1;
            homeObj.points += 3;
            awayObj.lost += 1;
          } else if (hs < as) {
            awayObj.won += 1;
            awayObj.points += 3;
            homeObj.lost += 1;
          } else {
            homeObj.drawn += 1;
            homeObj.points += 1;
            awayObj.drawn += 1;
            awayObj.points += 1;
          }
        }
      });

      const sorted = Array.from(teamMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.team.localeCompare(b.team);
      });

      sorted.forEach((item, idx) => {
        item.position = idx + 1;
      });

      return sorted;
    }

    // If manual standings in calendar.json already have stats
    if (rawStandings.length > 0 && rawStandings.some((r) => (Number(r.played) > 0 || Number(r.points) > 0))) {
      return rawStandings;
    }

    return Array.from(teamMap.values()).map((item, idx) => ({
      ...item,
      position: item.initialPos || idx + 1
    }));
  }

  function renderStandings() {
    const body = document.getElementById("calendarStandings");
    if (!body) return;
    const standings = computeStandings(calendarData);
    if (!standings.length) {
      body.innerHTML = `
        <tr>
          <td colspan="10" class="px-6 py-12 text-center">
            <p class="font-heading text-xl font-black text-white">Clasificación pendiente</p>
            <p class="mt-2 text-sm text-gray-400">Se publicará cuando estén disponibles los datos oficiales de la competición.</p>
          </td>
        </tr>
      `;
      return;
    }

    body.innerHTML = standings
      .map((row, index) => {
        const highlighted = isCentinela(row.team);
        const teamLogo = getTeamLogo(row.team, row.logo);
        return `
          <tr class="${highlighted ? "bg-brand-neon/10 text-white font-bold" : "text-gray-300 hover:bg-white/5"} transition-colors" data-team-id="${escapeHtml(row.id || '')}">
            <td class="px-4 py-4 text-center font-heading text-lg font-black ${highlighted ? 'text-brand-neon' : ''}">${escapeHtml(row.position || index + 1)}</td>
            <td class="px-4 py-4">
              <div class="flex items-center gap-3">
                ${teamLogo ? `<img src="${teamLogo}" alt="" class="team-shield-table h-6 w-6 object-contain flex-shrink-0 filter drop-shadow-sm">` : ''}
                <span class="font-bold ${highlighted ? 'text-brand-neon' : 'text-white'}">${escapeHtml(row.team)}</span>
              </div>
            </td>
            <td class="px-3 py-4 text-center font-mono">${escapeHtml(row.played ?? 0)}</td>
            <td class="px-3 py-4 text-center font-mono">${escapeHtml(row.won ?? 0)}</td>
            <td class="px-3 py-4 text-center font-mono">${escapeHtml(row.drawn ?? 0)}</td>
            <td class="px-3 py-4 text-center font-mono">${escapeHtml(row.lost ?? 0)}</td>
            <td class="px-3 py-4 text-center font-mono">${escapeHtml(row.goalsFor ?? 0)}</td>
            <td class="px-3 py-4 text-center font-mono">${escapeHtml(row.goalsAgainst ?? 0)}</td>
            <td class="px-3 py-4 text-center font-mono font-bold ${Number(row.goalDifference) > 0 ? 'text-emerald-400' : Number(row.goalDifference) < 0 ? 'text-red-400' : ''}">${(Number(row.goalDifference) > 0 ? '+' : '') + escapeHtml(row.goalDifference ?? 0)}</td>
            <td class="px-4 py-4 text-center font-heading text-xl font-black text-brand-neon">${escapeHtml(row.points ?? 0)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function setupTabs() {
    // Pestañas Partidos vs Clasificación
    document.querySelectorAll("[data-calendar-view]").forEach((button) => {
      button.addEventListener("click", () => {
        const view = button.dataset.calendarView;
        document.getElementById("calendarMatchesPanel").classList.toggle("hidden", view !== "matches");
        document.getElementById("calendarStandingsPanel").classList.toggle("hidden", view !== "standings");
        document.querySelectorAll("[data-calendar-view]").forEach((tab) => {
          const active = tab === button;
          tab.setAttribute("aria-selected", String(active));
          tab.classList.toggle("bg-brand-neon", active);
          tab.classList.toggle("text-brand-dark", active);
          tab.classList.toggle("text-gray-300", !active);
        });
      });
    });

    // Filtro Ámbito (Solo Centinela predeterminado vs Todos los equipos)
    document.querySelectorAll("[data-team-scope]").forEach((button) => {
      button.addEventListener("click", () => {
        activeScope = button.dataset.teamScope;
        document.querySelectorAll("[data-team-scope]").forEach((btn) => {
          const active = btn === button;
          btn.classList.toggle("bg-brand-neon", active);
          btn.classList.toggle("text-brand-dark", active);
          btn.classList.toggle("font-black", active);
          btn.classList.toggle("text-gray-400", !active);
          btn.classList.toggle("font-bold", !active);
        });
        renderMatches();
      });
    });

    // Filtro Estado (Todos / Próximos / Resultados)
    document.querySelectorAll("[data-match-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.matchFilter;
        document.querySelectorAll("[data-match-filter]").forEach((filter) => {
          const active = filter === button;
          filter.classList.toggle("bg-white/10", active);
          filter.classList.toggle("text-white", active);
          filter.classList.toggle("text-gray-400", !active);
        });
        renderMatches();
      });
    });

    // Selector de Jornada
    const jSelect = document.getElementById("jornadaSelect");
    if (jSelect) {
      jSelect.addEventListener("change", (e) => {
        activeJornada = e.target.value;
        renderMatches();
      });
    }
  }

  async function initCalendar() {
    setupTabs();
    try {
      const response = await fetch("/assets/data/calendar.json?t=" + Date.now());
      if (!response.ok) throw new Error("No se pudieron cargar los datos.");
      calendarData = { ...fallbackData, ...(await response.json()) };
    } catch (error) {
      calendarData = fallbackData;
    }

    document.getElementById("calendarSeason").textContent = calendarData.season || fallbackData.season;
    document.getElementById("calendarUpdated").textContent = calendarData.updated
      ? `Actualizado: ${calendarData.updated}`
      : "Pendiente de datos oficiales";
    renderNextMatch(calendarData.nextMatch);
    populateJornadaSelector();
    renderMatches();
    renderStandings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalendar, { once: true });
  } else {
    initCalendar();
  }
})();
