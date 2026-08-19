(function () {
  const REPO = 'udcentinela/udcentinela.github.io';
  const API_BASE = `https://api.github.com/repos/${REPO}`;
  
  let currentToken = sessionStorage.getItem('udc_admin_token') || '';
  let calendarData = { season: 'Temporada 2026/2027', updated: '', nextMatch: null, matches: [], standings: [] };
  let playersData = { season: 'Temporada 2026/2027', lastUpdated: '', players: [] };
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
  const topScorersList = document.getElementById('topScorersList');
  const topAssistsList = document.getElementById('topAssistsList');
  const deployBtn = document.getElementById('deployBtn');
  const deployStatus = document.getElementById('deployStatus');
  const unsavedBanner = document.getElementById('unsavedBanner');

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
      const [calRes, playRes] = await Promise.all([
        fetch('/assets/data/calendar.json?t=' + Date.now()),
        fetch('/assets/data/players.json?t=' + Date.now())
      ]);

      if (calRes.ok) calendarData = await calRes.json();
      if (playRes.ok) playersData = await playRes.json();
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
      card.className = 'match-card p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4';
      card.innerHTML = `
        <div class="flex-grow">
          <div class="flex items-center gap-3 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${isFinished ? 'bg-green-500/20 text-green-300 border border-green-500/30' : 'bg-brand-neon/20 text-brand-neon border border-brand-neon/30'}">
              ${isFinished ? 'Finalizado' : (m.status === 'postponed' ? 'Aplazado' : 'Próximo')}
            </span>
            <span class="text-xs font-bold text-brand-neon uppercase tracking-wider">${m.round || 'Jornada'}</span>
            <span class="text-xs text-gray-400">📅 ${m.date || ''} ${m.time ? '· ' + m.time : ''}</span>
          </div>

          <div class="flex items-center gap-4 text-base md:text-lg font-heading font-black">
            <span class="${m.home.includes('Centinela') ? 'text-brand-neon' : 'text-white'}">${m.home}</span>
            <span class="px-3 py-1 bg-black/40 rounded-xl border border-white/10 text-white font-mono">
              ${isFinished ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : 'VS'}
            </span>
            <span class="${m.away.includes('Centinela') ? 'text-brand-neon' : 'text-white'}">${m.away}</span>
          </div>

          <p class="text-xs text-gray-400 mt-1">📍 ${m.venue || 'Estadio por confirmar'}</p>
          ${eventsHtml}
        </div>

        <div class="flex items-center gap-2 self-end md:self-center">
          <button data-edit-match="${m.id}" class="px-4 py-2 bg-white/10 hover:bg-brand-neon hover:text-brand-dark rounded-xl text-xs font-bold uppercase tracking-wider transition-colors">
            ✏️ Editar / Acta
          </button>
          <button data-delete-match="${m.id}" class="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-colors" title="Eliminar Partido">
            🗑️
          </button>
        </div>
      `;
      matchesList.appendChild(card);
    });

    // Attach match edit/delete listeners
    matchesList.querySelectorAll('[data-edit-match]').forEach(btn => {
      btn.addEventListener('click', () => openMatchModal(btn.dataset.editMatch));
    });

    matchesList.querySelectorAll('[data-delete-match]').forEach(btn => {
      btn.addEventListener('click', () => deleteMatch(btn.dataset.deleteMatch));
    });
  }

  // =========================================================================
  // RENDER PLAYERS
  // =========================================================================
  function renderPlayers() {
    playersTableBody.innerHTML = '';
    const players = playersData.players || [];

    players.forEach((p, idx) => {
      const tr = document.createElement('tr');
      tr.className = 'hover:bg-white/5 transition-colors';
      tr.innerHTML = `
        <td class="p-4 font-mono font-bold text-brand-neon">${p.dorsal ? '#' + p.dorsal : '-'}</td>
        <td class="p-4"><code class="px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-cyan-300">${p.id}</code></td>
        <td class="p-4 font-bold text-white">${p.name}</td>
        <td class="p-4 text-gray-400 text-xs">${p.position}</td>
        <td class="p-4 text-center font-heading font-black text-white text-base">${p.goals || 0}</td>
        <td class="p-4 text-center font-heading font-black text-brand-neon text-base">${p.assists || 0}</td>
        <td class="p-4 text-right">
          <button data-edit-player="${idx}" class="text-xs text-gray-300 hover:text-brand-neon font-bold uppercase tracking-wider px-2 py-1">Editar</button>
          <button data-delete-player="${idx}" class="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider px-2 py-1">Eliminar</button>
        </td>
      `;
      playersTableBody.appendChild(tr);
    });

    playersTableBody.querySelectorAll('[data-edit-player]').forEach(btn => {
      btn.addEventListener('click', () => openPlayerModal(Number(btn.dataset.editPlayer)));
    });

    playersTableBody.querySelectorAll('[data-delete-player]').forEach(btn => {
      btn.addEventListener('click', () => deletePlayer(Number(btn.dataset.deletePlayer)));
    });
  }

  // =========================================================================
  // RENDER STATS RANKING
  // =========================================================================
  function renderStats() {
    const scorers = [...playersData.players].filter(p => (p.goals || 0) > 0).sort((a, b) => b.goals - a.goals);
    const assisters = [...playersData.players].filter(p => (p.assists || 0) > 0).sort((a, b) => b.assists - a.assists);

    topScorersList.innerHTML = scorers.length === 0
      ? '<li class="text-xs text-gray-500 py-3">Aún no hay goles registrados en los partidos.</li>'
      : scorers.map((p, i) => `
        <li class="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
          <div class="flex items-center gap-3">
            <span class="font-heading font-black text-sm ${i === 0 ? 'text-yellow-400' : 'text-gray-400'}">#${i + 1}</span>
            <span class="font-bold text-white">${p.name} <span class="text-xs text-gray-500">(${p.position})</span></span>
          </div>
          <span class="font-heading font-black text-lg text-brand-neon">${p.goals} ⚽</span>
        </li>
      `).join('');

    topAssistsList.innerHTML = assisters.length === 0
      ? '<li class="text-xs text-gray-500 py-3">Aún no hay asistencias registradas en los partidos.</li>'
      : assisters.map((p, i) => `
        <li class="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
          <div class="flex items-center gap-3">
            <span class="font-heading font-black text-sm ${i === 0 ? 'text-yellow-400' : 'text-gray-400'}">#${i + 1}</span>
            <span class="font-bold text-white">${p.name} <span class="text-xs text-gray-500">(${p.position})</span></span>
          </div>
          <span class="font-heading font-black text-lg text-cyan-300">${p.assists} 👟</span>
        </li>
      `).join('');
  }

  // =========================================================================
  // MATCH MODAL & EVENTS LOGIC
  // =========================================================================
  function setupModals() {
    document.querySelectorAll('.close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        matchModal.classList.add('hidden');
        playerModal.classList.add('hidden');
      });
    });

    newMatchBtn.addEventListener('click', () => openMatchModal(null));
    newPlayerBtn.addEventListener('click', () => openPlayerModal(-1));

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

    if (idx >= 0) {
      playersData.players[idx].name = nameVal;
      playersData.players[idx].dorsal = dorsalVal;
      playersData.players[idx].position = posVal;
    } else {
      if (playersData.players.some(p => p.id === idVal)) {
        alert('Ya existe un jugador con este ID único. Elige otro ID.');
        return;
      }
      playersData.players.push({
        id: idVal,
        name: nameVal,
        fullName: nameVal,
        dorsal: dorsalVal,
        position: posVal,
        role: 'Plantilla',
        status: 'Confirmado',
        image: '/assets/img/centinela1.webp',
        slug: idVal,
        url: `/regional/${idVal}/`,
        goals: 0,
        assists: 0,
        matchesPlayed: 0
      });
    }

    recalculateStats();
    renderAll();
    markUnsavedChanges(true);
    playerModal.classList.add('hidden');
  });

  function deletePlayer(index) {
    const p = playersData.players[index];
    if (!confirm(`¿Eliminar al jugador ${p.name} (${p.id})?`)) return;
    playersData.players.splice(index, 1);
    recalculateStats();
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
        const [calRes, playRes] = await Promise.all([
          fetch('/api/calendar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(calendarData)
          }),
          fetch('/api/players', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(playersData)
          })
        ]);

        if (!calRes.ok || !playRes.ok) throw new Error('Error al guardar datos en el servidor local.');

        markUnsavedChanges(false);
        deployStatus.className = 'p-4 rounded-2xl text-xs font-bold tracking-wide bg-green-500/20 border border-green-500/40 text-green-300';
        deployStatus.innerHTML = '✨ <strong>¡Datos guardados localmente con éxito!</strong> Sincronizando con git en segundo plano...';
        return;
      }

      // If deploying to GitHub Pages via REST API
      const calendarJsonStr = JSON.stringify(calendarData, null, 2);
      const playersJsonStr = JSON.stringify(playersData, null, 2);

      // 1. Get latest commit SHA
      const refRes = await fetch(`${API_BASE}/git/refs/heads/main`, {
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Accept': 'application/vnd.github.v3+json' }
      });
      if (!refRes.ok) throw new Error('No se pudo leer la referencia de main en GitHub. Comprueba el token.');
      const refData = await refRes.json();
      const latestCommitSha = refData.object.sha;

      // 2. Create Blobs for calendar.json and players.json
      const [blobCalRes, blobPlayRes] = await Promise.all([
        fetch(`${API_BASE}/git/blobs`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: calendarJsonStr, encoding: 'utf-8' })
        }),
        fetch(`${API_BASE}/git/blobs`, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: playersJsonStr, encoding: 'utf-8' })
        })
      ]);

      const blobCal = await blobCalRes.json();
      const blobPlay = await blobPlayRes.json();

      // 3. Create Tree
      const treeRes = await fetch(`${API_BASE}/git/trees`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_tree: latestCommitSha,
          tree: [
            { path: 'assets/data/calendar.json', mode: '100644', type: 'blob', sha: blobCal.sha },
            { path: 'assets/data/players.json', mode: '100644', type: 'blob', sha: blobPlay.sha }
          ]
        })
      });
      const treeData = await treeRes.json();

      // 4. Create Commit
      const commitRes = await fetch(`${API_BASE}/git/commits`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + currentToken, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'feat(data): actualizar resultados, actas de partidos y plantilla oficial',
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
