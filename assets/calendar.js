(function () {
  const fallbackData = {
    season: "Temporada por confirmar",
    updated: "",
    nextMatch: null,
    matches: [],
    standings: [],
  };

  let calendarData = fallbackData;
  let activeFilter = "all";

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

  function teamMark(team, customLogo) {
    if (customLogo) {
      return `<img src="${customLogo}" alt="${escapeHtml(team)}" class="h-20 w-20 md:h-24 md:w-24 object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">`;
    }
    if (isCentinela(team)) {
      return '<img src="/assets/img/escudo-centinela.webp" alt="UD Centinela" class="h-20 w-20 md:h-24 md:w-24 object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">';
    }
    if (String(team || "").toLowerCase().includes("portezuelo")) {
      return '<img src="/assets/img/portezuelo.webp" alt="C.D. Portezuelo Tegueste" class="h-20 w-20 md:h-24 md:w-24 object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">';
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

  function renderMatches() {
    const container = document.getElementById("calendarMatches");
    if (!container) return;
    const matches = (calendarData.matches || []).filter((match) => {
      if (activeFilter === "all") return true;
      return match.status === activeFilter;
    });

    if (!matches.length) {
      container.innerHTML = `
        <div class="rounded-2xl border border-white/10 bg-white/5 p-9 text-center">
          <p class="font-heading text-xl font-black text-white">Sin partidos publicados</p>
          <p class="mt-2 text-sm text-gray-400">Las fechas y resultados aparecerán aquí cuando sean oficiales.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = matches
      .map((match) => {
        const finished = match.status === "finished";
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

        const homeLogo = match.homeLogo || (String(match.home || '').toLowerCase().includes('portezuelo') ? '/assets/img/portezuelo.webp' : (isCentinela(match.home) ? '/assets/img/escudo-centinela.webp' : ''));
        const awayLogo = match.awayLogo || (String(match.away || '').toLowerCase().includes('portezuelo') ? '/assets/img/portezuelo.webp' : (isCentinela(match.away) ? '/assets/img/escudo-centinela.webp' : ''));

        return `
          <article class="grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-[160px_1fr_120px] md:items-center">
            <div>
              <p class="text-xs font-black tracking-widest text-brand-neon uppercase">${escapeHtml(match.round || "Jornada")}</p>
              <p class="mt-2 text-sm font-bold text-white">${escapeHtml(match.date || "Fecha por confirmar")}</p>
              <p class="mt-1 text-xs text-gray-400">${escapeHtml(match.venue || "")}</p>
            </div>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div class="flex items-center justify-end gap-2.5 text-right">
                <span class="font-bold text-gray-200">${escapeHtml(match.home || "Local")}</span>
                ${homeLogo ? `<img src="${homeLogo}" alt="" class="h-8 w-8 object-contain flex-shrink-0 filter drop-shadow-sm">` : ''}
              </div>
              <div class="text-center">${score}</div>
              <div class="flex items-center justify-start gap-2.5 text-left">
                ${awayLogo ? `<img src="${awayLogo}" alt="" class="h-8 w-8 object-contain flex-shrink-0 filter drop-shadow-sm">` : ''}
                <span class="font-bold text-gray-200">${escapeHtml(match.away || "Visitante")}</span>
              </div>
            </div>
            <div class="text-left text-xs font-bold tracking-widest text-brand-neon uppercase md:text-right">${finished ? "Resultado" : "Próximo"}</div>
            ${eventsHtml}
          </article>
        `;
      })
      .join("");
  }

  function renderStandings() {
    const body = document.getElementById("calendarStandings");
    if (!body) return;
    const standings = calendarData.standings || [];
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
        return `
          <tr class="${highlighted ? "bg-brand-neon/10 text-white" : "text-gray-300"}">
            <td class="px-4 py-4 text-center font-heading text-lg font-black">${escapeHtml(row.position || index + 1)}</td>
            <td class="px-4 py-4 font-bold">${escapeHtml(row.team)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.played ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.won ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.drawn ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.lost ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.goalsFor ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.goalsAgainst ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.goalDifference ?? 0)}</td>
            <td class="px-4 py-4 text-center font-heading text-xl font-black text-brand-neon">${escapeHtml(row.points ?? 0)}</td>
          </tr>
        `;
      })
      .join("");
  }

  function setupTabs() {
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
  }

  async function initCalendar() {
    setupTabs();
    try {
      const response = await fetch("/assets/data/calendar.json", { cache: "no-store" });
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
    renderMatches();
    renderStandings();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initCalendar, { once: true });
  } else {
    initCalendar();
  }
})();
