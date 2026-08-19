(function () {
  async function syncNewsWithPlayers() {
    try {
      const [newsRes, playRes] = await Promise.all([
        fetch('/assets/data/news.json?t=' + Date.now()),
        fetch('/assets/data/players.json?t=' + Date.now())
      ]);

      if (!newsRes.ok || !playRes.ok) return;
      const newsData = await newsRes.json();
      const playersData = await playRes.json();
      const players = playersData.players || [];
      const newsItems = newsData.items || [];

      // 1. Sync on News List Page (/noticias/)
      const newsCards = document.querySelectorAll('a.news-card');
      newsCards.forEach(card => {
        const href = card.getAttribute('href') || '';
        const slug = href.replace(/^\/noticias\//, '').replace(/\/$/, '');
        
        // Find matching player
        const player = players.find(p => slug === `nuevo-fichaje-${p.id}` || slug.includes(p.id));
        if (player) {
          const excerptP = card.querySelector('p.text-gray-300');
          if (excerptP && player.dorsal) {
            const currentText = excerptP.textContent;
            if (!currentText.includes(`dorsal ${player.dorsal}`) && !currentText.includes(`#${player.dorsal}`)) {
              excerptP.textContent = `La Unión Deportiva Centinela incorpora a ${player.name} para la temporada en Regional, reforzando la medular como ${player.position.toLowerCase()} con el dorsal ${player.dorsal}.`;
            }
          }
        }
      });

      // 2. Sync on Individual Article Page (/noticias/<slug>/)
      const pathSlug = window.location.pathname.replace(/^\/noticias\//, '').replace(/\/$/, '');
      if (pathSlug && pathSlug !== 'noticias') {
        const player = players.find(p => pathSlug === `nuevo-fichaje-${p.id}` || pathSlug.includes(p.id));
        if (player) {
          const articleExcerpt = document.getElementById('articleExcerpt');
          if (articleExcerpt && player.dorsal) {
            articleExcerpt.textContent = `La Unión Deportiva Centinela incorpora a ${player.name} para la temporada en Regional, reforzando la medular como ${player.position.toLowerCase()} con el dorsal ${player.dorsal}.`;
          }

          // Sync profile card top-right badge
          const topBadge = document.querySelector('.profile-card .absolute.top-6.right-6 span');
          if (topBadge) {
            if (player.dorsal) {
              topBadge.textContent = `#${player.dorsal}`;
              topBadge.className = 'bg-brand-neon text-brand-dark font-black px-3.5 py-1.5 rounded-xl text-sm shadow-md';
            } else {
              topBadge.textContent = 'Dorsal por confirmar';
              topBadge.className = 'bg-brand-neon text-brand-dark font-black px-3.5 py-1.5 rounded-xl text-xs shadow-md uppercase';
            }
          }

          const articleBody = document.getElementById('articleBody');
          if (articleBody && player.dorsal) {
            const paragraphs = articleBody.querySelectorAll('p');
            paragraphs.forEach(p => {
              if (p.textContent.includes('dorsal') || p.textContent.includes('Dorsal')) {
                if (p.textContent.includes('por confirmar')) {
                  p.innerHTML = `Con el dorsal <strong>#${player.dorsal}</strong> oficial a la espalda, su incorporación consolida la medular de cara al exigente año deportivo que se avecina. Puedes consultar todos sus datos en su <a href="/regional/${player.slug || player.id}/" class="text-brand-neon font-bold hover:underline">ficha de jugador</a>.`;
                }
              }
            });
          }
        }
      }
    } catch (e) {
      console.warn('Error sincronizando noticias con plantilla:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncNewsWithPlayers, { once: true });
  } else {
    syncNewsWithPlayers();
  }
})();
