(function () {
  const REPO = 'udcentinela/udcentinela.github.io';
  const API_BASE = `https://api.github.com/repos/${REPO}`;
  
  let currentToken = sessionStorage.getItem('udc_admin_token') || '';
  let calendarData = { season: 'Temporada 2026/2027', updated: '', nextMatch: null, matches: [], standings: [] };
  let playersData = { season: 'Temporada 2026/2027', lastUpdated: '', players: [] };
  let newsData = { items: [] };
  let hasUnsavedChanges = false;
  const isLocalHost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

  // =========================================================================
  // DOM Elements
  // =========================================================================
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const adminLoginForm = document.getElementById('adminLoginForm');
  const adminTokenInput = document.getElementById('adminTokenInput');
  const loginError = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');
  const matchesList = document.getElementById('matchesList');
  const playersTableBody = document.getElementById('playersTableBody');
  const newsList = document.getElementById('newsList');
  const topScorersList = document.getElementById('topScorersList');
  const topAssistsList = document.getElementById('topAssistsList');
  const deployBtn = document.getElementById('deployBtn');
  const deployStatus = document.getElementById('deployStatus');
  const unsavedBanner = document.getElementById('unsavedBanner');

  // Match Modal Elements
  const matchModal = document.getElementById('matchModal');
  const matchForm = document.getElementById('matchForm');
  const matchModalTitle = document.getElementById('matchModalTitle');
  const newMatchBtn = document.getElementById('newMatchBtn');
  const matchId = document.getElementById('matchId');
  const matchRound = document.getElementById('matchRound');
  const matchDate = document.getElementById('matchDate');
  const matchTime = document.getElementById('matchTime');
  const matchHome = document.getElementById('matchHome');
  const matchAway = document.getElementById('matchAway');
  const matchVenue = document.getElementById('matchVenue');
  const matchStatusSelect = document.getElementById('matchStatusSelect');
  const matchHomeScore = document.getElementById('matchHomeScore');
  const matchAwayScore = document.getElementById('matchAwayScore');
  const addGoalBtn = document.getElementById('addGoalBtn');
  const goalsContainer = document.getElementById('goalsContainer');

  // Player Modal Elements
  const playerModal = document.getElementById('playerModal');
  const playerForm = document.getElementById('playerForm');
  const playerModalTitle = document.getElementById('playerModalTitle');
  const newPlayerBtn = document.getElementById('newPlayerBtn');
  const playerEditIndex = document.getElementById('playerEditIndex');
  const playerIdInput = document.getElementById('playerIdInput');
  const playerNameInput = document.getElementById('playerNameInput');
  const playerDorsalInput = document.getElementById('playerDorsalInput');
  const playerPositionInput = document.getElementById('playerPositionInput');

  // News Modal Elements
  const newsModal = document.getElementById('newsModal');
  const newsForm = document.getElementById('newsForm');
  const newsModalTitle = document.getElementById('newsModalTitle');
  const newNewsBtn = document.getElementById('newNewsBtn');
  const newsEditIndex = document.getElementById('newsEditIndex');
  const newsTitleInput = document.getElementById('newsTitleInput');
  const newsSlugInput = document.getElementById('newsSlugInput');
  const newsCategoryInput = document.getElementById('newsCategoryInput');
  const newsDateInput = document.getElementById('newsDateInput');
  const newsReadingInput = document.getElementById('newsReadingInput');
  const newsImageInput = document.getElementById('newsImageInput');
  const newsExcerptInput = document.getElementById('newsExcerptInput');
  const newsBodyInput = document.getElementById('newsBodyInput');

  function markUnsavedChanges(unsaved = true) {
    hasUnsavedChanges = unsaved;
    if (unsavedBanner) {
      unsavedBanner.classList.toggle('hidden', !unsaved);
    }
    if (deployBtn) {
      if (unsaved) {
        deployBtn.classList.add('ring-4', 'ring-white', 'shadow-neon');
      } else {
        deployBtn.classList.remove('ring-4', 'ring-white', 'shadow-neon');
      }
    }
  }

  window.addEventListener('beforeunload', (e) => {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = 'Tienes cambios pendientes de publicar. ¿Seguro que deseas salir?';
    }
  });

  // =========================================================================
  // Authentication & Init
  // =========================================================================
  async function init() {
    setupTabs();
    setupModals();

    if (currentToken) {
      if (isLocalHost && (currentToken === 'admin' || currentToken === 'local')) {
        showDashboard();
        return;
      }
      const isValid = await validateToken(currentToken);
      if (isValid) {
        showDashboard();
        return;
      }
    }
    showLogin();
  }

  async function validateToken(token) {
    if (isLocalHost && (token === 'admin' || token === 'local')) {
      return true;
    }
    try {
      const res = await fetch(API_BASE, {
        headers: { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github.v3+json' }
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }

  function showLogin() {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    logoutBtn.classList.add('hidden');
  }

  async function showDashboard() {
    loginSection.classList.add('hidden');
    dashboardSection.classList.remove('hidden');
    logoutBtn.classList.remove('hidden');

    await loadData();
    renderAll();
  }

  adminLoginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const token = adminTokenInput.value.trim();
    loginError.classList.add('hidden');

    const isValid = await validateToken(token);
    if (isValid) {
      currentToken = token;
      sessionStorage.setItem('udc_admin_token', token);
      showDashboard();
    } else {
      loginError.textContent = isLocalHost 
        ? 'Clave incorrecta. En local puedes usar "admin".'
        : 'Token o clave no válida. Introduce un Personal Access Token (PAT) de GitHub con permisos de "repo".';
      loginError.classList.remove('hidden');
    }
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('udc_admin_token');
    currentToken = '';
    showLogin();
  });

  // =========================================================================
  // Load & Sync Data
  // =========================================================================
  async function loadData() {
    try {
      const [calRes, playRes, newsRes] = await Promise.all([
        fetch('/assets/data/calendar.json?t=' + Date.now()),
        fetch('/assets/data/players.json?t=' + Date.now()),
        fetch('/assets/data/news.json?t=' + Date.now())
      ]);

      if (calRes.ok) calendarData = await calRes.json();
      if (playRes.ok) playersData = await playRes.json();
      if (newsRes.ok) newsData = await newsRes.json();
    } catch (e) {
      console.warn('Usando datos locales o por defecto:', e);
    }
    recalculateStats();
  }

  // Recalculate goals and assists from match events
  function recalculateStats() {
    // Reset player counters
    playersData.players.forEach(p => {
      p.goals = 0;
      p.assists = 0;
    });

    (calendarData.matches || []).forEach(match => {
      if (match.status === 'finished' && Array.isArray(match.events)) {
        match.events.forEach(evt => {
          if (evt.type === 'goal') {
            if (evt.scorerId) {
              const scorer = playersData.players.find(p => p.id === evt.scorerId);
              if (scorer) scorer.goals = (scorer.goals || 0) + 1;
            }
            if (evt.assistId && evt.assistId !== 'none') {
              const assister = playersData.players.find(p => p.id === evt.assistId);
              if (assister) assister.assists = (assister.assists || 0) + 1;
            }
          }
        });
      }
    });
  }

  function renderAll() {
    renderMatches();
    renderPlayers();
    renderNews();
    renderStats();
  }

  // =========================================================================
  // TAB NAVIGATION
  // =========================================================================
  function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        btn.classList.add('active');
        document.getElementById(targetTab).classList.remove('hidden');
      });
    });
  }

  // =========================================================================
  // RENDER MATCHES
  // =========================================================================
  function renderMatches() {
    matchesList.innerHTML = '';
    const matches = calendarData.matches || [];

    if (matches.length === 0) {
      matchesList.innerHTML = `
        <div class="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-400">
          No hay partidos registrados aún. Pulsa en "+ Añadir Partido" para crear el primero.
        </div>
      `;
      return;
    }

    matches.forEach((m, idx) => {
      const isFinished = m.status === 'finished';
      const goals = (m.events || []).filter(e => e.type === 'goal');

      let eventsHtml = '';
      if (goals.length > 0) {
        eventsHtml = `
          <div class="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
            ${goals.map(g => {
              const scorer = playersData.players.find(p => p.id === g.scorerId);
              const assister = playersData.players.find(p => p.id === g.assistId);
              const scorerName = scorer ? scorer.name : (g.scorerId || 'Gol');
              const assistText = assister ? ` (Asist: ${assister.name})` : '';
              const minText = g.minute ? `${g.minute}'` : '';
              return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-brand-neon/10 border border-brand-neon/20 rounded-lg text-xs font-semibold text-brand-neon">⚽ ${minText} ${scorerName}${assistText}</span>`;
            }).join('')}
          </div>
        `;
      }

      const card = document.createElement('div');
      card.className = 'p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-neon/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4';
      card.innerHTML = `
        <div class="flex-grow">
          <div class="flex items-center gap-3 mb-1">
            <span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${isFinished ? 'bg-green-500/20 text-green-300' : 'bg-brand-neon/20 text-brand-neon'}">
              ${m.round || 'Jornada'}
            </span>
            <span class="text-xs text-gray-400">${m.date || 'Fecha pendiente'} · ${m.time || ''}</span>
            <span class="text-xs text-gray-500">📍 ${m.venue || 'Estadio'}</span>
          </div>

          <div class="flex items-center gap-4 text-base md:text-lg font-heading font-black text-white my-1">
            <span class="${m.home.toLowerCase().includes('centinela') ? 'text-brand-neon' : ''}">${m.home}</span>
            <span class="px-2.5 py-0.5 rounded-lg bg-black/40 text-sm font-mono border border-white/10 ${isFinished ? 'text-white' : 'text-gray-500'}">
              ${isFinished ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
            </span>
            <span class="${m.away.toLowerCase().includes('centinela') ? 'text-brand-neon' : ''}">${m.away}</span>
          </div>

          ${eventsHtml}
        </div>

        <div class="flex items-center gap-2 self-end md:self-center">
          <button class="edit-match-btn px-3 py-1.5 rounded-lg bg-white/10 hover:bg-brand-neon hover:text-brand-dark text-xs font-bold transition-colors cursor-pointer" data-id="${m.id}">
            ✏️ Editar Acta
          </button>
          <button class="delete-match-btn px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold transition-colors cursor-pointer" data-id="${m.id}">
            🗑️
          </button>
        </div>
      `;

      card.querySelector('.edit-match-btn').addEventListener('click', () => openMatchModal(m.id));
      card.querySelector('.delete-match-btn').addEventListener('click', () => deleteMatch(m.id));

      matchesList.appendChild(card);
    });
  }

  // =========================================================================
  // RENDER PLAYERS
  // =========================================================================
  function renderPlayers() {
    playersTableBody.innerHTML = '';
    const players = playersData.players || [];

    players.forEach((p, idx) => {
      const isStaff = p.id === 'cuerpo-tecnico' || p.role === 'Staff Técnico';
      const row = document.createElement('tr');
      row.className = 'hover:bg-white/5 transition-colors';
      row.innerHTML = `
        <td class="p-4 font-black font-heading ${p.dorsal ? 'text-brand-neon' : 'text-gray-500'}">
          ${p.dorsal ? '#' + p.dorsal : '-'}
        </td>
        <td class="p-4 font-mono text-xs text-gray-400">
          ${p.id}
        </td>
        <td class="p-4 font-bold text-white flex items-center gap-2">
          ${p.name}
          ${p.role && p.role.includes('Capitán') ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-brand-neon/20 text-brand-neon uppercase font-black">Capitán</span>' : ''}
          ${p.role && p.role.includes('Directiva') ? '<span class="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 uppercase font-black">Directiva</span>' : ''}
        </td>
        <td class="p-4 text-gray-300">
          ${p.position || 'Plantilla'}
        </td>
        <td class="p-4 text-center font-black text-white">
          ${isStaff ? '-' : (p.goals || 0)}
        </td>
        <td class="p-4 text-center font-black text-white">
          ${isStaff ? '-' : (p.assists || 0)}
        </td>
        <td class="p-4 text-right">
          <div class="inline-flex items-center gap-2">
            <button class="edit-player-btn px-2.5 py-1 bg-white/10 hover:bg-brand-neon hover:text-brand-dark rounded text-xs font-bold transition-colors cursor-pointer" data-index="${idx}">
              ✏️ Editar
            </button>
            <button class="delete-player-btn px-2 py-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded text-xs font-bold transition-colors cursor-pointer" data-index="${idx}">
              🗑️
            </button>
          </div>
        </td>
      `;

      row.querySelector('.edit-player-btn').addEventListener('click', () => openPlayerModal(idx));
      row.querySelector('.delete-player-btn').addEventListener('click', () => deletePlayer(idx));

      playersTableBody.appendChild(row);
    });
  }

  // =========================================================================
  // RENDER NEWS
  // =========================================================================
  function renderNews() {
    if (!newsList) return;
    newsList.innerHTML = '';
    const items = newsData.items || [];

    if (items.length === 0) {
      newsList.innerHTML = `
        <div class="col-span-full p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-400">
          No hay noticias registradas. Pulsa en "+ Nueva Noticia" para redactar la primera.
        </div>
      `;
      return;
    }

    items.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-brand-neon/30 transition-all flex flex-col justify-between gap-4';
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-brand-neon/20 text-brand-neon">
              ${item.category || 'Noticia'}
            </span>
            <span class="text-xs text-gray-400">${item.date || ''} · ${item.reading || '2 min'}</span>
          </div>
          <h3 class="font-heading text-lg font-bold text-white mb-2 line-clamp-1">${item.title}</h3>
          <p class="text-xs text-gray-400 line-clamp-2 leading-relaxed">${item.excerpt || ''}</p>
        </div>

        <div class="pt-3 border-t border-white/5 flex items-center justify-between">
          <span class="font-mono text-[11px] text-gray-500 truncate max-w-[180px]">/${item.slug}/</span>
          <div class="flex items-center gap-2">
            <button class="edit-news-btn px-3 py-1.5 rounded-lg bg-white/10 hover:bg-brand-neon hover:text-brand-dark text-xs font-bold transition-colors cursor-pointer" data-index="${idx}">
              ✏️ Editar
            </button>
            <button class="delete-news-btn px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white text-xs font-bold transition-colors cursor-pointer" data-index="${idx}">
              🗑️
            </button>
          </div>
        </div>
      `;

      card.querySelector('.edit-news-btn').addEventListener('click', () => openNewsModal(idx));
      card.querySelector('.delete-news-btn').addEventListener('click', () => deleteNews(idx));

      newsList.appendChild(card);
    });
  }

  // =========================================================================
  // RENDER STATS RANKING
  // =========================================================================
  function renderStats() {
    topScorersList.innerHTML = '';
    topAssistsList.innerHTML = '';

    const validPlayers = (playersData.players || []).filter(p => p.id !== 'cuerpo-tecnico' && p.role !== 'Staff Técnico');

    const scorers = [...validPlayers].filter(p => (p.goals || 0) > 0).sort((a, b) => b.goals - a.goals);
    const assisters = [...validPlayers].filter(p => (p.assists || 0) > 0).sort((a, b) => b.assists - a.assists);

    if (scorers.length === 0) {
      topScorersList.innerHTML = '<li class="text-gray-500 text-xs text-center py-4 italic">Aún no hay goles registrados en los partidos.</li>';
    } else {
      scorers.slice(0, 5).forEach((p, idx) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5';
        li.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="font-heading font-black text-sm ${idx === 0 ? 'text-brand-neon' : 'text-gray-400'}">${idx + 1}.</span>
            <span class="font-bold text-white text-sm">${p.name}</span>
            <span class="text-xs text-gray-500 font-mono">${p.dorsal ? '#' + p.dorsal : ''}</span>
          </div>
          <span class="px-2.5 py-1 rounded-lg bg-brand-neon/10 font-heading font-black text-brand-neon text-sm">
            ${p.goals} ${p.goals === 1 ? 'gol' : 'goles'}
          </span>
        `;
        topScorersList.appendChild(li);
      });
    }

    if (assisters.length === 0) {
      topAssistsList.innerHTML = '<li class="text-gray-500 text-xs text-center py-4 italic">Aún no hay asistencias registradas en los partidos.</li>';
    } else {
      assisters.slice(0, 5).forEach((p, idx) => {
        const li = document.createElement('li');
        li.className = 'flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5';
        li.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="font-heading font-black text-sm ${idx === 0 ? 'text-brand-neon' : 'text-gray-400'}">${idx + 1}.</span>
            <span class="font-bold text-white text-sm">${p.name}</span>
            <span class="text-xs text-gray-500 font-mono">${p.dorsal ? '#' + p.dorsal : ''}</span>
          </div>
          <span class="px-2.5 py-1 rounded-lg bg-brand-neon/10 font-heading font-black text-brand-neon text-sm">
            ${p.assists} ${p.assists === 1 ? 'asist.' : 'asists.'}
          </span>
        `;
        topAssistsList.appendChild(li);
      });
    }
  }

  // =========================================================================
  // MODALS & EVENT HANDLERS
  // =========================================================================
  function setupModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        matchModal.classList.add('hidden');
        playerModal.classList.add('hidden');
        if (newsModal) newsModal.classList.add('hidden');
      });
    });

    newMatchBtn.addEventListener('click', () => openMatchModal(null));
    newPlayerBtn.addEventListener('click', () => openPlayerModal(-1));
    if (newNewsBtn) newNewsBtn.addEventListener('click', () => openNewsModal(-1));

    addGoalBtn.addEventListener('click', () => addGoalRow());
  }

  function openMatchModal(matchIdVal) {
    goalsContainer.innerHTML = '';
    if (matchIdVal) {
      const match = calendarData.matches.find(m => m.id === matchIdVal);
      if (!match) return;
      matchModalTitle.textContent = 'Editar Partido y Acta';
      matchId.value = match.id;
      matchRound.value = match.round || '';
      matchDate.value = match.date || '';
      matchTime.value = match.time || '';
      matchHome.value = match.home || 'UD Centinela';
      matchAway.value = match.away || '';
      matchVenue.value = match.venue || '';
      matchStatusSelect.value = match.status || 'upcoming';
      matchHomeScore.value = match.homeScore ?? '';
      matchAwayScore.value = match.awayScore ?? '';

      (match.events || []).forEach(evt => {
        if (evt.type === 'goal') addGoalRow(evt);
      });
    } else {
      matchModalTitle.textContent = 'Nuevo Partido';
      matchId.value = 'match-' + Date.now();
      matchRound.value = `Jornada ${(calendarData.matches || []).length + 1}`;
      matchDate.value = '';
      matchTime.value = '18:00';
      matchHome.value = 'UD Centinela';
      matchAway.value = '';
      matchVenue.value = 'Estadio Municipal El Peñón';
      matchStatusSelect.value = 'upcoming';
      matchHomeScore.value = '';
      matchAwayScore.value = '';
    }
    matchModal.classList.remove('hidden');
  }

  function addGoalRow(data = {}) {
    const row = document.createElement('div');
    row.className = 'goal-item p-3 rounded-xl bg-black/40 border border-white/10 grid grid-cols-[70px_1fr_1fr_auto] gap-2 items-center';

    const playerOptions = playersData.players.map(p => 
      `<option value="${p.id}" ${data.scorerId === p.id ? 'selected' : ''}>${p.dorsal ? '#' + p.dorsal + ' ' : ''}${p.name}</option>`
    ).join('');

    const assistOptions = `<option value="none">[Sin Asistencia]</option>` + playersData.players.map(p => 
      `<option value="${p.id}" ${data.assistId === p.id ? 'selected' : ''}>${p.dorsal ? '#' + p.dorsal + ' ' : ''}${p.name}</option>`
    ).join('');

    row.innerHTML = `
      <input type="text" placeholder="Min" value="${data.minute || ''}" class="goal-min bg-brand-dark/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-center text-white focus:border-brand-neon outline-none">
      <select class="goal-scorer bg-brand-dark/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:border-brand-neon outline-none">
        ${playerOptions}
      </select>
      <select class="goal-assist bg-brand-dark/80 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-gray-300 focus:border-brand-neon outline-none">
        ${assistOptions}
      </select>
      <button type="button" class="remove-goal p-1.5 text-red-400 hover:text-red-300 text-sm" title="Quitar gol">&times;</button>
    `;

    row.querySelector('.remove-goal').addEventListener('click', () => row.remove());
    goalsContainer.appendChild(row);
  }

  matchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idVal = matchId.value;
    const goals = [];

    goalsContainer.querySelectorAll('.goal-item').forEach(item => {
      const minute = item.querySelector('.goal-min').value.trim();
      const scorerId = item.querySelector('.goal-scorer').value;
      const assistId = item.querySelector('.goal-assist').value;
      goals.push({
        type: 'goal',
        minute: minute ? parseInt(minute.replace(/\D/g, '')) || minute : null,
        scorerId: scorerId,
        assistId: assistId === 'none' ? null : assistId
      });
    });

    const matchObj = {
      id: idVal,
      round: matchRound.value.trim(),
      date: matchDate.value.trim(),
      time: matchTime.value.trim(),
      home: matchHome.value.trim(),
      away: matchAway.value.trim(),
      venue: matchVenue.value.trim(),
      status: matchStatusSelect.value,
      homeScore: matchHomeScore.value !== '' ? parseInt(matchHomeScore.value) : null,
      awayScore: matchAwayScore.value !== '' ? parseInt(matchAwayScore.value) : null,
      events: goals
    };

    if (!calendarData.matches) calendarData.matches = [];
    const existingIndex = calendarData.matches.findIndex(m => m.id === idVal);
    if (existingIndex >= 0) {
      calendarData.matches[existingIndex] = matchObj;
    } else {
      calendarData.matches.push(matchObj);
    }

    // Auto update next match
    const upcoming = calendarData.matches.find(m => m.status === 'upcoming');
    calendarData.nextMatch = upcoming || calendarData.matches[0] || null;

    recalculateStats();
    renderAll();
    markUnsavedChanges(true);
    matchModal.classList.add('hidden');
  });

  function deleteMatch(idVal) {
    if (!confirm('¿Seguro que deseas eliminar este partido y sus actas?')) return;
    calendarData.matches = calendarData.matches.filter(m => m.id !== idVal);
    const upcoming = calendarData.matches.find(m => m.status === 'upcoming');
    calendarData.nextMatch = upcoming || calendarData.matches[0] || null;
    recalculateStats();
    renderAll();
    markUnsavedChanges(true);
  }

  // =========================================================================
  // PLAYER MODAL & MANAGEMENT
  // =========================================================================
  function openPlayerModal(index) {
    playerEditIndex.value = index;
    if (index >= 0) {
      const p = playersData.players[index];
      playerModalTitle.textContent = 'Editar Jugador';
      playerIdInput.value = p.id;
      playerIdInput.readOnly = true; // Protect ID
      playerNameInput.value = p.name;
      playerDorsalInput.value = p.dorsal || '';
      playerPositionInput.value = p.position;
    } else {
      playerModalTitle.textContent = 'Nuevo Jugador';
      playerIdInput.value = '';
      playerIdInput.readOnly = false;
      playerNameInput.value = '';
      playerDorsalInput.value = '';
      playerPositionInput.value = 'Delantero';
    }
    playerModal.classList.remove('hidden');
  }

  playerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const idx = parseInt(playerEditIndex.value);
    const idVal = playerIdInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const nameVal = playerNameInput.value.trim();
    const dorsalVal = playerDorsalInput.value ? parseInt(playerDorsalInput.value) : null;
    const posVal = playerPositionInput.value.trim();

    let updatedPlayer = null;
    if (idx >= 0) {
      playersData.players[idx].name = nameVal;
      playersData.players[idx].dorsal = dorsalVal;
      playersData.players[idx].position = posVal;
      updatedPlayer = playersData.players[idx];
    } else {
      if (playersData.players.some(p => p.id === idVal)) {
        alert('Ya existe un jugador con este ID único. Elige otro ID.');
        return;
      }
      updatedPlayer = {
        id: idVal,
        name: nameVal,
        fullName: nameVal,
        dorsal: dorsalVal,
        position: posVal,
        role: 'Plantilla',
        status: 'Confirmado',
        image: `/assets/img/${idVal}.webp`,
        slug: idVal,
        url: `/regional/${idVal}/`,
        goals: 0,
        assists: 0,
        matchesPlayed: 0
      };
      playersData.players.push(updatedPlayer);
    }

    syncPlayerToNews(updatedPlayer);
    recalculateStats();
    renderAll();
    markUnsavedChanges(true);
    playerModal.classList.add('hidden');
  });

  function syncPlayerToNews(player) {
    if (!player || !newsData.items || !Array.isArray(newsData.items)) return;
    const targetSlug = `nuevo-fichaje-${player.id}`;
    const signingNews = newsData.items.find(n => 
      n.slug === targetSlug || 
      n.slug.includes(player.id) ||
      (n.title && n.title.toLowerCase().includes(player.name.toLowerCase()) && n.category === 'Fichajes')
    );

    if (signingNews && player.image) {
      signingNews.image = player.image;
      signingNews.imageAlt = `${player.name} - UD Centinela`;
    }
  }

  function deletePlayer(index) {
    const p = playersData.players[index];
    if (!confirm(`¿Eliminar al jugador ${p.name} (${p.id})?`)) return;
    playersData.players.splice(index, 1);
    recalculateStats();
    renderAll();
    markUnsavedChanges(true);
  }

  // =========================================================================
  // NEWS MODAL & MANAGEMENT
  // =========================================================================
  function openNewsModal(index) {
    if (!newsModal) return;
    newsEditIndex.value = index;
    if (index >= 0 && newsData.items && newsData.items[index]) {
      const item = newsData.items[index];
      newsModalTitle.textContent = 'Editar Noticia';
      newsTitleInput.value = item.title || '';
      newsSlugInput.value = item.slug || '';
      newsSlugInput.readOnly = true;
      newsCategoryInput.value = item.category || 'Fichajes';
      newsDateInput.value = item.date || '';
      newsReadingInput.value = item.reading || '2 min';
      newsImageInput.value = item.image || '/assets/img/centinela1.webp';
      newsExcerptInput.value = item.excerpt || '';
      newsBodyInput.value = Array.isArray(item.body) ? item.body.join('\n\n') : (item.body || '');
    } else {
      newsModalTitle.textContent = 'Nueva Noticia';
      newsTitleInput.value = '';
      newsSlugInput.value = '';
      newsSlugInput.readOnly = false;
      newsCategoryInput.value = 'Fichajes';
      const today = new Date();
      const dd = String(today.getDate()).padStart(2, '0');
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const yyyy = today.getFullYear();
      newsDateInput.value = `${dd}/${mm}/${yyyy}`;
      newsReadingInput.value = '2 min';
      newsImageInput.value = '/assets/img/centinela1.webp';
      newsExcerptInput.value = '';
      newsBodyInput.value = '';
    }
    newsModal.classList.remove('hidden');
  }

  if (newsForm) {
    newsForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const idx = parseInt(newsEditIndex.value);
      const titleVal = newsTitleInput.value.trim();
      const slugVal = newsSlugInput.value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      const catVal = newsCategoryInput.value;
      const dateVal = newsDateInput.value.trim();
      const readingVal = newsReadingInput.value.trim();
      const imageVal = newsImageInput.value.trim();
      const excerptVal = newsExcerptInput.value.trim();
      const bodyVal = newsBodyInput.value.trim();
      
      const bodyParagraphs = bodyVal.split('\n').map(p => p.trim()).filter(Boolean);

      const newsObj = {
        slug: slugVal,
        title: titleVal,
        category: catVal,
        date: dateVal,
        reading: readingVal,
        excerpt: excerptVal,
        image: imageVal,
        imageAlt: `${titleVal} - UD Centinela`,
        body: bodyParagraphs
      };

      if (!newsData.items) newsData.items = [];

      if (idx >= 0) {
        newsData.items[idx] = newsObj;
      } else {
        if (newsData.items.some(n => n.slug === slugVal)) {
          alert('Ya existe una noticia con este Slug URL. Elige otro slug.');
          return;
        }
        newsData.items.unshift(newsObj); // Add to top
      }

      renderAll();
      markUnsavedChanges(true);
      newsModal.classList.add('hidden');
    });
  }

  function deleteNews(index) {
    const item = newsData.items[index];
    if (!confirm(`¿Eliminar la noticia "${item.title}"?`)) return;
    newsData.items.splice(index, 1);
    renderAll();
    markUnsavedChanges(true);
  }

  // =========================================================================
  // GITHUB DIRECT DEPLOYER (REST API) & LOCAL BACKEND
  // =========================================================================
  deployBtn.addEventListener('click', async () => {
    deployStatus.className = 'p-4 rounded-2xl text-xs font-bold tracking-wide bg-brand-neon/10 border border-brand-neon/30 text-brand-neon';
    deployStatus.textContent = '⏳ Guardando y publicando datos...';
    deployStatus.classList.remove('hidden');
    deployBtn.disabled = true;

    try {
      recalculateStats();

      // If running on local Node server
      if (isLocalHost && (currentToken === 'admin' || currentToken === 'local' || !currentToken.startsWith('ghp_'))) {
        const [calRes, playRes, newsRes] = await Promise.all([
          fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calendarData)
          }),
          fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playersData)
          }),
          fetch('/api/news', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newsData)
          })
        ]);

        if (!calRes.ok || !playRes.ok || !newsRes.ok) throw new Error('Error al guardar datos en el servidor local.');

        markUnsavedChanges(false);
        deployStatus.className = 'p-4 rounded-2xl text-xs font-bold tracking-wide bg-green-500/20 border border-green-500/40 text-green-300';
        deployStatus.innerHTML = '✨ <strong>¡Datos guardados localmente con éxito!</strong> Sincronizando con git en segundo plano...';
        return;
      }

      // If deploying to GitHub Pages via REST API
      const calendarJsonStr = JSON.stringify(calendarData, null, 2);
      const playersJsonStr = JSON.stringify(playersData, null, 2);
      const newsJsonStr = JSON.stringify(newsData, null, 2);

      // 1. Get latest commit SHA
      const refRes = await fetch(`${API_BASE}/git/refs/heads/main`, {
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!refRes.ok) throw new Error('No se pudo leer la referencia de main en GitHub. Comprueba el token.');
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      // 2. Create Blobs for calendar.json, players.json, and news.json
      const [blobCalRes, blobPlayRes, blobNewsRes] = await Promise.all([
        fetch(`${API_BASE}/git/blobs`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: calendarJsonStr, encoding: 'utf-8' })
        }),
        fetch(`${API_BASE}/git/blobs`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: playersJsonStr, encoding: 'utf-8' })
        }),
        fetch(`${API_BASE}/git/blobs`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newsJsonStr, encoding: 'utf-8' })
        })
      ]);

      const blobCal = await blobCalRes.json();
      const blobPlay = await blobPlayRes.json();
      const blobNews = await blobNewsRes.json();

      // 3. Create Tree
      const treeRes = await fetch(`${API_BASE}/git/trees`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: latestCommitSha,
          tree: [
            { path: 'assets/data/calendar.json', mode: '100644', type: 'blob', sha: blobCal.sha },
            { path: 'assets/data/players.json', mode: '100644', type: 'blob', sha: blobPlay.sha },
            { path: 'assets/data/news.json', mode: '100644', type: 'blob', sha: blobNews.sha }
          ]
        })
      });
      const treeData = await treeRes.json();

      // 4. Create Commit
      const commitRes = await fetch(`${API_BASE}/git/commits`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat(data): actualizar resultados, actas, plantilla y noticias oficiales',
          tree: treeData.sha,
          parents: [latestCommitSha]
        })
      });
      const commitData = await commitRes.json();

      // 5. Update main ref
      const updateRefRes = await fetch(`${API_BASE}/git/refs/heads/main`, {
        method: 'PATCH',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({ sha: commitData.sha, force: false })
      });

      if (!updateRefRes.ok) throw new Error('Error al actualizar la rama main en GitHub.');

      markUnsavedChanges(false);
      deployStatus.className = 'p-4 rounded-2xl text-xs font-bold tracking-wide bg-green-500/20 border border-green-500/40 text-green-300';
      deployStatus.innerHTML = `✨ <strong>¡Datos publicados con éxito en GitHub Pages!</strong> Commit: <code>${commitData.sha.substring(0, 7)}</code>. Los cambios estarán en vivo en 1-2 minutos.`;
    } catch (err) {
      console.error(err);
      deployStatus.className = 'p-4 rounded-2xl text-xs font-bold tracking-wide bg-red-500/20 border border-red-500/40 text-red-300';
      deployStatus.textContent = '❌ Error al guardar en GitHub: ' + err.message;
    } finally {
      deployBtn.disabled = false;
    }
  });

  // Start
  init();
})();
