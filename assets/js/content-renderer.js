/**
 * content-renderer.js - Sincronizador en vivo de textos de páginas y secciones
 * UD Centinela (udcentinela.github.io)
 */
(function () {
  async function syncPageContents() {
    try {
      const res = await fetch('/assets/data/pages_content.json?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;

      const path = window.location.pathname.replace(/\/$/, '') || '/';

      // 1. Sincronización en Inicio (Portada)
      if (path === '/' || path === '' || path === '/index.html') {
        const home = data.home || {};
        const heroTagline = document.querySelector('.hero-text');
        if (heroTagline && home.heroTagline) heroTagline.textContent = home.heroTagline;

        const heroTitle = document.querySelector('.hero-title');
        if (heroTitle && (home.heroTitleLine1 || home.heroTitleLine2 || home.heroTitleLine3)) {
          const l1 = home.heroTitleLine1 || 'UNIÓN';
          const l2 = home.heroTitleLine2 || 'DEPORTIVO';
          const l3 = home.heroTitleLine3 || 'CENTINELA';
          heroTitle.innerHTML = `<span class="hero-title-line">${l1}</span><br/><span class="hero-title-line text-gradient">${l2}</span><br/><span class="hero-title-line">${l3}</span>`;
        }

        const heroDesc = document.querySelector('.hero-desc');
        if (heroDesc && home.heroDescription) heroDesc.textContent = home.heroDescription;

        const heroCta = document.querySelector('.hero-btn a');
        if (heroCta && home.heroCtaText) {
          heroCta.innerHTML = `${home.heroCtaText} <svg class="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>`;
          if (home.heroCtaLink) heroCta.href = home.heroCtaLink;
        }

        const ribbonTagline = document.querySelector('.sponsors-ribbon-text .tagline');
        if (ribbonTagline && home.sponsorsTagline) ribbonTagline.textContent = home.sponsorsTagline;

        const ribbonTitle = document.querySelector('.sponsors-ribbon-text .title');
        if (ribbonTitle && home.sponsorsTitle) ribbonTitle.textContent = home.sponsorsTitle;

        // Sincronizar Próximo Partido dinámico en Portada
        const matchStatusBadge = document.getElementById('matchStatusBadge');
        if (matchStatusBadge) {
          try {
            const calRes = await fetch('/assets/data/calendar.json?t=' + Date.now());
            if (calRes.ok) {
              const calData = await calRes.json();
              const nextMatch = calData.nextMatch;
              if (nextMatch) {
                const roundText = nextMatch.round || 'Próximo Partido';
                if (nextMatch.status === 'live') {
                  matchStatusBadge.className = 'bg-red-500 text-white font-black px-3 py-1 rounded-lg text-xs uppercase tracking-wider animate-pulse';
                  matchStatusBadge.textContent = `En Directo · ${roundText}`;
                } else if (nextMatch.status === 'finished') {
                  matchStatusBadge.className = 'bg-emerald-400 text-brand-dark font-black px-3 py-1 rounded-lg text-xs uppercase tracking-wider';
                  matchStatusBadge.textContent = `Finalizado · ${roundText}`;
                } else {
                  matchStatusBadge.className = 'bg-brand-neon text-brand-dark font-black px-3 py-1 rounded-lg text-xs uppercase tracking-wider';
                  matchStatusBadge.textContent = `Próximo Partido · ${roundText}`;
                }

                const dtEl = document.getElementById('matchDateTime');
                if (dtEl && nextMatch.date) {
                  const timeStr = nextMatch.time ? ` · ${nextMatch.time} h` : '';
                  dtEl.innerHTML = `<svg class="w-4 h-4 text-brand-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> ${nextMatch.date}${timeStr}`;
                }

                const homeName = document.getElementById('matchHomeName');
                const homeLogo = document.getElementById('matchHomeLogo');
                const awayName = document.getElementById('matchAwayName');
                const awayLogo = document.getElementById('matchAwayLogo');
                const scoreBox = document.getElementById('matchScoreBox');
                const venueEl = document.getElementById('matchVenue');

                if (homeName && nextMatch.home) homeName.textContent = nextMatch.home;
                if (homeLogo && nextMatch.homeLogo) homeLogo.src = nextMatch.homeLogo;
                if (awayName && nextMatch.away) awayName.textContent = nextMatch.away;
                if (awayLogo && nextMatch.awayLogo) awayLogo.src = nextMatch.awayLogo;

                if (scoreBox && (nextMatch.status === 'live' || nextMatch.status === 'finished')) {
                  scoreBox.innerHTML = `
                    <div class="flex items-center gap-2">
                      <span class="font-heading text-3xl sm:text-4xl font-black text-white">${nextMatch.homeScore ?? 0}</span>
                      <span class="font-heading text-2xl font-bold text-gray-500">-</span>
                      <span class="font-heading text-3xl sm:text-4xl font-black text-white">${nextMatch.awayScore ?? 0}</span>
                    </div>
                    <span class="text-[11px] text-brand-neon uppercase font-semibold tracking-widest mt-1">${nextMatch.status === 'live' ? 'En Juego' : 'Finalizado'}</span>
                  `;
                }

                if (venueEl && nextMatch.venue) {
                  venueEl.textContent = nextMatch.venue;
                }
              }
            }
          } catch (calErr) {
            console.warn('No se pudo sincronizar el próximo partido en portada:', calErr);
          }
        }
      }

      // 2. Sincronización en Secciones del Club (Historia, Identidad, Legado)
      const club = data.club || {};

      if (path.includes('/historia')) {
        const hTitle = document.querySelector('h1.font-heading') || document.querySelector('h1');
        if (hTitle && club.historiaHeroTitle) hTitle.textContent = club.historiaHeroTitle;
      }

      if (path.includes('/identidad')) {
        const iTitle = document.querySelector('h1.font-heading') || document.querySelector('h1');
        if (iTitle && club.identidadHeroTitle) iTitle.textContent = club.identidadHeroTitle;
      }

      if (path.includes('/legado')) {
        const lTitle = document.querySelector('h1.font-heading') || document.querySelector('h1');
        if (lTitle && club.legadoHeroTitle) lTitle.textContent = club.legadoHeroTitle;
      }

    } catch (err) {
      console.warn('No se pudieron sincronizar los textos de la página en vivo:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncPageContents);
  } else {
    syncPageContents();
  }
})();
