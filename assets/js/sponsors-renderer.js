/**
 * sponsors-renderer.js - Sincronizador en vivo del orden de patrocinadores
 * UD Centinela (udcentinela.github.io)
 */
(function () {
  async function syncSponsorsWithLiveOrder() {
    try {
      const res = await fetch('/assets/data/sponsors.json?t=' + Date.now());
      if (!res.ok) return;
      const data = await res.json();
      const sponsors = (data.sponsors || []).filter(s => s.visible !== false);
      if (sponsors.length === 0) return;

      // 1. Sincronizar Cinta de Portada (.sponsors-ribbon-logos)
      const ribbonContainer = document.querySelector('.sponsors-ribbon-logos');
      if (ribbonContainer) {
        ribbonContainer.innerHTML = '';
        sponsors.forEach(s => {
          const a = document.createElement('a');
          a.href = s.url || '/patrocinios/';
          if (s.url && s.url.startsWith('http')) {
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
          }
          a.title = `${s.name} - ${s.tierLabel || 'Patrocinador Oficial'}`;
          a.className = `sponsor-badge-item ${s.badgeClass || ''}`;
          a.style.cssText = 'display:inline-flex; align-items:center; justify-content:center; padding:0.65rem 1.4rem; height:68px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.12); border-radius:1rem; text-decoration:none;';

          const img = document.createElement('img');
          img.src = s.logo;
          img.alt = s.name;
          img.loading = 'lazy';
          img.style.cssText = 'height:42px; max-height:42px; max-width:165px; width:auto; object-fit:contain;';

          a.appendChild(img);
          ribbonContainer.appendChild(a);
        });
      }

      // 2. Sincronizar Muro de Patrocinios (.sponsor-collab-grid)
      const collabGrid = document.querySelector('.sponsor-collab-grid');
      if (collabGrid) {
        // Filtrar los que no son el patrocinador principal del hero (o todos si se desea)
        const collabSponsors = sponsors.filter(s => s.tier !== 'principal');
        if (collabSponsors.length > 0) {
          collabGrid.innerHTML = '';
          const TIER_COLORS = {
            oficial: 'text-emerald-400',
            colaborador: 'text-yellow-400',
            institucional: 'text-brand-neon',
            sede: 'text-brand-neon'
          };

          collabSponsors.forEach(s => {
            const isExternal = s.url && s.url.startsWith('http');
            const card = isExternal ? document.createElement('a') : document.createElement('div');
            if (isExternal) {
              card.href = s.url;
              card.target = '_blank';
              card.rel = 'noopener noreferrer';
              card.style.textDecoration = 'none';
            }
            card.className = 'sponsor-collab-card group';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';

            const colorClass = TIER_COLORS[s.tier] || 'text-emerald-400';
            const tierTitle = s.tierLabel || 'Patrocinador Oficial';

            card.innerHTML = `
              <div class="sponsor-collab-logo-box">
                <img src="${s.logo}" alt="${s.name}" loading="lazy" style="height: auto; max-height: 48px; width: auto; max-width: 88%; object-fit: contain;">
              </div>
              <div>
                <span class="text-[10px] ${colorClass} font-bold uppercase tracking-wider">${tierTitle}</span>
                <p class="text-[11px] text-gray-400 mt-0.5">${s.categoryDesc || s.name}</p>
              </div>
            `;
            collabGrid.appendChild(card);
          });
        }
      }
    } catch (err) {
      console.warn('No se pudo sincronizar el orden de patrocinadores en vivo:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncSponsorsWithLiveOrder);
  } else {
    syncSponsorsWithLiveOrder();
  }
})();
