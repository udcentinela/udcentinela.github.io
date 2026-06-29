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

  function getTeamShield(team, size = "large") {
    const isLarge = size === "large";
    const imgClass = isLarge ? "h-14 w-14 object-contain rounded-full border border-brand-neon/30 shadow-neon" : "h-6 w-6 object-contain inline-block mr-2 rounded-full";
    const svgClass = isLarge ? "h-14 w-14" : "h-6 w-6 inline-block mr-2 align-middle";
    
    if (isCentinela(team)) {
      return `<img src="/assets/img/logo-nav.webp" alt="UD Centinela" class="${imgClass}">`;
    }
    
    const initials = String(team || "Rival")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
      
    let hash = 0;
    for (let i = 0; i < (team || "").length; i++) {
      hash = team.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colors = [
      { primary: "#dc2626", secondary: "#ffffff", text: "#dc2626" }, // Red/White
      { primary: "#2563eb", secondary: "#ffffff", text: "#2563eb" }, // Blue/White
      { primary: "#16a34a", secondary: "#ffffff", text: "#16a34a" }, // Green/White
      { primary: "#ea580c", secondary: "#ffffff", text: "#ea580c" }, // Orange/White
      { primary: "#ca8a04", secondary: "#000000", text: "#ca8a04" }, // Yellow/Black
      { primary: "#7c3aed", secondary: "#ffffff", text: "#7c3aed" }, // Purple/White
      { primary: "#0891b2", secondary: "#ffffff", text: "#0891b2" }, // Cyan/White
      { primary: "#db2777", secondary: "#ffffff", text: "#db2777" }  // Pink/White
    ];
    const palette = colors[Math.abs(hash) % colors.length];
    
    return `
      <svg class="${svgClass}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 C65 10 90 20 90 45 C90 75 50 90 50 90 C50 90 10 75 10 45 C10 20 35 10 50 10 Z" fill="${palette.primary}" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
        <path d="M50 10 C50 10 50 90 50 90" stroke="${palette.secondary}" stroke-dasharray="4 4" stroke-width="2"/>
        <circle cx="50" cy="48" r="22" fill="${palette.secondary}" stroke="rgba(0,0,0,0.15)" stroke-width="2"/>
        <text x="50%" y="54%" font-family="Montserrat, sans-serif" font-weight="900" font-size="${initials.length > 1 ? 16 : 22}" fill="${palette.text}" dominant-baseline="middle" text-anchor="middle">${initials}</text>
      </svg>
    `;
  }

  function openMatchDetails(match) {
    const modal = document.getElementById("matchModal");
    const content = document.getElementById("matchModalContent");
    const body = document.getElementById("matchModalBody");
    if (!modal || !content || !body || !match) return;
    
    const homeGoalsHtml = (match.homeGoals || []).map(g => `
      <div class="flex items-center gap-1.5 justify-start text-sm text-gray-300">
        <span class="text-brand-neon text-xs">⚽</span>
        <span class="text-xs text-gray-500 font-bold">${escapeHtml(g.min)}</span>
        <span class="font-semibold text-white">${escapeHtml(g.name)}</span>
      </div>
    `).join("\n");
    
    const awayGoalsHtml = (match.awayGoals || []).map(g => `
      <div class="flex items-center gap-1.5 justify-end text-sm text-gray-300">
        <span class="text-brand-neon text-xs">⚽</span>
        <span class="text-xs text-gray-500 font-bold">${escapeHtml(g.min)}</span>
        <span class="font-semibold text-white">${escapeHtml(g.name)}</span>
      </div>
    `).join("\n");
    
    const isFinished = match.status === "finished";
    const matchStateText = isFinished ? "FP" : "PRÓXIMO";
    
    const scoreDisplay = isFinished
      ? `<div class="rounded-2xl bg-brand-neon text-brand-dark font-heading text-4xl md:text-5xl font-black px-6 py-4 tracking-wider shadow-neon">
           ${escapeHtml(match.homeScore)} - ${escapeHtml(match.awayScore)}
         </div>`
      : `<div class="rounded-2xl bg-white/5 border border-white/10 text-gray-300 font-heading text-lg font-black px-5 py-3">
           ${escapeHtml(match.time || "Por confirmar")}
         </div>`;
         
    const mpText = isFinished && match.halftimeScore ? `MP: ${escapeHtml(match.halftimeScore)}` : "";
    const refereeText = match.referee ? `Árbitro: ${escapeHtml(match.referee)}` : "";
    const venueText = match.venue ? `Estadio: ${escapeHtml(match.venue)}` : "";
    
    body.innerHTML = `
      <div class="text-center mb-6 border-b border-white/10 pb-4">
        <p class="text-xs font-black tracking-[0.25em] text-brand-neon uppercase">REGIONAL · ${escapeHtml(match.round || "PARTIDO")}</p>
        <p class="text-xs font-bold text-gray-500 uppercase mt-1.5">${escapeHtml(match.date || "Fecha a confirmar")}</p>
      </div>
      
      <div class="text-center mb-8">
        <span class="inline-block bg-white/10 text-white text-[10px] font-black px-3 py-1 rounded-full tracking-widest uppercase">${matchStateText}</span>
      </div>
      
      <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 mb-8">
        <div class="flex flex-col items-center gap-4 text-center">
          ${getTeamShield(match.home, "large")}
          <span class="font-heading text-lg md:text-2xl font-black text-white leading-tight mt-2">${escapeHtml(match.home)}</span>
        </div>
        
        <div class="flex flex-col items-center gap-3">
          ${scoreDisplay}
          ${mpText ? `<p class="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">${mpText}</p>` : ""}
        </div>
        
        <div class="flex flex-col items-center gap-4 text-center">
          ${getTeamShield(match.away, "large")}
          <span class="font-heading text-lg md:text-2xl font-black text-white leading-tight mt-2">${escapeHtml(match.away)}</span>
        </div>
      </div>
      
      <div class="grid gap-8 border-t border-white/10 pt-6" style="grid-template-columns: repeat(2, minmax(0, 1fr));">
        <div class="space-y-2 text-left">
          ${homeGoalsHtml || '<p class="text-xs text-gray-600 italic">Sin goleadores</p>'}
        </div>
        
        <div class="space-y-2 text-right">
          ${awayGoalsHtml || '<p class="text-xs text-gray-600 italic">Sin goleadores</p>'}
        </div>
      </div>
      
      <div class="mt-10 border-t border-white/5 pt-6 text-center text-xs text-gray-500 space-y-1">
        ${venueText ? `<p>${venueText}</p>` : ""}
        ${refereeText ? `<p>${refereeText}</p>` : ""}
      </div>
    `;
    
    modal.classList.remove("hidden");
    setTimeout(() => {
      content.classList.remove("scale-95", "opacity-0");
      content.classList.add("scale-100", "opacity-100");
    }, 20);
  }
  
  function closeMatchDetails() {
    const modal = document.getElementById("matchModal");
    const content = document.getElementById("matchModalContent");
    if (!modal || !content) return;
    
    content.classList.remove("scale-100", "opacity-100");
    content.classList.add("scale-95", "opacity-0");
    
    setTimeout(() => {
      modal.classList.add("hidden");
    }, 300);
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
            ${getTeamShield(match.home, "large")}
            <span class="font-heading text-lg font-black text-white md:text-2xl mt-1">${escapeHtml(match.home || "Local")}</span>
          </div>
          <div class="rounded-xl border border-brand-neon/30 bg-brand-neon/10 px-4 py-3 font-heading text-xl font-black text-brand-neon">VS</div>
          <div class="flex min-w-0 flex-col items-center gap-3 text-center">
            ${getTeamShield(match.away, "large")}
            <span class="font-heading text-lg font-black text-white md:text-2xl mt-1">${escapeHtml(match.away || "Visitante")}</span>
          </div>
        </div>
      </div>
    `;
    
    card.classList.add("cursor-pointer", "hover:border-brand-neon/50", "transition-colors");
    card.addEventListener("click", () => openMatchDetails(match));
  }

  function matchStatus(match) {
    if (match.status === "finished") return "Finalizado";
    if (match.status === "postponed") return "Aplazado";
    return match.time || "Por confirmar";
  }

  function renderMatches() {
    const container = document.getElementById("calendarMatches");
    if (!container) return;
    const matches = (calendarData.matches || []);
    const filteredMatches = matches.filter((match) => {
      if (activeFilter === "all") return true;
      return match.status === activeFilter;
    });

    if (!filteredMatches.length) {
      container.innerHTML = `
        <div class="rounded-2xl border border-white/10 bg-white/5 p-9 text-center">
          <p class="font-heading text-xl font-black text-white">Sin partidos publicados</p>
          <p class="mt-2 text-sm text-gray-400">Las fechas y resultados aparecerán aquí cuando sean oficiales.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = filteredMatches
      .map((match) => {
        const finished = match.status === "finished";
        const score = finished
          ? `<span class="font-heading text-2xl font-black text-white px-2">${escapeHtml(match.homeScore)} - ${escapeHtml(match.awayScore)}</span>`
          : `<span class="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs font-bold text-gray-300">${escapeHtml(matchStatus(match))}</span>`;
        
        const matchIdx = matches.indexOf(match);
        
        return `
          <article class="match-item grid gap-5 rounded-2xl border border-white/10 bg-white/5 p-5 md:grid-cols-[150px_1fr_120px] md:items-center cursor-pointer hover:border-brand-neon/40 hover:bg-white/10 transition-all duration-300" data-match-index="${matchIdx}">
            <div>
              <p class="text-xs font-black tracking-widest text-brand-neon uppercase">${escapeHtml(match.round || "Jornada")}</p>
              <p class="mt-2 text-sm font-bold text-white">${escapeHtml(match.date || "Fecha por confirmar")}</p>
              <p class="mt-1 text-xs text-gray-500">${escapeHtml(match.venue || "")}</p>
            </div>
            <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <span class="text-right font-bold text-gray-200 flex items-center justify-end gap-2">
                <span>${escapeHtml(match.home || "Local")}</span>
                ${getTeamShield(match.home, "small")}
              </span>
              ${score}
              <span class="font-bold text-gray-200 flex items-center justify-start gap-2">
                ${getTeamShield(match.away, "small")}
                <span>${escapeHtml(match.away || "Visitante")}</span>
              </span>
            </div>
            <div class="text-left text-xs font-bold tracking-widest text-gray-500 uppercase md:text-right">${finished ? "Resultado" : "Próximo"}</div>
          </article>
        `;
      })
      .join("");
      
    container.querySelectorAll(".match-item").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = parseInt(el.dataset.matchIndex);
        if (!isNaN(idx) && matches[idx]) {
          openMatchDetails(matches[idx]);
        }
      });
    });
  }

  function renderStandings() {
    const body = document.getElementById("calendarStandings");
    if (!body) return;
    const standings = calendarData.standings || [];
    if (!standings.length) {
      body.innerHTML = `
        <tr>
          <td colspan="11" class="px-6 py-12 text-center">
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
        
        const streakHtml = (row.streak || []).map((outcome, matchIndex) => {
          let badgeClass = "";
          let symbol = "";
          let tooltipText = "";
          
          if (row.streakDetails && row.streakDetails[matchIndex]) {
            tooltipText = row.streakDetails[matchIndex];
          } else {
            tooltipText = outcome === "W" ? "Victoria" : outcome === "L" ? "Derrota" : "Empate";
          }
          
          if (outcome === "W") {
            badgeClass = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
            symbol = "✔";
          } else if (outcome === "L") {
            badgeClass = "bg-red-500/20 text-red-400 border border-red-500/30";
            symbol = "✘";
          } else {
            badgeClass = "bg-gray-500/20 text-gray-400 border border-gray-500/30";
            symbol = "●";
          }
          
          return `
            <span class="relative group inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${badgeClass} cursor-help mx-0.5">
              ${symbol}
              <span class="absolute bottom-8 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-brand-dark/95 border border-brand-neon/20 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-all duration-200 whitespace-nowrap shadow-lg z-50">
                ${escapeHtml(tooltipText)}
              </span>
            </span>
          `;
        }).join("");

        return `
          <tr class="${highlighted ? "bg-brand-neon/10 text-white" : "text-gray-300"}">
            <td class="px-4 py-4 text-center font-heading text-lg font-black">${escapeHtml(row.position || index + 1)}</td>
            <td class="px-4 py-4 font-bold flex items-center gap-2">
              ${getTeamShield(row.team, "small")}
              <span>${escapeHtml(row.team)}</span>
            </td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.played ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.won ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.drawn ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.lost ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.goalsFor ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.goalsAgainst ?? 0)}</td>
            <td class="px-3 py-4 text-center">${escapeHtml(row.goalDifference ?? 0)}</td>
            <td class="px-4 py-4 text-center font-heading text-xl font-black text-brand-neon">${escapeHtml(row.points ?? 0)}</td>
            <td class="px-4 py-4 text-center whitespace-nowrap">${streakHtml}</td>
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
    
    const closeBtn = document.getElementById("matchModalCloseBtn");
    const backdrop = document.getElementById("matchModalBackdrop");
    if (closeBtn) closeBtn.addEventListener("click", closeMatchDetails);
    if (backdrop) backdrop.addEventListener("click", closeMatchDetails);
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
