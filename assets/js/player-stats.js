(function () {
  let allPlayers = [];
  let allMatches = [];
  let currentFilter = 'all';
  let currentSort = 'dorsal-asc';
  let searchQuery = '';
  let controlsInitialized = false;

  async function loadPlayerData() {
    try {
      const [playRes, calRes] = await Promise.all([
        fetch('/assets/data/players.json?t=' + Date.now()),
        fetch('/assets/data/calendar.json?t=' + Date.now())
      ]);

      if (!playRes.ok) return;
      const playersData = await playRes.json();
      const calendarData = calRes.ok ? await calRes.json() : { matches: [] };

      allPlayers = playersData.players || [];
      allMatches = calendarData.matches || [];

      const pathname = window.location.pathname.replace(/\/$/, '').split('/').pop() || '';
      
      // If we are on a specific player profile page
      if (pathname && pathname !== 'regional') {
        renderProfileStats(pathname, playersData, calendarData);
      } else if (window.location.pathname.includes('/regional')) {
        setupSquadControls();
        applyFiltersAndRender();
      }
    } catch (e) {
      console.warn('No se pudieron cargar estadísticas en vivo:', e);
    }
  }

  // Strict 1-to-1 position mapping: every player belongs to ONLY ONE category
  function getPlayerCategory(player) {
    if (!player) return 'otro';

    // Explicit overrides for existing squad players
    if (player.id === 'jordan' || player.id === 'pablo' || player.id === 'aday') return 'defensa';
    if (player.id === 'sebastian' || player.id === 'adrian-tejera') return 'medio';
    if (player.id === 'colcho' || player.id === 'cristian-colcho') return 'delantero';

    const pos = (player.position || '').toLowerCase();
    const role = (player.role || '').toLowerCase();
    const combined = `${pos} ${role}`;

    if (combined.includes('porter') || combined.includes('guardameta')) {
      return 'portero';
    } else if (combined.includes('defens') || combined.includes('lateral') || combined.includes('central') || combined.includes('carriler') || combined.includes('zaguero')) {
      return 'defensa';
    } else if (combined.includes('medio') || combined.includes('centro') || combined.includes('interior') || combined.includes('pivote') || combined.includes('volante')) {
      return 'medio';
    } else if (combined.includes('delanter') || combined.includes('extrem') || combined.includes('punta') || combined.includes('ariete') || combined.includes('atacan')) {
      return 'delantero';
    }
    return 'otro';
  }

  function matchesCategory(player, category) {
    if (category === 'all') return true;
    return getPlayerCategory(player) === category;
  }

  function sortPlayers(list, sortType) {
    return [...list].sort((a, b) => {
      switch (sortType) {
        case 'dorsal-asc': {
          if (a.dorsal === null && b.dorsal === null) return a.name.localeCompare(b.name, 'es');
          if (a.dorsal === null) return 1;
          if (b.dorsal === null) return -1;
          return a.dorsal - b.dorsal;
        }
        case 'dorsal-desc': {
          if (a.dorsal === null && b.dorsal === null) return a.name.localeCompare(b.name, 'es');
          if (a.dorsal === null) return 1;
          if (b.dorsal === null) return -1;
          return b.dorsal - a.dorsal;
        }
        case 'name-asc':
          return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
        case 'pos': {
          const catOrder = { 'portero': 1, 'defensa': 2, 'medio': 3, 'delantero': 4, 'otro': 5 };
          const orderA = catOrder[getPlayerCategory(a)] || 5;
          const orderB = catOrder[getPlayerCategory(b)] || 5;
          if (orderA !== orderB) return orderA - orderB;
          return (a.dorsal || 999) - (b.dorsal || 999);
        }
        case 'goals': {
          const gA = a.goals || 0;
          const gB = b.goals || 0;
          if (gA !== gB) return gB - gA;
          return a.name.localeCompare(b.name, 'es');
        }
        case 'assists': {
          const asA = a.assists || 0;
          const asB = b.assists || 0;
          if (asA !== asB) return asB - asA;
          return a.name.localeCompare(b.name, 'es');
        }
        default:
          return 0;
      }
    });
  }

  function setupSquadControls() {
    if (controlsInitialized) return;
    controlsInitialized = true;

    // Filter Chips click
    const filterBtns = document.querySelectorAll('.squad-tab-btn, .squad-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter || 'all';
        applyFiltersAndRender();
      });
    });

    // Sort Dropdown
    const sortSelect = document.getElementById('squadSortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Search Input
    const searchInput = document.getElementById('squadSearchInput');
    const searchClear = document.getElementById('squadSearchClear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        if (searchClear) {
          searchClear.classList.toggle('hidden', searchQuery.length === 0);
        }
        applyFiltersAndRender();
      });
    }

    if (searchClear) {
      searchClear.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchQuery = '';
          searchClear.classList.add('hidden');
          applyFiltersAndRender();
        }
      });
    }

    // Reset button
    const resetBtn = document.getElementById('squadResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        currentFilter = 'all';
        searchQuery = '';
        currentSort = 'dorsal-asc';
        if (searchInput) searchInput.value = '';
        if (searchClear) searchClear.classList.add('hidden');
        if (sortSelect) sortSelect.value = 'dorsal-asc';
        filterBtns.forEach(b => {
          b.classList.toggle('active', b.dataset.filter === 'all');
        });
        applyFiltersAndRender();
      });
    }
  }

  function updateCategoryCounters(validPlayers) {
    const counts = {
      all: validPlayers.length,
      defensa: validPlayers.filter(p => matchesCategory(p, 'defensa')).length,
      medio: validPlayers.filter(p => matchesCategory(p, 'medio')).length,
      delantero: validPlayers.filter(p => matchesCategory(p, 'delantero')).length,
      portero: validPlayers.filter(p => matchesCategory(p, 'portero')).length
    };

    const countAll = document.getElementById('countAll');
    const countDefensa = document.getElementById('countDefensa');
    const countMedio = document.getElementById('countMedio');
    const countDelantero = document.getElementById('countDelantero');
    const countPortero = document.getElementById('countPortero');

    if (countAll) countAll.textContent = counts.all;
    if (countDefensa) countDefensa.textContent = counts.defensa;
    if (countMedio) countMedio.textContent = counts.medio;
    if (countDelantero) countDelantero.textContent = counts.delantero;
    if (countPortero) countPortero.textContent = counts.portero;
  }

  function applyFiltersAndRender() {
    const squadGrid = document.querySelector('.squad-grid');
    if (!squadGrid) return;

    const validPlayers = allPlayers.filter(p => p.id !== 'cuerpo-tecnico' && p.id !== 'iriome');
    updateCategoryCounters(validPlayers);

    const filtered = validPlayers.filter(p => {
      if (currentFilter !== 'all' && !matchesCategory(p, currentFilter)) {
        return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q) || (p.fullName || '').toLowerCase().includes(q);
        const matchPos = (p.position || '').toLowerCase().includes(q);
        const matchDorsal = p.dorsal !== null && p.dorsal !== undefined && String(p.dorsal).includes(q);
        if (!matchName && !matchPos && !matchDorsal) return false;
      }
      return true;
    });

    const sorted = sortPlayers(filtered, currentSort);
    renderSquadList(sorted, validPlayers.length);
  }

  function renderSquadList(players, totalCount) {
    const squadGrid = document.querySelector('.squad-grid');
    const resultsCountEl = document.getElementById('squadResultsCount');
    const resetBtn = document.getElementById('squadResetBtn');

    if (resultsCountEl) {
      if (players.length === totalCount) {
        resultsCountEl.textContent = `Mostrando ${totalCount} jugadores`;
      } else {
        resultsCountEl.textContent = `Mostrando ${players.length} de ${totalCount} jugadores`;
      }
    }

    const hasFiltersActive = currentFilter !== 'all' || searchQuery.length > 0;
    if (resetBtn) {
      resetBtn.classList.toggle('hidden', !hasFiltersActive);
    }

    if (!squadGrid) return;

    if (players.length === 0) {
      squadGrid.innerHTML = `
        <div class="col-span-full py-12 px-6 rounded-2xl bg-white/5 border border-white/10 text-center">
          <p class="text-3xl mb-3">🔍</p>
          <p class="text-white font-heading font-bold text-base md:text-lg mb-1">No se encontraron jugadores</p>
          <p class="text-gray-400 text-xs max-w-sm mx-auto mb-4">No hay jugadores que coincidan con el filtro o término de búsqueda seleccionado.</p>
          <button type="button" onclick="document.getElementById('squadResetBtn')?.click();" class="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-neon text-brand-dark rounded-xl font-bold text-xs hover:bg-white transition-all cursor-pointer shadow-neon">
            Restablecer filtros
          </button>
        </div>
      `;
      return;
    }

    squadGrid.innerHTML = players.map(player => {
      const isCaptain = player.role === 'Capitán' || (player.role && player.role.includes('Capitán'));
      const hasRealPhoto = player.image && !player.image.includes('centinela1.webp') && !player.image.includes('centinela-2.webp');
      const photoSrc = player.image || `/assets/img/${player.id}.webp`;

      return `
        <a href="${player.url || `/regional/${player.slug || player.id}/`}" class="player-card group" style="border-color: rgba(0, 210, 255, 0.35);">
            <div class="${hasRealPhoto ? 'player-card-photo' : 'player-card-placeholder'}">
                <div class="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-transparent to-transparent z-10 pointer-events-none"></div>
                ${hasRealPhoto 
                  ? `<img src="${photoSrc}" alt="${player.name}" class="relative z-0" onerror="this.parentElement.className='player-card-placeholder'; this.remove();">` 
                  : `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`}
                <div class="absolute top-2.5 right-2.5 z-20 flex items-center gap-1">
                    ${player.dorsal ? `<span class="bg-brand-neon text-brand-dark font-black px-2 py-0.5 rounded-md text-[11px] shadow-sm">#${player.dorsal}</span>` : ''}
                    ${isCaptain ? `<span class="badge-captain-solid px-2 py-0.5 rounded-md text-[9px] uppercase shadow-sm">Capitán</span>` : ''}
                </div>
            </div>
            <div class="player-card-info">
                <h4 class="font-heading font-bold text-sm sm:text-base text-white group-hover:text-brand-neon transition-colors truncate">${player.name}</h4>
                <p class="text-brand-neon text-xs font-medium mt-0.5 truncate">${player.position || 'Jugador'}</p>
                <div class="flex items-center justify-center gap-2 mt-2">
                  <p class="text-[10px] text-gray-500 font-bold tracking-widest uppercase group-hover:text-gray-300 transition-colors">Ver ficha</p>
                  ${player.goals > 0 ? `<span class="px-1.5 py-0.5 rounded bg-brand-neon/20 border border-brand-neon/40 text-brand-neon text-[10px] font-black">⚽ ${player.goals}</span>` : ''}
                  ${player.assists > 0 ? `<span class="px-1.5 py-0.5 rounded bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-[10px] font-black">👟 ${player.assists}</span>` : ''}
                </div>
            </div>
        </a>
      `;
    }).join('');
  }

  function renderProfileStats(playerSlug, playersData, calendarData) {
    const player = playersData.players.find(p => p.id === playerSlug || p.slug === playerSlug);
    if (!player) return;

    // 1. Dynamic Photo Badge (for squad players)
    if (player.id !== 'iriome' && player.id !== 'cuerpo-tecnico') {
      const avatarBadge = document.querySelector('.profile-avatar-box span.bg-brand-neon');
      if (avatarBadge) {
        if (player.dorsal) {
          avatarBadge.textContent = `#${player.dorsal}`;
          avatarBadge.classList.remove('uppercase');
        } else {
          avatarBadge.textContent = 'Por confirmar';
          avatarBadge.classList.add('uppercase');
        }
      }

      // 2. Dynamic Subtitle (under main player name)
      const subtitleP = document.querySelector('.profile-card p.text-xl');
      if (subtitleP) {
        const span = subtitleP.querySelector('span');
        if (span) {
          if (player.dorsal) {
            span.className = 'text-brand-neon font-black';
            span.textContent = ` #${player.dorsal}`;
          } else {
            span.className = 'text-brand-neon text-base font-semibold';
            span.textContent = ' (Dorsal por confirmar)';
          }
        }
      }
    }

    // Find the stats grid in the DOM
    const statsGrid = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.gap-4.mb-8') || document.querySelector('.profile-card .grid');
    if (!statsGrid) return;

    // 3. Dynamic Stats (Position, Dorsal/Rol) for squad players
    const existingStats = statsGrid.querySelectorAll('.profile-stat');
    if (player.id !== 'iriome' && player.id !== 'cuerpo-tecnico' && existingStats.length >= 2) {
      if (player.position) {
        const posEl = existingStats[0].querySelector('p.font-heading') || existingStats[0].querySelector('p:last-child');
        if (posEl) posEl.textContent = player.position;
      }
      const dorsalEl = existingStats[1].querySelector('p.font-heading') || existingStats[1].querySelector('p:last-child');
      if (dorsalEl) {
        const dorsalStr = player.dorsal ? `#${player.dorsal}` : 'Por confirmar';
        const roleStr = player.role || 'Jugador';
        dorsalEl.textContent = `${dorsalStr} · ${roleStr}`;
      }
    }

    // If player is a squad player (not staff), inject Goals and Assists stats
    if (player.role !== 'Staff Técnico' && player.position !== 'Dirección Técnica') {
      if (existingStats.length >= 4) {
        existingStats[2].innerHTML = `
          <p class="text-brand-neon text-xs font-bold tracking-widest uppercase mb-2">⚽ Goles Temporada</p>
          <p class="text-white font-heading text-2xl font-black">${player.goals || 0}</p>
        `;
        existingStats[3].innerHTML = `
          <p class="text-cyan-300 text-xs font-bold tracking-widest uppercase mb-2">👟 Asistencias</p>
          <p class="text-white font-heading text-2xl font-black">${player.assists || 0}</p>
        `;
      }
    }

    // Find match events for this player
    const playerEvents = [];
    (calendarData.matches || []).forEach(match => {
      if (match.status === 'finished' && Array.isArray(match.events)) {
        match.events.forEach(evt => {
          if (evt.scorerId === player.id) {
            playerEvents.push({
              type: 'goal',
              round: match.round || 'Jornada',
              opponent: match.home && match.home.includes('Centinela') ? match.away : match.home,
              minute: evt.minute,
              date: match.date
            });
          } else if (evt.assistId === player.id) {
            playerEvents.push({
              type: 'assist',
              round: match.round || 'Jornada',
              opponent: match.home && match.home.includes('Centinela') ? match.away : match.home,
              minute: evt.minute,
              date: match.date
            });
          }
        });
      }
    });

    // Render Events History Section
    const profileCard = statsGrid.closest('.profile-card');
    if (profileCard && playerEvents.length > 0) {
      const historyCard = document.createElement('div');
      historyCard.className = 'profile-stat rounded-3xl p-7 mt-6 border border-brand-neon/20';
      historyCard.innerHTML = `
        <p class="text-brand-neon font-bold tracking-widest uppercase text-xs mb-4">Registro en la Temporada (Actas Oficiales)</p>
        <ul class="space-y-2.5">
          ${playerEvents.map(e => `
            <li class="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-white/5 text-sm">
              <div class="flex items-center gap-2.5">
                <span class="text-base">${e.type === 'goal' ? '⚽' : '👟'}</span>
                <span class="font-bold text-white">${e.type === 'goal' ? 'Gol' : 'Asistencia'}</span>
                <span class="text-xs text-gray-400">vs ${e.opponent} (${e.round})</span>
              </div>
              <span class="text-xs font-mono font-bold text-brand-neon">${e.minute ? e.minute + "'" : 'Partido'}</span>
            </li>
          `).join('')}
        </ul>
      `;
      profileCard.appendChild(historyCard);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPlayerData, { once: true });
  } else {
    loadPlayerData();
  }
})();
