/**
 * UD Centinela - Floating Next Match Island
 * Detecta automáticamente el próximo partido oficial de la UD Centinela
 * y muestra una isla flotante superior compacta con cuenta atrás en tiempo real.
 */
(function () {
  'use strict';

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

  function parseMatchDate(dateStr, timeStr) {
    if (!dateStr) return null;
    let day, month, year;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      return null;
    }

    let hours = 21, minutes = 0;
    if (timeStr && timeStr.includes(':')) {
      const tParts = timeStr.split(':');
      hours = parseInt(tParts[0], 10) || 0;
      minutes = parseInt(tParts[1], 10) || 0;
    }
    return new Date(year, month, day, hours, minutes, 0);
  }

  function isCentinelaMatch(m) {
    if (!m) return false;
    const h = String(m.home || '').toLowerCase();
    const a = String(m.away || '').toLowerCase();
    return h.includes('centinela') || a.includes('centinela') || m.homeId === 'ud-centinela' || m.awayId === 'ud-centinela';
  }

  function getTeamLogo(teamName, customLogo) {
    if (customLogo) return customLogo;
    const lower = String(teamName || '').toLowerCase();
    for (const [key, path] of Object.entries(TEAM_SHIELDS)) {
      if (lower.includes(key)) return path;
    }
    return '/assets/img/logo-nav.webp';
  }

  function getShortTeamName(teamName, teamsList) {
    if (!teamName) return '';
    if (teamsList && Array.isArray(teamsList)) {
      const found = teamsList.find(t => t.name && t.name.toLowerCase() === teamName.toLowerCase());
      if (found && found.shortName) return found.shortName;
    }
    // Simplificaciones estándar
    let name = teamName.replace(/^C\.D\.\s*/i, '')
                       .replace(/^U\.D\.\s*/i, '')
                       .replace(/^S\.D\.\s*/i, '')
                       .replace(/^R\.C\.D\.\s*/i, '')
                       .replace(/^VLM\s*F\.C\.\s*/i, 'VLM')
                       .trim();
    if (name.toLowerCase().includes('centinela')) return 'Centinela';
    if (name.toLowerCase().includes('portezuelo')) return 'Portezuelo';
    if (name.toLowerCase().includes('perdoma')) return 'Perdoma B';
    if (name.toLowerCase().includes('silense')) return 'Silense';
    if (name.toLowerCase().includes('buenavista')) return 'Buenavista';
    if (name.toLowerCase().includes('tegueste')) return 'Tegueste';
    if (name.toLowerCase().includes('matanza')) return 'La Matanza';
    if (name.toLowerCase().includes('ravelo')) return 'Ravelo B';
    if (name.toLowerCase().includes('tacoronte c')) return 'Tacoronte CF';
    if (name.toLowerCase().includes('tacoronte')) return 'UD Tacoronte';
    if (name.toLowerCase().includes('san jer')) return 'San Jerónimo';
    if (name.toLowerCase().includes('san diego')) return 'San Diego';
    if (name.toLowerCase().includes('interi')) return 'Interián';
    if (name.toLowerCase().includes('gara')) return 'Gara';
    if (name.toLowerCase().includes('piratas')) return 'Once Piratas';
    return name.slice(0, 14);
  }

  function detectNextMatch(data) {
    if (!data) return null;
    const matches = data.matches || [];
    const centinelaMatches = matches.filter(isCentinelaMatch);
    const now = new Date();

    if (centinelaMatches.length > 0) {
      // Mapear con su fecha real
      const matchesWithDate = centinelaMatches.map(m => ({
        ...m,
        dateObj: parseMatchDate(m.date, m.time)
      })).filter(m => m.dateObj !== null);

      // 1. Buscar si hay alguno en juego (desde el pitido inicial hasta 115 minutos después)
      const liveMatch = matchesWithDate.find(m => {
        if (m.status === 'live') return true;
        const diff = now.getTime() - m.dateObj.getTime();
        return diff >= 0 && diff <= 115 * 60 * 1000 && m.status !== 'finished';
      });
      if (liveMatch) return { match: liveMatch, isLive: true };

      // 2. Buscar el próximo partido futuro no finalizado más cercano
      const upcomingMatches = matchesWithDate.filter(m => {
        if (m.status === 'finished') return false;
        return (m.dateObj.getTime() + 115 * 60 * 1000) > now.getTime();
      }).sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      if (upcomingMatches.length > 0) {
        return { match: upcomingMatches[0], isLive: false };
      }
    }

    // Fallback: data.nextMatch
    if (data.nextMatch && isCentinelaMatch(data.nextMatch)) {
      const dateObj = parseMatchDate(data.nextMatch.date, data.nextMatch.time);
      return {
        match: { ...data.nextMatch, dateObj },
        isLive: data.nextMatch.status === 'live'
      };
    }

    return null;
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDiff(diffMs) {
    if (diffMs <= 0) return '00:00:00';
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (days > 0) {
      return `${days}d ${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    }
    return `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
  }

  function formatShortDiff(diffMs) {
    if (diffMs <= 0) return 'EN JUEGO';
    const totalSecs = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSecs / 86400);
    const hours = Math.floor((totalSecs % 86400) / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (days > 0) {
      return `${days}d ${pad(hours)}h`;
    }
    return `${pad(hours)}h ${pad(mins)}m`;
  }

  async function initMatchIsland() {
    const island = document.getElementById('matchFloatingIsland');
    if (!island) return;

    try {
      const res = await fetch('/assets/data/calendar.json?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();

      const result = detectNextMatch(data);
      if (!result || !result.match) {
        island.style.display = 'none';
        return;
      }

      const match = result.match;
      const matchDate = match.dateObj || parseMatchDate(match.date, match.time);
      if (!matchDate) {
        island.style.display = 'none';
        return;
      }

      // Populate Logos
      const homeLogo = getTeamLogo(match.home, match.homeLogo);
      const awayLogo = getTeamLogo(match.away, match.awayLogo);
      const homeName = getShortTeamName(match.home, data.teams);
      const awayName = getShortTeamName(match.away, data.teams);

      const elHomeLogo = document.getElementById('islandHomeLogo');
      const elAwayLogo = document.getElementById('islandAwayLogo');
      const elHomeName = document.getElementById('islandHomeName');
      const elAwayName = document.getElementById('islandAwayName');
      const elCountdown = document.getElementById('islandCountdown');
      const elMiniCountdown = document.getElementById('islandMiniCountdown');
      const elBadgeText = document.getElementById('islandBadgeText');
      const elPulseDot = document.getElementById('islandPulseDot');
      const elSolidDot = document.getElementById('islandSolidDot');
      const elMiniMatch = document.getElementById('islandMiniMatch');

      if (elHomeLogo) elHomeLogo.src = homeLogo;
      if (elAwayLogo) elAwayLogo.src = awayLogo;
      if (elHomeName) elHomeName.textContent = homeName;
      if (elAwayName) elAwayName.textContent = awayName;
      if (elMiniMatch) elMiniMatch.textContent = `${homeName} vs ${awayName}`;

      // Update function
      function updateTimer() {
        const now = new Date();
        const diff = matchDate.getTime() - now.getTime();

        if (diff <= 0 && diff >= -115 * 60 * 1000) {
          // Partido en juego
          if (elBadgeText) elBadgeText.textContent = 'EN DIRECTO';
          if (elPulseDot) elPulseDot.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75';
          if (elSolidDot) elSolidDot.className = 'relative inline-flex rounded-full h-2 w-2 bg-red-500';
          if (elCountdown) elCountdown.textContent = '¡EN JUEGO!';
          if (elMiniCountdown) elMiniCountdown.textContent = 'EN JUEGO';
        } else if (diff < -115 * 60 * 1000) {
          // El partido ya terminó, reinicializar con el siguiente
          initMatchIsland();
        } else {
          // Próximo partido
          const fullText = formatDiff(diff);
          const shortText = formatShortDiff(diff);
          if (elCountdown) elCountdown.textContent = fullText;
          if (elMiniCountdown) elMiniCountdown.textContent = shortText;
        }
      }

      updateTimer();
      setInterval(updateTimer, 1000);

      // Handle Minimize / Expand toggle
      const expandedDiv = document.getElementById('islandExpanded');
      const minimizedDiv = document.getElementById('islandMinimized');
      const minimizeBtn = document.getElementById('islandMinimizeBtn');

      const isInitiallyMinimized = sessionStorage.getItem('udc_island_minimized') === 'true';
      if (isInitiallyMinimized) {
        if (expandedDiv) expandedDiv.classList.add('hidden');
        if (minimizedDiv) minimizedDiv.classList.remove('hidden');
      }

      if (minimizeBtn) {
        minimizeBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (expandedDiv) expandedDiv.classList.add('hidden');
          if (minimizedDiv) minimizedDiv.classList.remove('hidden');
          sessionStorage.setItem('udc_island_minimized', 'true');
        });
      }

      if (minimizedDiv) {
        minimizedDiv.addEventListener('click', function () {
          if (expandedDiv) expandedDiv.classList.remove('hidden');
          if (minimizedDiv) minimizedDiv.classList.add('hidden');
          sessionStorage.setItem('udc_island_minimized', 'false');
        });
      }

      // Show the island with smooth reveal
      island.style.display = 'block';
      island.classList.add('island-revealed');

    } catch (err) {
      console.warn('No se pudo inicializar la isla de partido:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMatchIsland);
  } else {
    initMatchIsland();
  }
})();
