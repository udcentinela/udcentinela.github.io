(function () {
  async function syncNewsWithLiveContent() {
    try {
      const [newsRes, playRes] = await Promise.all([
        fetch('/assets/data/news.json?t=' + Date.now()),
        fetch('/assets/data/players.json?t=' + Date.now())
      ]);

      if (!newsRes.ok) return;
      const newsData = await newsRes.json();
      const newsItems = newsData.items || [];

      let players = [];
      if (playRes.ok) {
        const playersData = await playRes.json();
        players = playersData.players || [];
      }

      // 1. Sync on News Grid (/noticias/)
      const newsCards = document.querySelectorAll('a.news-card');
      newsCards.forEach(card => {
        const href = card.getAttribute('href') || '';
        const slug = href.replace(/^\/noticias\//, '').replace(/\/$/, '');
        const newsItem = newsItems.find(n => n.slug === slug);
        
        if (newsItem) {
          const titleEl = card.querySelector('h3.news-title');
          const excerptEl = card.querySelector('p.text-gray-300');
          if (titleEl && newsItem.title) titleEl.textContent = newsItem.title;
          if (excerptEl && newsItem.excerpt) excerptEl.textContent = newsItem.excerpt;
        }
      });

      // 2. Sync on Individual Article Page (/noticias/<slug>/)
      const pathSegments = window.location.pathname.split('/').filter(Boolean);
      const isArticlePage = pathSegments.length >= 2 && pathSegments[0] === 'noticias';
      const pathSlug = isArticlePage ? pathSegments[1] : null;

      if (pathSlug && pathSlug !== 'admin' && pathSlug !== 'login') {
        const newsItem = newsItems.find(n => n.slug === pathSlug);
        if (newsItem) {
          const articleTitle = document.getElementById('articleTitle');
          const articleExcerpt = document.getElementById('articleExcerpt');
          const articleCategory = document.getElementById('articleCategory');
          const articleDate = document.getElementById('articleDate');
          const articleReading = document.getElementById('articleReading');
          const articleBody = document.getElementById('articleBody');

          if (articleTitle && newsItem.title) articleTitle.textContent = newsItem.title;
          if (articleExcerpt && newsItem.excerpt) articleExcerpt.textContent = newsItem.excerpt;
          if (articleCategory && newsItem.category) articleCategory.textContent = newsItem.category;
          if (articleDate && newsItem.date) articleDate.textContent = newsItem.date;
          if (articleReading && newsItem.reading) articleReading.textContent = newsItem.reading;

          if (articleBody && Array.isArray(newsItem.body) && newsItem.body.length > 0) {
            articleBody.innerHTML = newsItem.body.map(paragraph => `<p>${paragraph}</p>`).join('');
          }
        }

        // Check if this article matches a player (e.g. nuevo-fichaje-sebastian -> sebastian)
        const player = players.find(p => pathSlug === `nuevo-fichaje-${p.id}` || pathSlug.includes(p.id));
        if (player) {
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
        }
      }
    } catch (e) {
      console.warn('Error sincronizando contenidos dinámicos de noticias:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncNewsWithLiveContent, { once: true });
  } else {
    syncNewsWithLiveContent();
  }
})();
