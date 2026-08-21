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
