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
        renderOverviewBadges(playersData);
      }
    } catch (e) {
      console.warn('No se pudieron cargar estadísticas en vivo:', e);
    }
  }

  function renderProfileStats(playerSlug, playersData, calendarData) {
    const player = playersData.players.find(p => p.id === playerSlug || p.slug === playerSlug);
    if (!player) return;

    // Find the stats grid in the DOM
    const statsGrid = document.querySelector('.grid.grid-cols-1.sm\\:grid-cols-2.gap-4.mb-8') || document.querySelector('.profile-card .grid');
    if (!statsGrid) return;

    // If player is a squad player (not staff), inject Goals and Assists stats
    if (player.role !== 'Staff Técnico' && player.position !== 'Dirección Técnica') {
      const existingStats = statsGrid.querySelectorAll('.profile-stat');
      if (existingStats.length >= 4) {
        // Replace or enhance season stats
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
              opponent: match.home.includes('Centinela') ? match.away : match.home,
              minute: evt.minute,
              date: match.date
            });
          } else if (evt.assistId === player.id) {
            playerEvents.push({
              type: 'assist',
              round: match.round || 'Jornada',
              opponent: match.home.includes('Centinela') ? match.away : match.home,
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

  function renderOverviewBadges(playersData) {
    document.querySelectorAll('a[href*="/regional/"]').forEach(card => {
      const href = card.getAttribute('href');
      const slug = href.replace(/\/$/, '').split('/').pop();
      const player = playersData.players.find(p => p.id === slug || p.slug === slug);
      if (player && (player.goals > 0 || player.assists > 0)) {
        const badge = document.createElement('div');
        badge.className = 'mt-3 flex items-center gap-2';
        if (player.goals > 0) {
          badge.innerHTML += `<span class="px-2 py-0.5 rounded-md bg-brand-neon/20 border border-brand-neon/40 text-brand-neon text-xs font-black">⚽ ${player.goals}</span>`;
        }
        if (player.assists > 0) {
          badge.innerHTML += `<span class="px-2 py-0.5 rounded-md bg-cyan-400/20 border border-cyan-400/40 text-cyan-300 text-xs font-black">👟 ${player.assists}</span>`;
        }
        card.querySelector('.group-hover\\:text-brand-neon')?.parentElement?.appendChild(badge);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPlayerData, { once: true });
  } else {
    loadPlayerData();
  }
})();
