(function () {
  async function loadPlayerData() {
    try {
      const [playRes, calRes] = await Promise.all([
        fetch('/assets/data/players.json?t=' + Date.now()),
        fetch('/assets/data/calendar.json?t=' + Date.now())
      ]);

      if (!playRes.ok) return;
      const playersData = await playRes.json();
      const calendarData = calRes.ok ? await calRes.json() : { matches: [] };

      const pathname = window.location.pathname.replace(/\/$/, '').split('/').pop() || '';
      
      // If we are on a specific player profile page
      if (pathname && pathname !== 'regional') {
        renderProfileStats(pathname, playersData, calendarData);
      } else if (window.location.pathname.includes('/regional/')) {
        renderSquadGrid(playersData);
      }
    } catch (e) {
      console.warn('No se pudieron cargar estadísticas en vivo:', e);
    }
  }

  function renderSquadGrid(playersData) {
    const squadGrid = document.querySelector('.squad-grid');
    if (!squadGrid || !playersData || !Array.isArray(playersData.players)) return;

    // Filter squad players (exclude staff like cuerpo-tecnico or iriome who are in top cards)
    const squadPlayers = playersData.players.filter(p => p.id !== 'cuerpo-tecnico' && p.id !== 'iriome');
    if (squadPlayers.length === 0) return;

    squadGrid.innerHTML = squadPlayers.map(player => {
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
                <p class="text-brand-neon text-xs font-medium mt-0.5">${player.position || 'Jugador'}</p>
                <div class="flex items-center gap-2 mt-2">
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

    // 1. Dynamic Photo Badge
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
